import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
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
    />
  ),
  Pie: () => <canvas data-testid="pie-chart" />,
}));

vi.mock('../../hooks/useAdminDashboard');
vi.mock('../../hooks/useSidebar', () => ({
  default: () => ({ toggleSidebar: vi.fn() }),
  useSidebar: () => ({ toggleSidebar: vi.fn() }),
}));

global.URL.createObjectURL = vi.fn(() => 'blob:url');

const mockDashboardData = {
  users: [
    { id: 1, username: 'alice', nickname: 'Alice', role: 'student', is_admin: false, duck_balance: 50, is_online: true },
    { id: 2, username: 'bob', nickname: 'Bob', role: 'parent', is_admin: false, duck_balance: 10, is_online: false },
  ],
  all_users: [
    { id: 1, username: 'alice', nickname: 'Alice', role: 'student', is_admin: false, duck_balance: 50, is_online: true },
    { id: 2, username: 'bob', nickname: 'Bob', role: 'parent', is_admin: false, duck_balance: 10, is_online: false },
    { id: 3, username: 'charlie', nickname: null, role: 'student', is_admin: false, duck_balance: 20, is_online: true },
    { id: 4, username: 'admin', nickname: 'Admin', role: 'admin', is_admin: true, duck_balance: 0, is_online: false },
  ],
  config: {
    ai_teacher_enabled: true,
    message_sending_enabled: false,
    duck_multiplier: 1.0,
  },
  banned_words: [
    { id: 1, word: 'badword' },
    { id: 2, word: 'anotherbad' },
  ],
  chart_data: {
    dates: ['2023-01-01', '2023-01-02', '2023-01-03'],
    labels: ['Mon', 'Tue', 'Wed'],
    earned: [10, 20, 15],
    spent: [5, 8, 12],
    max_history_days: 90,
  },
  classrooms: [],
  total_users_count: 2,
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
  modalUser: null,
  setModalUser: vi.fn(),
  formLoading: false,
  formErrors: {},
  timeframe: 7,
  setTimeframe: vi.fn(),
  fetchDashboardData: vi.fn(),
  handleToggleAI: vi.fn(),
  handleToggleMessages: vi.fn(),
  handleUpdateMultiplier: vi.fn(),
  handleAddBannedWord: vi.fn().mockResolvedValue(true),
  handleCreateUser: vi.fn(),
  handleAdjustDucks: vi.fn(),
  handleResetPassword: vi.fn(),
  handleStartConversation: vi.fn(),
  handleRemoveUser: vi.fn(),
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

  it('renders the dashboard header with title', () => {
    renderComponent();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders global config settings', () => {
    renderComponent();
    expect(screen.getByText('AI Teacher')).toBeInTheDocument();
    expect(screen.getByText('Public Messaging')).toBeInTheDocument();
    expect(screen.getByText('Duck Multiplier')).toBeInTheDocument();
  });

  it('calls handleToggleAI and handleToggleMessages', () => {
    renderComponent();
    const aiBtn = screen.getByRole('button', { name: /AI Teacher/i });
    fireEvent.click(aiBtn);
    expect(defaultHookReturn.handleToggleAI).toHaveBeenCalledTimes(1);

    const msgBtn = screen.getByRole('button', { name: /Public Messaging/i });
    fireEvent.click(msgBtn);
    expect(defaultHookReturn.handleToggleMessages).toHaveBeenCalledTimes(1);
  });

  it('opens bannedWord modal', () => {
    renderComponent();
    const modBtn = screen.getByRole('button', { name: /Content Moderation/i });
    fireEvent.click(modBtn);
    expect(defaultHookReturn.setActiveModal).toHaveBeenCalledWith('bannedWord');
  });

  it('calls handleUpdateMultiplier', () => {
    renderComponent();
    const input = screen.getByLabelText('Duck Multiplier');
    fireEvent.change(input, { target: { value: '2.0' } });
    fireEvent.blur(input);
    expect(defaultHookReturn.handleUpdateMultiplier).toHaveBeenCalledWith('2.0');
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
  });

  it('handles timeframe select', () => {
    renderComponent();
    const select = screen.getByRole('combobox', { hidden: true });
    fireEvent.change(select, { target: { value: '30' } });
    expect(defaultHookReturn.setTimeframe).toHaveBeenCalledWith(30);

    fireEvent.change(select, { target: { value: 'all' } });
    expect(defaultHookReturn.setTimeframe).toHaveBeenCalledWith('all');
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