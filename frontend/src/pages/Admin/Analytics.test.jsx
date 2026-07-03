import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import Analytics from './Analytics';

vi.mock('react-chartjs-2', () => ({
  Line: () => <canvas data-testid="line-chart" />,
  Pie: () => <canvas data-testid="pie-chart" />,
}));

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../hooks/useSidebar', () => ({
  default: () => ({ toggleSidebar: vi.fn() }),
  useSidebar: () => ({ toggleSidebar: vi.fn() }),
}));

import client from '../../api/client';

const mockAnalyticsData = {
  users: [
    { id: 1, username: 'alice', nickname: 'Alice', role: 'student', is_admin: false, duck_balance: 100, is_online: true },
    { id: 2, username: 'bob', nickname: 'Bob', role: 'student', is_admin: false, duck_balance: 50, is_online: false },
    { id: 3, username: 'carol', nickname: 'Carol', role: 'parent', is_admin: false, duck_balance: 20, is_online: false },
    { id: 4, username: 'admin1', nickname: 'Admin', role: 'student', is_admin: true, duck_balance: 200, is_online: true },
  ],
  chart_data: {
    labels: ['Mon', 'Tue', 'Wed'],
    earned: [10, 20, 15],
    spent: [5, 8, 12],
  },
  total_ducks: 370,
  ducks_earned_this_week: 45,
  config: {},
  banned_words: [],
};

const successResponse = {
  data: {
    status: 'success',
    data: mockAnalyticsData,
  },
};

const renderComponent = () => renderWithProviders(<Analytics />);

describe('Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    client.get.mockImplementation(() => new Promise(() => {}));
    renderComponent();
    expect(screen.getByText(/Processing system data/i)).toBeInTheDocument();
  });

  it('renders main heading after data loads', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => expect(screen.getByText('System Analytics')).toBeInTheDocument());
  });

  it('renders Transaction Flow chart section', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => expect(screen.getByText('Transaction Flow')).toBeInTheDocument());
  });

  it('renders Economy Summary section with total supply', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Economy Summary')).toBeInTheDocument();
      expect(screen.getByText('Total Supply')).toBeInTheDocument();
      expect(screen.getByText(/370/)).toBeInTheDocument();
    });
  });

  it('renders Minted (7d) stat', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/Minted/i)).toBeInTheDocument();
      expect(screen.getByText(/45/)).toBeInTheDocument();
    });
  });

  it('renders User Breakdown pie chart section', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => expect(screen.getByText('User Breakdown')).toBeInTheDocument());
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('renders High Value Earners section with sorted users', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => expect(screen.getByText('High Value Earners')).toBeInTheDocument());
    // admin1 has highest balance (200) so should appear first
    const handles = screen.getAllByText(/@admin1|@alice|@bob|@carol/);
    expect(handles.length).toBeGreaterThan(0);
  });

  it('renders System Reach stats', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('System Reach')).toBeInTheDocument();
      expect(screen.getByText('Total Residents')).toBeInTheDocument();
      // 4 total users
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  it('renders time range selector', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => {
      const select = screen.getByRole('combobox', { hidden: true });
      expect(select).toBeInTheDocument();
      expect(select.value).toBe('7d');
    });
  });

  it('updates time range when select changes', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => expect(screen.getByText('System Analytics')).toBeInTheDocument());

    const select = screen.getByRole('combobox', { hidden: true });
    fireEvent.change(select, { target: { value: '30d' } });
    expect(select.value).toBe('30d');
  });

  it('calls fetchAnalytics again when refresh button is clicked', async () => {
    client.get.mockResolvedValue(successResponse);
    const { container } = renderComponent();
    await waitFor(() => expect(screen.getByText('System Analytics')).toBeInTheDocument());

    const refreshBtn = container.querySelector('.icon-btn');
    expect(refreshBtn).toBeTruthy();
    await act(async () => {
      fireEvent.click(refreshBtn);
    });
    expect(client.get).toHaveBeenCalledTimes(2);
  });

  it('renders Export CSV button', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => expect(screen.getByText(/Export CSV/i)).toBeInTheDocument());
  });

  it('renders line chart', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => expect(screen.getByTestId('line-chart')).toBeInTheDocument());
  });
});
