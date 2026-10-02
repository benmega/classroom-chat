import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { renderWithProviders } from '../../test/test-utils';
import { SidebarProvider } from '../../context/SidebarContext';
import AdminDashboard from './AdminDashboard';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import client from '../../api/client';
import toast from 'react-hot-toast';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
  }
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-chartjs-2', () => ({
  Line: ({ options }) => (
    <button 
      data-testid="line-chart" 
      onClick={(e) => options.onClick(e, [{ datasetIndex: 1, index: 1 }])} 
      onMouseOver={(e) => options.onHover({ native: { target: e.target } }, [{ datasetIndex: 0, index: 1 }])}
      onFocus={(e) => options.onHover({ native: { target: e.target } }, [{ datasetIndex: 0, index: 1 }])}
    />
  ),
  Pie: ({ data }) => <canvas data-testid="pie-chart" data-values={data.datasets[0].data.join(',')} />,
}));

vi.mock('../../hooks/useAdminDashboard');
vi.mock('../../hooks/useSidebar', () => ({
  default: () => ({ toggleSidebar: vi.fn() }),
  useSidebar: () => ({ toggleSidebar: vi.fn() }),
}));

global.URL.createObjectURL = vi.fn(() => 'blob:url');

const mockDashboardData = {
  user_distribution: { active_students: 2, inactive_students: 3, parents: 1, admins: 1 },
  top_earners: [
    { id: 1, username: 'alice', nickname: 'Alice', duck_balance: 50 },
    { id: 3, username: 'charlie', nickname: null, duck_balance: 20 },
    { id: 2, username: 'bob', nickname: 'Bob', duck_balance: 10 },
  ],
  config: {
    message_sending_enabled: false,
    duck_multiplier: 1.0,
  },
  chart_data: {
    dates: ['2023-01-01', '2023-01-02', '2023-01-03'],
    labels: ['Mon', 'Tue', 'Wed'],
    earned: [10, 20, 15],
    spent: [5, 8, 12],
    max_history_days: 90,
  },
  total_users_count: 7,
  active_users_count: 2,
  total_ducks: 100,
  ducks_earned_this_week: 30,
  pending_users_count: 3,
  pending_trades_count: 1,
};

const defaultHookReturn = {
  dashboardData: mockDashboardData,
  isLoading: false,
  isRefreshing: false,
  activeModal: null,
  setActiveModal: vi.fn(),
  formLoading: false,
  pendingToggle: false,
  timeframe: 7,
  setTimeframe: vi.fn(),
  fetchDashboardData: vi.fn(),
  handleToggleMessages: vi.fn(),
  handleUpdateMultiplier: vi.fn(),
  handleAddBannedWord: vi.fn().mockResolvedValue(true),
};

