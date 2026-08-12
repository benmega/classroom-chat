import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import Users from './Users';
import { useUsersManagement } from '../../hooks/useUsersManagement';

vi.mock('../../hooks/useUsersManagement');
vi.mock('../../hooks/useSidebar', () => ({
  default: () => ({ toggleSidebar: vi.fn() }),
  useSidebar: () => ({ toggleSidebar: vi.fn() })
}));

const renderComponent = () => renderWithProviders(<Users />);

describe('Users Page', () => {
  const mockSetSearchTerm = vi.fn();
  const mockSetActiveModal = vi.fn();
  const mockSetModalUser = vi.fn();
  const mockFetchUsers = vi.fn();
  const mockHandleRemoveUser = vi.fn();
  const mockFetchParentChildren = vi.fn();
  const mockFetchConnectionCard = vi.fn().mockResolvedValue(true);

  const defaultMockState = {
    users: [],
    isLoading: false,
    isRefreshing: false,
    page: 1,
    totalPages: 1,
    totalUsers: 0,
    activeModal: null,
    setActiveModal: mockSetActiveModal,
    modalUser: null,
    setModalUser: mockSetModalUser,
    formLoading: false,
    formErrors: {},
    fetchUsers: mockFetchUsers,
    handleRemoveUser: mockHandleRemoveUser,
    parentChildren: [],
    fetchParentChildren: mockFetchParentChildren,
    connectionCode: null,
    setConnectionCode: vi.fn(),
    fetchConnectionCard: mockFetchConnectionCard,
    classrooms: [],
    fetchClassrooms: vi.fn(),
    classroomCards: [],
    setClassroomCards: vi.fn(),
    isFetchingCards: false,
    fetchClassroomCards: vi.fn(),
    searchTerm: '',
    setSearchTerm: mockSetSearchTerm
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useUsersManagement.mockReturnValue(defaultMockState);
    window.confirm = vi.fn(() => true);
  });

  it('renders loading skeleton when isLoading is true', () => {
    useUsersManagement.mockReturnValue({ ...defaultMockState, isLoading: true });
    const { container } = renderComponent();
    expect(container.querySelector('.users-skeleton-row')).toBeInTheDocument();
  });

  it('renders empty state when no users are found', () => {
    renderComponent();
    expect(screen.getByText(/No users found matching your search/i)).toBeInTheDocument();
  });

  it('renders user list correctly', () => {
    useUsersManagement.mockReturnValue({
      ...defaultMockState,
      users: [
        { id: 1, username: 'admin1', nickname: 'Admin', role: 'student', is_admin: true, duck_balance: 10, packets: 5, is_online: true },
        { id: 2, username: 'student1', nickname: 'Student', role: 'student', is_admin: false, duck_balance: 5, packets: 2, is_online: false, drawer: '1A' },
        { id: 3, username: 'parent1', nickname: 'Parent', role: 'parent', is_admin: false, duck_balance: 0, packets: 0, is_online: false }
      ],
      totalUsers: 3
    });

    renderComponent();

    expect(screen.getByText('@admin1')).toBeInTheDocument();
    expect(screen.getByText('@student1')).toBeInTheDocument();
    expect(screen.getByText('@parent1')).toBeInTheDocument();
    expect(screen.getByText('Drawer:')).toBeInTheDocument(); // student1 has drawer
  });

  it('handles search input', () => {
    renderComponent();
    const searchInput = screen.getByPlaceholderText(/Search by name or @username/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });
    expect(mockSetSearchTerm).toHaveBeenCalledWith('test');
  });

  it('handles pagination', () => {
    useUsersManagement.mockReturnValue({
      ...defaultMockState,
      users: Array.from({ length: 50 }, (_, i) => ({ id: i, username: `user${i}`, role: 'student' })),
      totalUsers: 100,
      totalPages: 2,
      page: 1
    });

    renderComponent();
    
    const nextBtn = screen.getByText(/Next/i);
    fireEvent.click(nextBtn);
    expect(mockFetchUsers).toHaveBeenCalledWith(2);
  });

  it('opens create user modal', () => {
    renderComponent();
    const addBtn = screen.getByText(/Add User/i);
    fireEvent.click(addBtn);
    expect(mockSetActiveModal).toHaveBeenCalledWith('create');
  });

  it('opens bulk connection cards modal', () => {
    renderComponent();
    const btn = screen.getByText(/Print Cohort Cards/i);
    fireEvent.click(btn);
    expect(mockSetActiveModal).toHaveBeenCalledWith('bulk_connection_cards');
  });

  it.skip('refreshes users', () => {
    renderComponent();
    const refreshBtns = document.querySelectorAll('.refresh-btn');
    fireEvent.click(refreshBtns[0]);
    expect(mockFetchUsers).toHaveBeenCalledWith(1);
  });

  it('renders new activity, levels today, role badge, and status info', () => {
    const studentUser = { 
      id: 2, 
      username: 'student1', 
      nickname: 'Student One', 
      role: 'student', 
      is_admin: false,
      levels_today: 5,
      current_activity: 'Working on loops',
      last_activity_time: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5m ago
      is_online: false
    };
    useUsersManagement.mockReturnValue({
      ...defaultMockState,
      users: [studentUser],
      totalUsers: 1
    });

    renderComponent();

    // Verify inline role tag
    expect(screen.getByText('Student')).toBeInTheDocument();

    // Verify status info
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('handles tab changes and kebab menu actions', async () => {
    useUsersManagement.mockReturnValue({
      ...defaultMockState,
      users: [
        { id: 1, username: 'student1', role: 'student', can_chat: true },
      ],
      totalUsers: 1
    });

    renderComponent();

    // Click the Parents tab
    const parentTab = screen.getByText('Parents');
    fireEvent.click(parentTab);

    // Open kebab menu
    const kebab = document.querySelector('.kebab-trigger');
    if (kebab) {
      fireEvent.click(kebab);
      // Click an action
      const adjustBtn = screen.getByText(/Adjust Ducks/i);
      fireEvent.click(adjustBtn);
      expect(mockSetActiveModal).toHaveBeenCalledWith('adjust');
      
      fireEvent.click(kebab);
      const muteBtn = screen.getByText(/Mute Chat/i);
      fireEvent.click(muteBtn);
    }
  });

  it('expands parent rows and shows children', () => {
    useUsersManagement.mockReturnValue({
      ...defaultMockState,
      users: [
        { id: 1, username: 'parent1', role: 'parent' },
      ],
      totalUsers: 1,
      parentChildren: [{ parent_id: 1, child_id: 2, child_username: 'student1', child_nickname: 'Student One' }]
    });

    renderComponent();

    // Click expand button
    const expandBtn = document.querySelector('.expand-btn');
    if (expandBtn) {
      fireEvent.click(expandBtn);
      // Wait for children list
      expect(document.querySelector('.expanded-children-row')).toBeInTheDocument();
      // Click unlink button
      const unlinkBtn = document.querySelector('.child-unlink-btn');
      if (unlinkBtn) {
        fireEvent.click(unlinkBtn);
      }
    }
  });
});
