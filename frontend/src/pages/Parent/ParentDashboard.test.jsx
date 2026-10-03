import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import ParentDashboard from './ParentDashboard';
import client from '../../api/client';


vi.mock('../../api/client');
vi.mock('react-hot-toast');
vi.mock('../../components/common/DesktopNotice', () => ({
    default: () => <div data-testid="desktop-notice" />
}));


vi.mock('../../utils/confirm', () => ({
    showConfirm: vi.fn()
}));

const mockChildren = [
    {
        id: 1,
        username: 'student1',
        nickname: 'Alice',
        profile_picture_url: '/user/profile_pictures/pfp1.jpg',
        current_activity: 'Coding',
        last_activity_time: new Date().toISOString()
    }
];

const mockReport = {
    username: 'student1',
    nickname: 'Alice',
    profile_picture_url: '/user/profile_pictures/pfp1.jpg',
    unlocked_achievements: [],
    projects: [],
    notes: [],
    course_progress: { codecombat: { levels_completed: 5 }, ozaria: { levels_completed: 2 } }
};

const mockHistory = {
    duck_history: { labels: ['Aug 1'], data: [10] },
    challenge_history: { labels: ['Aug 1'], data: [2] },
    recent_events: [
        { type: 'challenge', label: 'Completed level 1', timestamp: new Date().toISOString(), icon: 'zap' }
    ],
    current_balance: 10,
    has_any_activity_ever: true
};

