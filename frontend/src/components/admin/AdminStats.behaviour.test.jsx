import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminStats from './AdminStats';

const baseStats = {
  total_ducks: 12345,
  ducks_earned_this_week: 678,
  active_users_count: 4,
  total_users_count: 10,
};

const renderStats = (stats = baseStats, handlers = {}) => {
  const props = {
    onEarnedWeekClick: vi.fn(),
    onTotalDucksClick: vi.fn(),
    onOnlineUsersClick: vi.fn(),
    onTotalResidentsClick: vi.fn(),
    ...handlers,
  };
  render(<AdminStats stats={stats} {...props} />);
  return props;
};

// The card a label belongs to: the clickable role="button" wrapper
const card = (label) => screen.getByText(label).closest('.stat-card');

describe('AdminStats', () => {
  it('shows each figure with its label', () => {
    renderStats();

    expect(card('Ducks In Circulation')).toHaveTextContent('12,345');
    expect(card('Earned This Week')).toHaveTextContent('678');
    expect(card('Total Residents')).toHaveTextContent('10');
    expect(card('Online Users')).toHaveTextContent('4');
  });

  it('averages the ducks over all residents', () => {
    renderStats({ ...baseStats, total_ducks: 25, total_users_count: 10 });

    expect(card('Avg. Balance')).toHaveTextContent('2.5');
  });

  it('shows a zero average instead of dividing by no residents', () => {
    renderStats({ ...baseStats, total_users_count: 0 });

    expect(card('Avg. Balance')).toHaveTextContent('0.0');
    expect(card('Total Residents')).toHaveTextContent('0');
  });

  it('treats a missing resident count as none', () => {
    renderStats({ total_ducks: 5, ducks_earned_this_week: 0, active_users_count: 0 });

    expect(card('Avg. Balance')).toHaveTextContent('0.0');
    expect(card('Total Residents')).toHaveTextContent('0');
  });

  it.each([
    ['Ducks In Circulation', 'onTotalDucksClick'],
    ['Earned This Week', 'onEarnedWeekClick'],
    ['Total Residents', 'onTotalResidentsClick'],
    ['Online Users', 'onOnlineUsersClick'],
  ])('calls the %s handler, and only that one, when the card is clicked', (label, handlerName) => {
    const handlers = renderStats();

    fireEvent.click(card(label));

    expect(handlers[handlerName]).toHaveBeenCalledTimes(1);
    Object.entries(handlers)
      .filter(([name]) => name !== handlerName)
      .forEach(([, handler]) => expect(handler).not.toHaveBeenCalled());
  });

  it.each(['Enter', ' '])('also opens a card from the keyboard with the %j key', (key) => {
    const handlers = renderStats();

    fireEvent.keyDown(card('Online Users'), { key });

    expect(handlers.onOnlineUsersClick).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys', () => {
    const handlers = renderStats();

    fireEvent.keyDown(card('Online Users'), { key: 'a' });
    fireEvent.keyDown(card('Online Users'), { key: 'Tab' });

    expect(handlers.onOnlineUsersClick).not.toHaveBeenCalled();
  });

  it('exposes the clickable cards as focusable buttons and leaves the average inert', () => {
    renderStats();

    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(card('Avg. Balance')).not.toHaveAttribute('role');
    expect(card('Avg. Balance')).not.toHaveAttribute('tabindex');
  });
});
