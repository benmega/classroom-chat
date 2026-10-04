import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Achievements from './Achievements';
import client from '../../api/client';
import toast from 'react-hot-toast';

vi.mock('../../api/client', () => ({
    default: { get: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() },
}));

// An achievement as /api/achievements/all sends it; each test changes what it cares about
let nextId = 1;
const achievement = (name, extra = {}) => ({
    id: nextId++,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    type: 'challenge',
    source: 'levels',
    description: `${name} description`,
    requirement_value: 10,
    current_progress: 0,
    reward: 5,
    ...extra,
});

const serve = (achievements, earned = []) =>
    client.get.mockResolvedValue({
        data: { status: 'success', data: { achievements, user_achievements: earned.map((a) => a.id) } },
    });

const renderLoaded = async () => {
    render(<Achievements />);
    await waitFor(() => expect(document.querySelector('.skeleton-card')).toBeNull());
};

const cards = () => [...document.querySelectorAll('.achievement-card')];
const cardFor = (name) => cards().find((card) => within(card).queryByRole('heading', { name }));
const cardNames = () => cards().map((card) => within(card).getByRole('heading').textContent);

describe('Achievements', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        nextId = 1;
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    describe('loading', () => {
        it('shows placeholder cards while the achievements load', () => {
            client.get.mockReturnValue(new Promise(() => {}));

            render(<Achievements />);

            expect(cards()).toHaveLength(6);
            expect(document.querySelectorAll('.skeleton-card')).toHaveLength(6);
            expect(screen.queryByText('No achievements found')).not.toBeInTheDocument();
        });

        it('asks the server for every achievement and what the user earned', async () => {
            serve([achievement('First Steps')]);

            await renderLoaded();

            expect(client.get).toHaveBeenCalledTimes(1);
            expect(client.get).toHaveBeenCalledWith('/api/achievements/all');
            expect(screen.getByRole('heading', { name: 'First Steps' })).toBeInTheDocument();
        });

        it('toasts and shows the empty page when the request fails', async () => {
            client.get.mockRejectedValue(new Error('500'));

            await renderLoaded();

            expect(toast.error).toHaveBeenCalledWith('Failed to load achievements.');
            expect(screen.getByText('No achievements found')).toBeInTheDocument();
        });

        it('says there is nothing to earn yet when the list is empty', async () => {
            serve([]);

            await renderLoaded();

            expect(screen.getByText('No achievements found')).toBeInTheDocument();
            expect(screen.getByText('Start completing tasks to earn achievements!')).toBeInTheDocument();
            expect(toast.error).not.toHaveBeenCalled();
        });
    });

    describe('earned and locked', () => {
        it('marks an earned achievement as completed, without a lock or a progress bar', async () => {
            const done = achievement('Hello World', { type: 'special', source: 'tutorial' });
            serve([done], [done]);

            await renderLoaded();

            const card = cardFor('Hello World');
            expect(card).toHaveClass('earned');
            expect(card.querySelector('.lock-overlay')).toBeNull();
            expect(within(card).getByText(/Fully Completed/)).toBeInTheDocument();
            expect(card.querySelector('.ach-progress-bar-wrapper')).toBeNull();
        });

        it('locks an achievement that is not earned and shows how far along it is', async () => {
            serve([achievement('Century', { type: 'special', source: 'ducks', requirement_value: 100, current_progress: 30, reward: 12 })]);

            await renderLoaded();

            const card = cardFor('Century');
            expect(card).toHaveClass('locked');
            expect(card.querySelector('.lock-overlay')).not.toBeNull();
            expect(within(card).getByText('30 / 100')).toBeInTheDocument();
            expect(card.querySelector('.ach-progress-bar-fill')).toHaveStyle({ width: '30%' });
            expect(within(card).getByText('+12')).toBeInTheDocument();
            expect(within(card).queryByText(/Fully Completed/)).not.toBeInTheDocument();
        });

        it('shows a bar that is full, not overflowing, for progress beyond the target', async () => {
            serve([achievement('Overachiever', { type: 'special', source: 'x', requirement_value: 10, current_progress: 25 })]);

            await renderLoaded();

            expect(document.querySelector('.ach-progress-bar-fill')).toHaveStyle({ width: '100%' });
            expect(screen.getByText('25 / 10')).toBeInTheDocument();
        });

        it('shows an empty bar for an achievement without a numeric target', async () => {
            serve([achievement('Mystery', { type: 'special', source: 'x', requirement_value: null, current_progress: null })]);

            await renderLoaded();

            expect(document.querySelector('.ach-progress-bar-fill')).toHaveStyle({ width: '0%' });
            expect(screen.getByText('0 / 1')).toBeInTheDocument();
        });

        it('gives each card the classes for its type and badge', async () => {
            serve([achievement('Speedy', { type: 'special', source: 'x', slug: 'speedy-badge' })]);

            await renderLoaded();

            const card = cardFor('Speedy');
            expect(card).toHaveClass('ach-type-special');
            expect(card.querySelector('.badge')).toHaveClass('badge-speedy-badge');
        });

        it('shows the description as a tooltip, shortened at a word boundary when it is long', async () => {
            const long = `${'word '.repeat(30)}end`;
            serve([
                achievement('Short One', { type: 'special', source: 'a', description: 'Brief.' }),
                achievement('Long One', { type: 'special', source: 'b', description: long }),
                achievement('No Text', { type: 'special', source: 'c', description: null }),
            ]);

            await renderLoaded();

            expect(cardFor('Short One')).toHaveAttribute('title', 'Brief.');
            const longTitle = cardFor('Long One').getAttribute('title');
            expect(longTitle.endsWith('…')).toBe(true);
            expect(longTitle.length).toBeLessThanOrEqual(78);
            expect(longTitle.slice(0, -1).endsWith('word')).toBe(true);
            expect(cardFor('No Text')).toHaveAttribute('title', '');
        });
    });

    describe('levels of one kind', () => {
        const levels = () => [
            achievement('Ten Levels', { requirement_value: 10, current_progress: 4, reward: 5 }),
            achievement('Fifty Levels', { requirement_value: 50, current_progress: 4, reward: 15 }),
            achievement('Hundred Levels', { requirement_value: 100, current_progress: 4, reward: 40 }),
        ];

        it('shows one card for the group, the lowest level, when nothing is earned yet', async () => {
            // Sent in a scrambled order: the group is ordered by what it asks for
            const [ten, fifty, hundred] = levels();
            serve([hundred, ten, fifty]);

            await renderLoaded();

            expect(cardNames()).toEqual(['Ten Levels']);
            const card = cardFor('Ten Levels');
            expect(card).toHaveClass('locked');
            expect(within(card).getByText('4 / 10')).toBeInTheDocument();
            expect(within(card).getByText('+5')).toBeInTheDocument();
        });

        it('shows the highest earned level, with the progress and reward of the next one', async () => {
            const [ten, fifty, hundred] = levels();
            serve([ten, fifty, hundred], [ten]);

            await renderLoaded();

            expect(cardNames()).toEqual(['Ten Levels']);
            const card = cardFor('Ten Levels');
            expect(card).toHaveClass('earned');
            expect(card.querySelector('.lock-overlay')).toBeNull();
            expect(within(card).getByText('Next: Fifty Levels')).toBeInTheDocument();
            expect(within(card).getByText('4 / 50')).toBeInTheDocument();
            expect(card.querySelector('.ach-progress-bar-fill')).toHaveStyle({ width: '8%' });
            expect(within(card).getByText('+15')).toBeInTheDocument();
        });

        it('moves on to the next level once that one is earned too', async () => {
            const [ten, fifty, hundred] = levels();
            serve([ten, fifty, hundred], [ten, fifty]);

            await renderLoaded();

            expect(cardNames()).toEqual(['Fifty Levels']);
            expect(within(cardFor('Fifty Levels')).getByText('Next: Hundred Levels')).toBeInTheDocument();
        });

        it('shows the top level as fully completed when every level is earned', async () => {
            const [ten, fifty, hundred] = levels();
            serve([ten, fifty, hundred], [ten, fifty, hundred]);

            await renderLoaded();

            expect(cardNames()).toEqual(['Hundred Levels']);
            expect(within(cardFor('Hundred Levels')).getByText(/Fully Completed/)).toBeInTheDocument();
            expect(screen.queryByText(/Next:/)).not.toBeInTheDocument();
        });

        it('keeps achievements of the same type but another source apart', async () => {
            serve([
                achievement('Ten Levels', { source: 'levels', requirement_value: 10 }),
                achievement('Ten Helps', { source: 'helping', requirement_value: 10 }),
                achievement('Ten Streaks', { type: 'streak', source: 'levels', requirement_value: 10 }),
            ]);

            await renderLoaded();

            expect(cardNames().sort()).toEqual(['Ten Helps', 'Ten Levels', 'Ten Streaks']);
        });
    });

    describe('certificates', () => {
        const pythonLevels = () => [
            achievement('Python3', { type: 'certificate', source: null, requirement_value: 3, reward: 30 }),
            achievement('Python1', { type: 'certificate', source: null, requirement_value: 1, reward: 10 }),
            achievement('Python2', { type: 'certificate', source: null, requirement_value: 2, reward: 20 }),
        ];

        it('collapses the numbered levels of one certificate into a single card, ordered by level', async () => {
            serve(pythonLevels());

            await renderLoaded();

            expect(cardNames()).toEqual(['Python1']);
            expect(cardFor('Python1')).toHaveClass('locked');
        });

        it('shows the highest level earned in a row and the one to earn next', async () => {
            const [three, one, two] = pythonLevels();
            serve([three, one, two], [one, two]);

            await renderLoaded();

            expect(cardNames()).toEqual(['Python2']);
            const card = cardFor('Python2');
            expect(card).toHaveClass('earned');
            expect(within(card).getByText('Next: Python3')).toBeInTheDocument();
            expect(within(card).getByText('+30')).toBeInTheDocument();
        });

        it('shows no progress for a certificate, which is earned by uploading it', async () => {
            const [three, one, two] = pythonLevels();
            serve([three, one, two].map((cert) => ({ ...cert, current_progress: 2 })));

            await renderLoaded();

            const card = cardFor('Python1');
            expect(within(card).getByText('0 / 1')).toBeInTheDocument();
            expect(card.querySelector('.ach-progress-bar-fill')).toHaveStyle({ width: '0%' });
            expect(within(card).queryByText('2 / 1')).not.toBeInTheDocument();
        });

        it('also shows a level that was earned out of order, as a card of its own', async () => {
            const [three, one, two] = pythonLevels();
            serve([three, one, two], [one, three]);

            await renderLoaded();

            expect(cardNames()).toEqual(['Python1', 'Python3']);
            expect(within(cardFor('Python1')).getByText('Next: Python2')).toBeInTheDocument();
            expect(within(cardFor('Python3')).getByText(/Fully Completed/)).toBeInTheDocument();
        });

        it('shows one card per certificate family', async () => {
            serve([
                ...pythonLevels(),
                achievement('Web2', { type: 'certificate', source: null }),
                achievement('Web1', { type: 'certificate', source: null }),
            ]);

            await renderLoaded();

            expect(cardNames().sort()).toEqual(['Python1', 'Web1']);
        });

        it('treats Junior as the first level of the CS family', async () => {
            const junior = achievement('Junior', { type: 'certificate', source: null, reward: 5 });
            const cs1 = achievement('CS1', { type: 'certificate', source: null, reward: 10 });
            const cs2 = achievement('CS2', { type: 'certificate', source: null, reward: 15 });
            serve([cs2, cs1, junior], [junior]);

            await renderLoaded();

            expect(cardNames()).toEqual(['Junior']);
            expect(within(cardFor('Junior')).getByText('Next: CS1')).toBeInTheDocument();
        });

        it('shows a certificate whose name has no level on its own', async () => {
            const mastery = achievement('Mastery', { type: 'certificate', source: null });
            const python1 = achievement('Python1', { type: 'certificate', source: null });
            serve([mastery, python1], [mastery]);

            await renderLoaded();

            expect(cardNames().sort()).toEqual(['Mastery', 'Python1']);
            expect(cardFor('Mastery')).toHaveClass('earned');
            expect(cardFor('Python1')).toHaveClass('locked');
        });

        it('does not mix certificates with other achievements of the same source', async () => {
            serve([
                achievement('Python1', { type: 'certificate', source: 'levels' }),
                achievement('Ten Levels', { type: 'challenge', source: 'levels' }),
            ]);

            await renderLoaded();

            expect(cardNames().sort()).toEqual(['Python1', 'Ten Levels']);
        });
    });
});
