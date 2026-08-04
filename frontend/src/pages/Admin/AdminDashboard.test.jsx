import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import AdminDashboard from './AdminDashboard';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';

// Mock chart.js canvas API used by react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Line: () => <canvas data-testid="line-chart" />,
  Pie: () => <canvas data-testid="pie-chart" />,
}));

vi.mock('../../hooks/useAdminDashboard');
vi.mock('../../hooks/useSidebar', () => ({
  default: () => ({ toggleSidebar: vi.fn() }),
  useSidebar: () => ({ toggleSidebar: vi.fn() }),
}));

const mockDashboardData = {
  users: [
    { id: 1, username: 'alice', nickname: 'Alice', role: 'student', is_admin: false, duck_balance: 50, is_online: true },
    { id: 2, username: 'bob', nickname: 'Bob', role: 'parent', is_admin: false, duck_balance: 10, is_online: false },
  ],
  all_users: [],
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
    const { container } = renderComponent();
    expect(container.querySelector('.skeleton-title')).toBeInTheDocument();
  });

  it('renders error state when dashboardData is null after loading', () => {
    useAdminDashboard.mockReturnValue({ ...defaultHookReturn, isLoading: false, dashboardData: null });
    renderComponent();
    expect(screen.getByText(/Error loading dashboard/i)).toBeInTheDocument();
  });

  it('renders the dashboard header with title', () => {
    renderComponent();
    expect(screen.getByText('Overview Dashboard')).toBeInTheDocument();
  });

  it('renders global config settings', () => {
    renderComponent();
    expect(screen.getByText('AI Teacher')).toBeInTheDocument();
    expect(screen.getByText('Public Messaging')).toBeInTheDocument();
    expect(screen.getByText('Duck Multiplier')).toBeInTheDocument();
  });

  it('renders AI teacher toggle reflecting config state', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /AI Teacher Enabled/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Public Messaging Disabled/i })).toBeInTheDocument();
  });

  it('calls handleToggleAI when AI toggle is clicked', () => {
    renderComponent();
    const aiBtn = screen.getByRole('button', { name: /AI Teacher Enabled/i });
    fireEvent.click(aiBtn);
    expect(defaultHookReturn.handleToggleAI).toHaveBeenCalledTimes(1);
  });

  it('calls handleToggleMessages when messages toggle is clicked', () => {
    renderComponent();
    const msgBtn = screen.getByRole('button', { name: /Public Messaging Disabled/i });
    fireEvent.click(msgBtn);
    expect(defaultHookReturn.handleToggleMessages).toHaveBeenCalledTimes(1);
  });

  it('opens bannedWord modal when Content Moderation button is clicked', () => {
    renderComponent();
    const modBtn = screen.getByRole('button', { name: /Content Moderation/i });
    fireEvent.click(modBtn);
    expect(defaultHookReturn.setActiveModal).toHaveBeenCalledWith('bannedWord');
  });

  it.skip('calls fetchDashboardData when refresh button is clicked', () => {
    renderComponent();
    const refreshBtn = document.querySelector('.refresh-btn');
    fireEvent.click(refreshBtn);
    expect(defaultHookReturn.fetchDashboardData).toHaveBeenCalled();
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

  it('renders timeframe select with default value 7', () => {
    renderComponent();
    const select = screen.getByRole('combobox', { hidden: true });
    expect(select.value).toBe('7');
  });

  it('calls setTimeframe when timeframe select changes', () => {
    renderComponent();
    const select = screen.getByRole('combobox', { hidden: true });
    fireEvent.change(select, { target: { value: '30' } });
    expect(defaultHookReturn.setTimeframe).toHaveBeenCalledWith(30);
  });
});
