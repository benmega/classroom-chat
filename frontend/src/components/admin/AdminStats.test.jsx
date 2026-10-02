import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import AdminStats from './AdminStats';

const stats = {
    total_ducks: 1234,
    ducks_earned_this_week: 56,
    total_users_count: 10,
    active_users_count: 4,
};

const renderStats = (handlers = {}) => render(
    <AdminStats
        stats={stats}
        onTotalDucksClick={vi.fn()}
        onEarnedWeekClick={vi.fn()}
        onTotalResidentsClick={vi.fn()}
        onOnlineUsersClick={vi.fn()}
        {...handlers}
    />
);

describe('AdminStats', () => {
    it('shows the figures, including the average balance per resident', () => {
        renderStats();

        expect(screen.getByText('1,234')).toBeInTheDocument();
        expect(screen.getByText('56')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByText('🦆 123.4')).toBeInTheDocument();
    });

    it('shows a zero average rather than dividing by no residents', () => {
        render(<AdminStats stats={{ ...stats, total_users_count: undefined }} />);

        expect(screen.getByText('🦆 0.0')).toBeInTheDocument();
    });

    describe('keyboard', () => {
        const cards = [
            ['Ducks In Circulation', 'onTotalDucksClick'],
            ['Earned This Week', 'onEarnedWeekClick'],
            ['Total Residents', 'onTotalResidentsClick'],
            ['Online Users', 'onOnlineUsersClick'],
        ];

        it('puts the four linked cards in the tab order, and not the plain Avg. Balance card', async () => {
            const user = userEvent.setup();
            renderStats();

            const focused = [];
            for (let i = 0; i < 4; i++) {
                await user.tab();
                focused.push(document.activeElement.querySelector('.stat-label').textContent);
            }

            expect(focused).toEqual(['Ducks In Circulation', 'Earned This Week', 'Total Residents', 'Online Users']);
            expect(screen.getAllByRole('button')).toHaveLength(4);
        });

        it.each(cards)('activates the %s card with Enter and with Space', async (label, handlerName) => {
            const user = userEvent.setup();
            const handler = vi.fn();
            renderStats({ [handlerName]: handler });
            const card = screen.getByText(label).closest('.stat-card');

            card.focus();
            await user.keyboard('{Enter}');
            expect(handler).toHaveBeenCalledTimes(1);
            await user.keyboard(' ');

            expect(handler).toHaveBeenCalledTimes(2);
        });

        it('ignores other keys', async () => {
            const user = userEvent.setup();
            const handler = vi.fn();
            renderStats({ onTotalDucksClick: handler });

            screen.getByText('Ducks In Circulation').closest('.stat-card').focus();
            await user.keyboard('a{Escape}');

            expect(handler).not.toHaveBeenCalled();
        });

        it('still activates a card with the mouse', async () => {
            const user = userEvent.setup();
            const handler = vi.fn();
            renderStats({ onOnlineUsersClick: handler });

            await user.click(screen.getByText('Online Users'));

            expect(handler).toHaveBeenCalledTimes(1);
        });
    });
});
