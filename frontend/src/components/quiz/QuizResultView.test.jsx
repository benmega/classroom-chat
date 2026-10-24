import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import QuizResultView from './QuizResultView';
import { formatDuration } from './formatDuration';

vi.mock('./DiagramFrame', () => ({
    default: ({ html, title }) => <div data-testid="diagram" data-title={title}>{html}</div>,
}));

const review = [
    {
        number: 1, domain: 'Logic', prompt: 'First prompt', diagram_html: '<svg>one</svg>',
        options: [{ letter: 'A', text: 'Alpha' }, { letter: 'B', text: 'Beta' }],
        selected: 'A', answer: 'A', is_correct: true, explanation: 'Because alpha',
    },
    {
        number: 2, domain: 'Logic', prompt: 'Second prompt', diagram_html: null,
        options: [{ letter: 'A', text: 'Gamma' }, { letter: 'B', text: 'Delta' }],
        selected: 'A', answer: 'B', is_correct: false, explanation: 'Because delta',
    },
    {
        number: 3, domain: 'Data', prompt: 'Third prompt', diagram_html: null,
        options: [{ letter: 'A', text: 'Eps' }, { letter: 'B', text: 'Zeta' }],
        selected: null, answer: 'B', is_correct: false, explanation: null,
    },
];

const result = (overrides = {}) => ({
    id: 7,
    status: 'submitted',
    quiz: { slug: 'grade-3-5', title: 'Olympiad 3-5' },
    student: { id: 4, username: 'sam', nickname: 'Sammy' },
    started_at: '2026-03-04T10:00:00Z',
    submitted_at: '2026-03-04T10:20:00Z',
    elapsed_seconds: 1234,
    correct: 1,
    total: 3,
    score_percent: 33,
    wrong: 1,
    skipped: 1,
    domains: [
        { domain: 'Logic', correct: 1, total: 2 },
        { domain: 'Data', correct: 0, total: 1 },
    ],
    review,
    ...overrides,
});

describe('formatDuration', () => {
    it('formats minutes and hours', () => {
        expect(formatDuration(0)).toBe('0:00');
        expect(formatDuration(65)).toBe('1:05');
        expect(formatDuration(3725)).toBe('1:02:05');
        expect(formatDuration(null)).toBe('0:00');
        expect(formatDuration(-5)).toBe('0:00');
    });
});