describe('ParentDashboard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        client.get.mockImplementation((url) => {
            if (url.includes('/api/parents/children')) {
                return Promise.resolve({ data: { children: mockChildren } });
            }
            if (url.includes('/report')) {
                return Promise.resolve({ data: { data: mockReport } });
            }
            if (url.includes('/history')) {
                return Promise.resolve({ data: { data: mockHistory } });
            }
            return Promise.reject(new Error('Not found'));
        });
    });

    it('renders family members list with accessible options menu', async () => {
        render(
            <MemoryRouter>
                <ParentDashboard />
            </MemoryRouter>
        );

        const studentNames = await screen.findAllByText('Alice');
        expect(studentNames.length).toBeGreaterThan(0);

        const optionsBtn = screen.getByRole('button', { name: /Options for Alice/i });
        expect(optionsBtn).toBeInTheDocument();
        expect(optionsBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens dropdown and displays accessible Disconnect Student option', async () => {
        render(
            <MemoryRouter>
                <ParentDashboard />
            </MemoryRouter>
        );

        const optionsBtn = await screen.findByRole('button', { name: /Options for Alice/i });
        fireEvent.click(optionsBtn);

        expect(optionsBtn).toHaveAttribute('aria-expanded', 'true');

        const disconnectBtns = screen.getAllByText(/Remove Child/i);
        expect(disconnectBtns[0]).toBeInTheDocument();
    });

    it('prompts confirm and disconnects student on confirm', async () => {
        const { showConfirm } = await import('../../utils/confirm');
        showConfirm.mockResolvedValue(true);
        client.post.mockResolvedValueOnce({ data: { message: 'Successfully disconnected from Alice.' } });

        render(
            <MemoryRouter>
                <ParentDashboard />
            </MemoryRouter>
        );

        const optionsBtn = await screen.findByRole('button', { name: /Options for Alice/i });
        fireEvent.click(optionsBtn);

        const disconnectBtns = screen.getAllByText(/Remove Child/i);
        fireEvent.click(disconnectBtns[0]);

        await waitFor(() => {
            expect(showConfirm).toHaveBeenCalledWith('Remove Alice?', { title: 'Remove Child', destructive: true });
        });
        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/parents/disconnect/1');
        });
    });

    describe('keyboard and screen reader access', () => {
        const Probe = () => <div data-testid="path">{useLocation().pathname}</div>;
        const renderDashboard = () => render(
            <MemoryRouter initialEntries={['/parent/dashboard']}>
                <ParentDashboard />
                <Probe />
            </MemoryRouter>
        );
        const options = () => screen.findByRole('button', { name: /Options for Alice/i });
        const menu = () => document.querySelector('.child-menu-dropdown');

        it('does not turn the whole page into a button', async () => {
            const { container } = renderDashboard();
            await options();

            const page = container.querySelector('.parent-dashboard');
            expect(page).not.toHaveAttribute('role');
            expect(page).not.toHaveAttribute('tabindex');
            expect(screen.getAllByRole('heading').length).toBeGreaterThan(0);
        });

        it('closes the options menu on a press outside it', async () => {
            renderDashboard();
            fireEvent.click(await options());
            expect(menu()).not.toBeNull();

            fireEvent.mouseDown(document.body);

            expect(menu()).toBeNull();
            expect(await options()).toHaveAttribute('aria-expanded', 'false');
        });

        it('keeps the options menu open on a press inside it', async () => {
            renderDashboard();
            fireEvent.click(await options());

            fireEvent.mouseDown(screen.getByText('Remove Child'));

            expect(menu()).not.toBeNull();
        });

        it('closes the options menu on Escape', async () => {
            const user = userEvent.setup();
            renderDashboard();
            fireEvent.click(await options());

            await user.keyboard('{Escape}');

            expect(menu()).toBeNull();
        });

        it('ignores other keys while the menu is open', async () => {
            const user = userEvent.setup();
            renderDashboard();
            fireEvent.click(await options());

            await user.keyboard('a');

            expect(menu()).not.toBeNull();
        });

        it('opens the options menu from the keyboard without opening the child report', async () => {
            const user = userEvent.setup();
            renderDashboard();
            const button = await options();
            button.focus();

            await user.keyboard('{Enter}');

            expect(button).toHaveAttribute('aria-expanded', 'true');
            expect(screen.getByTestId('path')).toHaveTextContent('/parent/dashboard');
        });

        it('opens the child report when Enter is pressed on the card itself', async () => {
            const user = userEvent.setup();
            renderDashboard();
            await options();
            const card = screen.getByText('@student1').closest('[role="button"]');
            card.focus();

            await user.keyboard('{Enter}');

            expect(screen.getByTestId('path')).toHaveTextContent('/parent/report/1');
        });

        it('does not open the child report when a press lands inside the options menu', async () => {
            const { showConfirm } = await import('../../utils/confirm');
            showConfirm.mockResolvedValue(false);
            renderDashboard();
            fireEvent.click(await options());

            fireEvent.click(screen.getByText('Remove Child'));

            await waitFor(() => expect(showConfirm).toHaveBeenCalled());
            expect(screen.getByTestId('path')).toHaveTextContent('/parent/dashboard');
        });

        describe('link another child dialog', () => {
            const openDialog = async () => {
                await options();
                fireEvent.click(screen.getByTitle('Link another child'));
                return screen.getByRole('dialog', { name: 'Link Another Child' });
            };

            it('is a modal dialog named by its heading, not a pile of buttons', async () => {
                renderDashboard();

                const dialog = await openDialog();

                expect(dialog).toHaveAttribute('aria-modal', 'true');
                expect(within(dialog).getByPlaceholderText('CODE')).toBeInTheDocument();
                expect(dialog.parentElement).toHaveAttribute('role', 'presentation');
            });

            it('closes on Escape and returns focus to the button that opened it', async () => {
                const user = userEvent.setup();
                renderDashboard();
                await options();
                const opener = screen.getByTitle('Link another child');
                opener.focus();
                fireEvent.click(opener);
                expect(screen.getByRole('dialog')).toBeInTheDocument();

                await user.keyboard('{Escape}');

                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
                expect(opener).toHaveFocus();
            });

            it('closes from Cancel and from the backdrop, but not from a click inside', async () => {
                renderDashboard();
                const dialog = await openDialog();

                fireEvent.click(within(dialog).getByRole('heading', { name: 'Link Another Child' }));
                expect(screen.getByRole('dialog')).toBeInTheDocument();

                fireEvent.click(dialog.parentElement);
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

                await openDialog();
                fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });

            it('keeps Tab inside the dialog', async () => {
                const user = userEvent.setup();
                renderDashboard();
                await openDialog();
                const input = screen.getByPlaceholderText('CODE');
                const cancel = screen.getByRole('button', { name: 'Cancel' });
                expect(input).toHaveFocus();

                await user.type(input, 'ABC123');
                await user.tab();
                expect(cancel).toHaveFocus();
                await user.tab();
                expect(screen.getByRole('button', { name: 'Link Child' })).toHaveFocus();
                await user.tab();
                expect(input).toHaveFocus();
            });
        });
    });
});