const renderComponent = () => renderWithProviders(<AdminDashboard />);

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAdminDashboard.mockReturnValue(defaultHookReturn);
  });

  it('renders loading skeleton when isLoading is true', () => {
    useAdminDashboard.mockReturnValue({ ...defaultHookReturn, isLoading: true, dashboardData: null });
    renderComponent();
    expect(screen.getAllByTestId("skeleton-title")[0]).toBeInTheDocument();
  });

  it('renders error state when dashboardData is null after loading', () => {
    useAdminDashboard.mockReturnValue({ ...defaultHookReturn, isLoading: false, dashboardData: null });
    renderComponent();
    expect(screen.getByText(/Error loading dashboard/i)).toBeInTheDocument();
  });

  it('offers a Retry button on the error state that refetches the dashboard', () => {
    useAdminDashboard.mockReturnValue({ ...defaultHookReturn, isLoading: false, dashboardData: null });
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(defaultHookReturn.fetchDashboardData).toHaveBeenCalledTimes(1);
    // Called without the click event so the hook falls back to the current timeframe.
    expect(defaultHookReturn.fetchDashboardData).toHaveBeenCalledWith();
  });

  it('disables Retry while the retry request is running', () => {
    useAdminDashboard.mockReturnValue({ ...defaultHookReturn, isLoading: false, isRefreshing: true, dashboardData: null });
    renderComponent();

    expect(screen.getByRole('button', { name: 'Retrying...' })).toBeDisabled();
  });

  it('says there are no users yet when there are no top earners', () => {
    useAdminDashboard.mockReturnValue({
      ...defaultHookReturn,
      dashboardData: {
        ...mockDashboardData,
        top_earners: [],
        total_users_count: 0,
        active_users_count: 0,
        user_distribution: { active_students: 0, inactive_students: 0, parents: 0, admins: 0 },
      },
    });
    renderComponent();

    expect(screen.getByText('No users yet')).toBeInTheDocument();
    expect(screen.getByText('0% of users are currently online')).toBeInTheDocument();
  });

  it('does not show the empty-users text when there are users', () => {
    renderComponent();
    expect(screen.queryByText('No users yet')).not.toBeInTheDocument();
  });

  it('charts the user breakdown the server computed', () => {
    renderComponent();
    expect(screen.getByTestId('pie-chart')).toHaveAttribute('data-values', '2,3,1,1');
  });

  it('derives the online share from the active and total user counts', () => {
    useAdminDashboard.mockReturnValue({
      ...defaultHookReturn,
      dashboardData: { ...mockDashboardData, total_users_count: 8, active_users_count: 2 },
    });
    renderComponent();

    expect(screen.getByText('25% of users are currently online')).toBeInTheDocument();
  });

  it('lists the top earners in the order the server sent them', () => {
    renderComponent();

    const names = [...document.querySelectorAll('.earner-item .name')].map(n => n.textContent);
    expect(names).toEqual(['Alice', 'charlie', 'Bob']);
    expect(screen.getByText('@charlie')).toBeInTheDocument();
    expect(screen.getByText(/50\.0/)).toBeInTheDocument();
  });

  it('renders the dashboard header with title', () => {
    renderComponent();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders global config settings', () => {
    renderComponent();
    expect(screen.queryByText('AI Teacher')).not.toBeInTheDocument();
    expect(screen.getByText('Public Messaging')).toBeInTheDocument();
    expect(screen.getByText('Duck Multiplier')).toBeInTheDocument();
  });

  it('calls handleToggleMessages', () => {
    renderComponent();
    const msgBtn = screen.getByRole('button', { name: /Public Messaging/i });
    expect(msgBtn).toBeEnabled();
    fireEvent.click(msgBtn);
    expect(defaultHookReturn.handleToggleMessages).toHaveBeenCalledTimes(1);
  });

  it('disables the Public Messaging toggle while a toggle request is pending', () => {
    useAdminDashboard.mockReturnValue({ ...defaultHookReturn, pendingToggle: true });
    renderComponent();

    const msgBtn = screen.getByRole('button', { name: /Public Messaging/i });
    expect(msgBtn).toBeDisabled();
    fireEvent.click(msgBtn);
    expect(defaultHookReturn.handleToggleMessages).not.toHaveBeenCalled();
  });

  it('opens bannedWord modal', () => {
    renderComponent();
    const modBtn = screen.getByRole('button', { name: /Content Moderation/i });
    fireEvent.click(modBtn);
    expect(defaultHookReturn.setActiveModal).toHaveBeenCalledWith('bannedWord');
  });

  describe('duck multiplier', () => {
    const withMultiplier = (duck_multiplier) => useAdminDashboard.mockReturnValue({
      ...defaultHookReturn,
      dashboardData: { ...mockDashboardData, config: { ...mockDashboardData.config, duck_multiplier } },
    });

    it('calls handleUpdateMultiplier with a number when Save is clicked', () => {
      renderComponent();
      const input = screen.getByLabelText('Duck Multiplier');
      const save = screen.getByRole('button', { name: 'Save' });
      expect(save).toBeDisabled();

      fireEvent.change(input, { target: { value: '2.5' } });
      expect(save).toBeEnabled();
      fireEvent.click(save);

      expect(defaultHookReturn.handleUpdateMultiplier).toHaveBeenCalledTimes(1);
      expect(defaultHookReturn.handleUpdateMultiplier).toHaveBeenCalledWith(2.5);
    });

    it('saves on Enter (form submit)', () => {
      renderComponent();
      const input = screen.getByLabelText('Duck Multiplier');
      fireEvent.change(input, { target: { value: '3' } });

      fireEvent.submit(input.closest('form'));

      expect(defaultHookReturn.handleUpdateMultiplier).toHaveBeenCalledWith(3);
    });

    it('makes no request when the field is blurred without a change', () => {
      renderComponent();
      const input = screen.getByLabelText('Duck Multiplier');

      fireEvent.focus(input);
      fireEvent.blur(input);
      fireEvent.submit(input.closest('form'));

      expect(defaultHookReturn.handleUpdateMultiplier).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    it('renders a stored multiplier of 0 as 0, not 1', () => {
      withMultiplier(0);
      renderComponent();

      expect(screen.getByLabelText('Duck Multiplier')).toHaveValue(0);
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    it('can save 0 as the multiplier', () => {
      renderComponent();
      const input = screen.getByLabelText('Duck Multiplier');
      fireEvent.change(input, { target: { value: '0' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(defaultHookReturn.handleUpdateMultiplier).toHaveBeenCalledWith(0);
    });

    it('treats a missing stored multiplier as 1', () => {
      useAdminDashboard.mockReturnValue({
        ...defaultHookReturn,
        dashboardData: { ...mockDashboardData, config: { message_sending_enabled: true } },
      });
      renderComponent();

      expect(screen.getByLabelText('Duck Multiplier')).toHaveValue(1);
    });

    it('shows an inline message and makes no request for an empty value', () => {
      renderComponent();
      const input = screen.getByLabelText('Duck Multiplier');

      fireEvent.change(input, { target: { value: '' } });

      expect(screen.getByRole('alert')).toHaveTextContent('Enter a number.');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      fireEvent.submit(input.closest('form'));
      fireEvent.blur(input);
      expect(defaultHookReturn.handleUpdateMultiplier).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it.each(['-1', '100.5', '1000'])('rejects the out-of-range value %s', (value) => {
      renderComponent();
      const input = screen.getByLabelText('Duck Multiplier');

      fireEvent.change(input, { target: { value } });

      expect(screen.getByRole('alert')).toHaveTextContent('Must be between 0 and 100.');
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      fireEvent.submit(input.closest('form'));
      expect(defaultHookReturn.handleUpdateMultiplier).not.toHaveBeenCalled();
    });

    it('accepts the upper bound and mirrors the range on the input', () => {
      renderComponent();
      const input = screen.getByLabelText('Duck Multiplier');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '100');
      expect(input).toHaveAttribute('step', '0.1');

      fireEvent.change(input, { target: { value: '100' } });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    });

    it('re-syncs the field when the stored multiplier changes after a refetch', () => {
      const Wrapper = ({ children }) => (
        <BrowserRouter>
          <SidebarProvider>{children}</SidebarProvider>
        </BrowserRouter>
      );
      withMultiplier(1);
      const { rerender } = render(<AdminDashboard />, { wrapper: Wrapper });
      const input = screen.getByLabelText('Duck Multiplier');
      fireEvent.change(input, { target: { value: '2.50' } });
      expect(input).toHaveValue(2.5);

      withMultiplier(2.5);
      rerender(<AdminDashboard />);

      expect(screen.getByLabelText('Duck Multiplier')).toHaveValue(2.5);
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });
  });

  it('calls handleExportTransactions on success', async () => {
    renderComponent();
    client.get.mockResolvedValueOnce({ data: new Blob(['test']), headers: {} });
    const btn = screen.getByText('Export Transactions CSV');
    fireEvent.click(btn);
    await waitFor(() => {
        expect(client.get).toHaveBeenCalledWith('/api/admin/export/transactions', { responseType: 'blob' });
        expect(toast.success).toHaveBeenCalledWith('Transaction history exported.');
    });
  });

  it('calls handleExportTransactions on error', async () => {
    renderComponent();
    client.get.mockRejectedValueOnce(new Error('fail'));
    const btn = screen.getByText('Export Transactions CSV');
    fireEvent.click(btn);
    await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to export transaction data.');
    });
  });

  it('submits banned word form', async () => {
    useAdminDashboard.mockReturnValue({
      ...defaultHookReturn,
      activeModal: 'bannedWord',
    });
    renderComponent();
    const wordInput = screen.getByPlaceholderText(/e.g. badword/i);
    fireEvent.change(wordInput, { target: { value: 'testword' } });
    const form = wordInput.closest('form');
    fireEvent.submit(form);
    expect(defaultHookReturn.handleAddBannedWord).toHaveBeenCalledWith('testword', '');
    await waitFor(() => expect(defaultHookReturn.setActiveModal).toHaveBeenCalledWith(null));
  });

  it('keeps the banned word modal open and the text when adding fails', async () => {
    const handleAddBannedWord = vi.fn().mockResolvedValue(false);
    useAdminDashboard.mockReturnValue({
      ...defaultHookReturn,
      handleAddBannedWord,
      activeModal: 'bannedWord',
    });
    renderComponent();
    const wordInput = screen.getByPlaceholderText(/e.g. badword/i);
    fireEvent.change(wordInput, { target: { value: 'dupe' } });

    fireEvent.submit(wordInput.closest('form'));

    await waitFor(() => expect(handleAddBannedWord).toHaveBeenCalledWith('dupe', ''));
    expect(defaultHookReturn.setActiveModal).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText(/e.g. badword/i)).toHaveValue('dupe');
  });

  it('handles timeframe select', () => {
    renderComponent();
    const select = screen.getByRole('combobox', { hidden: true });
    fireEvent.change(select, { target: { value: '30' } });
    expect(defaultHookReturn.setTimeframe).toHaveBeenCalledWith(30);

    fireEvent.change(select, { target: { value: 'all' } });
    expect(defaultHookReturn.setTimeframe).toHaveBeenCalledWith('all');
  });

  it('names the chart timeframe select', () => {
    renderComponent();

    expect(screen.getByLabelText('Chart timeframe')).toHaveValue('7');
  });

  it('navigates when chart point is clicked', () => {
    renderComponent();
    const chart = screen.getByTestId('line-chart');
    fireEvent.click(chart);
    expect(mockNavigate).toHaveBeenCalledWith('/admin/transactions?type=spent&date=2023-01-02');
  });

  it('changes cursor on hover over chart', () => {
    renderComponent();
    const chart = screen.getByTestId('line-chart');
    fireEvent.mouseOver(chart);
    expect(chart.style.cursor).toBe('pointer');
  });

  it('navigates on AdminStats clicks', () => {
    renderComponent();
    const earnedWeek = screen.getByText('Ducks In Circulation');
    fireEvent.click(earnedWeek.closest('.stat-card') || earnedWeek);
    expect(mockNavigate).toHaveBeenCalledWith('/admin/users');

    const onlineUsers = screen.getByText('Online Users');
    fireEvent.click(onlineUsers.closest('.stat-card') || onlineUsers);
    expect(mockNavigate).toHaveBeenCalledWith('/admin/users?filter=online');

    const weekEarned = screen.getByText('Earned This Week');
    fireEvent.click(weekEarned.closest('.stat-card') || weekEarned);
    expect(mockNavigate).toHaveBeenCalledWith('/admin/transactions?type=earned');
  });
});