describe('QuizResultView', () => {
    it('renders nothing without an attempt', () => {
        const { container } = render(<QuizResultView attempt={null} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows title, date, time, score and counts', () => {
        render(<QuizResultView attempt={result()} />);
        expect(screen.getByRole('heading', { level: 1, name: 'Olympiad 3-5' })).toBeInTheDocument();
        expect(screen.getByText('20:34')).toBeInTheDocument();
        const date = new Date('2026-03-04T10:20:00Z').toLocaleDateString(undefined, { dateStyle: 'medium' });
        expect(screen.getByText(date)).toBeInTheDocument();
        const score = screen.getByRole('region', { name: 'Score' });
        expect(within(score).getByText('1/3')).toBeInTheDocument();
        expect(within(score).getByText('33%')).toBeInTheDocument();
        const counts = score.querySelector('.test-result-counts');
        expect(counts).toHaveTextContent('Correct1');
        expect(counts).toHaveTextContent('Wrong1');
        expect(counts).toHaveTextContent('Skipped1');
    });

    it('names the student only when asked, preferring the nickname', () => {
        const { rerender } = render(<QuizResultView attempt={result()} />);
        expect(screen.queryByText('Sammy')).not.toBeInTheDocument();
        rerender(<QuizResultView attempt={result()} showStudent />);
        expect(screen.getByText('Sammy')).toBeInTheDocument();
        rerender(<QuizResultView attempt={result({ student: { id: 4, username: 'sam', nickname: null } })} showStudent />);
        expect(screen.getByText('sam')).toBeInTheDocument();
    });

    it('omits the date when the timestamp is missing', () => {
        render(<QuizResultView attempt={result({ submitted_at: null })} />);
        expect(screen.queryByText('Date')).not.toBeInTheDocument();
    });

    it('lists domains with score and percent', () => {
        render(<QuizResultView attempt={result()} />);
        const table = screen.getByRole('table');
        expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Domain', 'Score', '%']);
        const logic = within(table).getByRole('row', { name: /Logic/ });
        expect(logic).toHaveTextContent('1/2');
        expect(logic).toHaveTextContent('50%');
        const data = within(table).getByRole('row', { name: /Data/ });
        expect(data).toHaveTextContent('0/1');
        expect(data).toHaveTextContent('0%');
    });

    it('has no decorative bars in the domain table', () => {
        const { container } = render(<QuizResultView attempt={result()} />);
        expect(container.querySelector('.test-result-bar')).toBeNull();
        expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);
    });

    it('shows the ducks earned next to the score', () => {
        render(<QuizResultView attempt={result({ ducks_awarded: 12 })} />);
        const score = screen.getByRole('region', { name: 'Score' });
        const ducks = within(score).getByRole('img', { name: '12 ducks' });
        expect(ducks).toHaveTextContent('+12');
        expect(ducks.querySelector('svg.duck-icon')).not.toBeNull();
    });

    it('uses the singular for one duck', () => {
        render(<QuizResultView attempt={result({ ducks_awarded: 1 })} />);
        expect(screen.getByRole('img', { name: '1 duck' })).toHaveTextContent('+1');
    });

    it.each([0, undefined, null])('shows no ducks for %s', (value) => {
        const { container } = render(<QuizResultView attempt={result({ ducks_awarded: value })} />);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(container.querySelector('.duck-icon')).toBeNull();
        expect(container.textContent).not.toMatch(/\+\d/);
    });

    it('hides the domain table when there are no domains', () => {
        render(<QuizResultView attempt={result({ domains: [] })} />);
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('guards a zero-question domain and a missing percent', () => {
        render(<QuizResultView attempt={result({ score_percent: null, correct: 0, total: 0, domains: [{ domain: 'Empty', correct: 0, total: 0 }] })} />);
        expect(screen.getByRole('row', { name: /Empty/ })).toHaveTextContent('0%');
        expect(within(screen.getByRole('region', { name: 'Score' })).getByText('0/0')).toBeInTheDocument();
    });

    it('shows nothing about the review when it is null', () => {
        render(<QuizResultView attempt={result({ review: null })} />);
        expect(screen.queryByText('Review')).not.toBeInTheDocument();
        expect(screen.queryByRole('group', { name: 'Filter questions' })).not.toBeInTheDocument();
        expect(screen.queryByText('First prompt')).not.toBeInTheDocument();
    });

    it('shows every reviewed question with prompt, diagram and explanation', () => {
        render(<QuizResultView attempt={result()} />);
        expect(screen.getByText('First prompt')).toBeInTheDocument();
        expect(screen.getByText('Second prompt')).toBeInTheDocument();
        expect(screen.getByText('Third prompt')).toBeInTheDocument();
        const diagrams = screen.getAllByTestId('diagram');
        expect(diagrams).toHaveLength(1);
        expect(diagrams[0]).toHaveTextContent('<svg>one</svg>');
        expect(diagrams[0]).toHaveAttribute('data-title', 'Question 1 diagram');
        expect(screen.getByText('Because alpha')).toBeInTheDocument();
        expect(screen.getByText('Because delta')).toBeInTheDocument();
    });

    it('marks the selected and correct options with text', () => {
        render(<QuizResultView attempt={result()} />);
        const q1 = screen.getByTestId('review-1');
        const q1Options = within(q1).getAllByRole('listitem');
        expect(q1Options[0]).toHaveTextContent('Your answer');
        expect(q1Options[0]).toHaveTextContent('Correct');
        expect(q1Options[1]).not.toHaveTextContent('Your answer');
        expect(q1Options[1]).not.toHaveTextContent('Correct');

        const q2 = screen.getByTestId('review-2');
        const q2Options = within(q2).getAllByRole('listitem');
        expect(q2Options[0]).toHaveTextContent('Your answer');
        expect(q2Options[0]).not.toHaveTextContent('Wrong');
        expect(q2Options[0]).not.toHaveTextContent('Correct');
        expect(q2Options[1]).toHaveTextContent('Correct');
        expect(q2Options[1]).not.toHaveTextContent('Your answer');
    });

    it('labels each question correct, wrong or skipped', () => {
        render(<QuizResultView attempt={result()} />);
        expect(screen.getByTestId('review-1').querySelector('.test-result-question-state')).toHaveTextContent('Correct');
        expect(screen.getByTestId('review-2').querySelector('.test-result-question-state')).toHaveTextContent('Wrong');
        const skipped = screen.getByTestId('review-3');
        expect(skipped.querySelector('.test-result-question-state')).toHaveTextContent('Skipped');
        expect(within(skipped).queryByText('Your answer')).not.toBeInTheDocument();
        expect(within(skipped).queryByText('Explanation')).not.toBeInTheDocument();
    });

    it('filters the review and shows counts on the buttons', async () => {
        const user = userEvent.setup();
        render(<QuizResultView attempt={result()} />);
        const all = screen.getByRole('button', { name: 'All 3' });
        const incorrect = screen.getByRole('button', { name: 'Incorrect 2' });
        const correct = screen.getByRole('button', { name: 'Correct 1' });
        expect(all).toHaveAttribute('aria-pressed', 'true');

        await user.click(incorrect);
        expect(incorrect).toHaveAttribute('aria-pressed', 'true');
        expect(all).toHaveAttribute('aria-pressed', 'false');
        expect(screen.queryByText('First prompt')).not.toBeInTheDocument();
        expect(screen.getByText('Second prompt')).toBeInTheDocument();
        expect(screen.getByText('Third prompt')).toBeInTheDocument();

        await user.click(correct);
        expect(screen.getByText('First prompt')).toBeInTheDocument();
        expect(screen.queryByText('Second prompt')).not.toBeInTheDocument();

        await user.click(all);
        expect(screen.getAllByTestId(/^review-/)).toHaveLength(3);
    });

    it('shows only a short in-progress state for an unfinished attempt', () => {
        render(
            <QuizResultView
                showStudent
                attempt={{
                    id: 9, status: 'in_progress', quiz: { slug: 'x', title: 'Olympiad 6-8' },
                    student: { id: 4, username: 'sam', nickname: 'Sammy' },
                    started_at: '2026-03-04T10:00:00Z', submitted_at: null, elapsed_seconds: 60,
                    correct: null, total: 30, score_percent: null,
                }}
            />,
        );
        expect(screen.getByRole('heading', { name: 'Olympiad 6-8' })).toBeInTheDocument();
        expect(screen.getByText('In progress')).toBeInTheDocument();
        expect(screen.getByText('Sammy')).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Score' })).not.toBeInTheDocument();
        expect(screen.queryByText('Time')).not.toBeInTheDocument();
        expect(screen.queryByText('Review')).not.toBeInTheDocument();
    });

    it('has no emoji, medals or grades in the output', () => {
        const { container } = render(<QuizResultView attempt={result({ score_percent: 100, correct: 3, wrong: 0, skipped: 0 })} />);
        expect(container.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
        expect(container.textContent).not.toMatch(/medal|grade [A-F]|congrat|great job/i);
    });
});
