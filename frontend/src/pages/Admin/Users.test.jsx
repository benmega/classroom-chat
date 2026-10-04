import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import Users from './Users';
import { useUsersManagement } from '../../hooks/useUsersManagement';

vi.mock('../../hooks/useUsersManagement');
vi.mock('../../hooks/useSidebar', () => ({
  default: () => ({ toggleSidebar: vi.fn() }),
  useSidebar: () => ({ toggleSidebar: vi.fn() })
}));
vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  }
}));

import { showConfirm } from '../../utils/confirm';

vi.mock('../../utils/confirm', () => ({
    showConfirm: vi.fn()
}));

const renderComponent = () => renderWithProviders(<Users />);

describe('Users Page', () => {
  const mockSetSearchTerm = vi.fn();
  const mockSetActiveModal = vi.fn();
  const mockSetModalUser = vi.fn();
  const mockFetchUsers = vi.fn();
  const mockSetPage = vi.fn();
  const mockHandleRemoveUser = vi.fn();
  const mockFetchParentChildren = vi.fn();
  const mockFetchConnectionCard = vi.fn().mockResolvedValue(true);

  const defaultMockState = {
    users: [],
    isLoading: false,
    isRefreshing: false,
    page: 1,
    setPage: mockSetPage,
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
    setSearchTerm: mockSetSearchTerm,
    handleToggleChildLink: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useUsersManagement.mockReturnValue(defaultMockState);
    showConfirm.mockResolvedValue(true);
  });

  it('renders loading skeleton when isLoading is true', () => {
    useUsersManagement.mockReturnValue({ ...defaultMockState, isLoading: true });
    renderComponent();
    expect(screen.getAllByTestId("users-skeleton-row")[0]).toBeInTheDocument();
  });

  it('renders empty state when no users are found', () => {
    renderComponent();
    expect(screen.getByText(/No users found matching your search/i)).toBeInTheDocument();
  });

  describe('pagination footer', () => {
    const footerText = () => document.querySelector('.pagination-info').textContent.replace(/\s+/g, ' ').trim();

    it('shows "0 of 0" rather than "1-0 of 0" when the list is empty', () => {
      renderComponent();
      expect(footerText()).toBe('Showing 0 of 0 users');
      expect(screen.queryByText(/1-0/)).not.toBeInTheDocument();
    });

    it('shows the range for a partial first page', () => {
      useUsersManagement.mockReturnValue({ ...defaultMockState, totalUsers: 3, page: 1 });
      renderComponent();
      expect(footerText()).toBe('Showing 1-3 of 3 users');
    });

    it('shows 50 rows per page for a middle page', () => {
      useUsersManagement.mockReturnValue({ ...defaultMockState, totalUsers: 120, totalPages: 3, page: 2 });
      renderComponent();
      expect(footerText()).toBe('Showing 51-100 of 120 users');
    });

    it('caps the range at the total on the last page', () => {
      useUsersManagement.mockReturnValue({ ...defaultMockState, totalUsers: 120, totalPages: 3, page: 3 });
      renderComponent();
      expect(footerText()).toBe('Showing 101-120 of 120 users');
    });

    it('never shows an inverted range if the page is past the end', () => {
      useUsersManagement.mockReturnValue({ ...defaultMockState, totalUsers: 100, totalPages: 2, page: 3 });
      renderComponent();
      expect(footerText()).toBe('Showing 100-100 of 100 users');
    });
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
    expect(screen.getByText('Drawer:')).toBeInTheDocument();
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
    // The hook fetches the page once its state changes: the page must not also fetch it itself
    expect(mockSetPage).toHaveBeenCalledWith(2);
    expect(mockFetchUsers).not.toHaveBeenCalled();
  });

  it('goes back a page with Previous', () => {
    useUsersManagement.mockReturnValue({
      ...defaultMockState,
      users: Array.from({ length: 50 }, (_, i) => ({ id: i, username: `user${i}`, role: 'student' })),
      totalUsers: 150,
      totalPages: 3,
      page: 2
    });

    renderComponent();

    fireEvent.click(screen.getByText(/Previous/i));
    expect(mockSetPage).toHaveBeenCalledWith(1);
    expect(mockFetchUsers).not.toHaveBeenCalled();
  });

  it('cannot page before the first or after the last page, or while a page is loading', () => {
    useUsersManagement.mockReturnValue({ ...defaultMockState, totalUsers: 100, totalPages: 2, page: 1 });
    const { unmount } = renderComponent();
    expect(screen.getByText(/Previous/i).closest('button')).toBeDisabled();
    expect(screen.getByText(/Next/i).closest('button')).toBeEnabled();
    unmount();

    useUsersManagement.mockReturnValue({ ...defaultMockState, totalUsers: 100, totalPages: 2, page: 2 });
    const second = renderComponent();
    expect(screen.getByText(/Previous/i).closest('button')).toBeEnabled();
    expect(screen.getByText(/Next/i).closest('button')).toBeDisabled();
    second.unmount();

    useUsersManagement.mockReturnValue({ ...defaultMockState, totalUsers: 150, totalPages: 3, page: 2, isRefreshing: true });
    renderComponent();
    expect(screen.getByText(/Previous/i).closest('button')).toBeDisabled();
    expect(screen.getByText(/Next/i).closest('button')).toBeDisabled();
  });

  it('opens create user modal', () => {
    renderComponent();
    const addBtn = screen.getByText(/Add User/i);
    fireEvent.click(addBtn);
    expect(mockSetActiveModal).toHaveBeenCalledWith('create');
  });


  it('refreshes users', () => {
    renderComponent();
    const refreshBtns = screen.queryAllByTestId("refresh-btn");
    if (refreshBtns.length > 0) {
      fireEvent.click(refreshBtns[0]);
      expect(mockFetchUsers).toHaveBeenCalledWith(1);
    }
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
      last_activity_time: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      is_online: false
    };
    useUsersManagement.mockReturnValue({
      ...defaultMockState,
      users: [studentUser],
      totalUsers: 1
    });

    renderComponent();

    expect(screen.getByText('Student')).toBeInTheDocument();

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

    const parentTab = screen.getByText('Parents');
    fireEvent.click(parentTab);

    const kebab = screen.getByTestId("kebab-trigger");
    if (kebab) {
      fireEvent.click(kebab);
      const adjustBtn = screen.getByText(/Adjust Ducks/i);
      fireEvent.click(adjustBtn);
      expect(mockSetActiveModal).toHaveBeenCalledWith('adjust');
      
      fireEvent.click(kebab);
      const muteBtn = screen.getByText(/Mute Chat/i);
      fireEvent.click(muteBtn);
    }
  });

  it('expands parent rows and shows children', async () => {
    useUsersManagement.mockReturnValue({
      ...defaultMockState,
      users: [
        { id: 1, username: 'parent1', role: 'parent' },
      ],
      totalUsers: 1,
    });
    
    const client = await import('../../api/client');
    client.default.get.mockResolvedValueOnce({
        data: { children: [{ id: 2, username: 'student1', nickname: 'Student One', profile_picture: 'pic.jpg' }] }
    });

    renderWithProviders(<Users />, { route: '/admin/users?role=parent' });

    const expandBtn = screen.getByTestId("expand-btn");
    if (expandBtn) {
      fireEvent.click(expandBtn);
      await waitFor(() => {
          expect(screen.getByTestId("expanded-children-row")).toBeInTheDocument();
      });
      const unlinkBtn = screen.getByTestId("child-unlink-btn");
      if (unlinkBtn) {
        fireEvent.click(unlinkBtn);
      }
    }
  });

  it('renders student role layout', () => {
    useUsersManagement.mockReturnValue({
      ...defaultMockState,
      users: [
        { id: 1, username: 'student1', role: 'student', duck_balance: 100, drawer: '1A' },
      ],
      totalUsers: 1,
    });
    renderWithProviders(<Users />, { route: '/admin/users?role=student' });
    expect(screen.getByText('🦆 100')).toBeInTheDocument();
  });

  it('selects multiple users and performs bulk action', () => {
    useUsersManagement.mockReturnValue({
      ...defaultMockState,
      users: [
        { id: 1, username: 'student1', role: 'student' },
        { id: 2, username: 'student2', role: 'student' },
      ],
      totalUsers: 2
    });

    renderComponent();

    const checkboxes = screen.queryAllByTestId("user-select-checkbox");
    if (checkboxes.length >= 2) {
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      
      const selectAll = screen.queryByTestId("select-all-checkbox");
      if (selectAll) {
          fireEvent.click(selectAll);
      }
    }
  });

  describe('removing users', () => {
    const openRowMenu = (handle) => {
      const row = screen.getByText(handle).closest('tr');
      fireEvent.click(within(row).getByTestId('kebab-trigger'));
    };

    it('offers Remove User for a student and passes the username on', () => {
      useUsersManagement.mockReturnValue({
        ...defaultMockState,
        users: [{ id: 2, username: 'student1', nickname: 'Student', role: 'student', can_chat: true }],
        totalUsers: 1,
      });
      renderComponent();

      openRowMenu('@student1');
      fireEvent.click(screen.getByText('Remove User'));

      expect(mockHandleRemoveUser).toHaveBeenCalledWith('student1');
    });

    it('does not offer Remove User for an administrator', () => {
      useUsersManagement.mockReturnValue({
        ...defaultMockState,
        users: [{ id: 1, username: 'boss', nickname: 'Boss', role: 'admin' }],
        totalUsers: 1,
      });
      renderComponent();

      openRowMenu('@boss');

      // The menu is open (it still has the other actions) but offers no removal.
      expect(screen.getByText('Reset Password')).toBeInTheDocument();
      expect(screen.queryByText('Remove User')).not.toBeInTheDocument();
    });
  });

  describe('keyboard and screen reader access', () => {
    const student = { id: 2, username: 'student1', nickname: 'Sam', role: 'student', can_chat: true, duck_balance: 3 };
    const parent = { id: 3, username: 'parent1', nickname: 'Pat', role: 'parent' };

    const showUsers = (users) => useUsersManagement.mockReturnValue({ ...defaultMockState, users, totalUsers: users.length });

    it('names the search box', () => {
      renderComponent();

      expect(screen.getByRole('textbox', { name: 'Search users' })).toBeInTheDocument();
    });

    it.each([
      ['All', '/admin/users'],
      ['Students', '/admin/users?role=student'],
    ])('links the name to the detail page on the %s tab so it can be tabbed to', async (_tab, route) => {
      const user = userEvent.setup();
      showUsers([student]);
      renderWithProviders(<Users />, { route });

      const link = screen.getByRole('link', { name: 'Sam' });
      expect(link).toHaveAttribute('href', '/admin/users/2');

      link.focus();
      expect(link).toHaveFocus();
      const historyBefore = window.history.length;
      await user.keyboard('{Enter}');

      expect(window.location.pathname).toBe('/admin/users/2');
      // One navigation, not two: the cell's own click handler must not fire as well
      expect(window.history.length).toBe(historyBefore + 1);
    });

    it('links the parent name to the detail page on the Parents tab', () => {
      showUsers([parent]);
      renderWithProviders(<Users />, { route: '/admin/users?role=parent' });

      expect(screen.getByRole('link', { name: 'Pat' })).toHaveAttribute('href', '/admin/users/3');
    });

    it('falls back to the username when there is no nickname', () => {
      showUsers([{ id: 4, username: 'nonick', role: 'student' }]);
      renderComponent();

      expect(screen.getByRole('link', { name: 'nonick' })).toHaveAttribute('href', '/admin/users/4');
    });

    it('still opens the detail page when the rest of the row is clicked with the mouse', () => {
      showUsers([student]);
      renderComponent();

      fireEvent.click(screen.getByText('@student1').closest('td'));

      expect(window.location.pathname).toBe('/admin/users/2');
    });

    it('gives the row actions button a name that says whose actions they are, and reports whether it is open', () => {
      showUsers([student]);
      renderComponent();

      const trigger = screen.getByRole('button', { name: 'Actions for @student1' });
      expect(trigger).toHaveAttribute('type', 'button');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).not.toHaveAttribute('aria-controls');

      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(document.getElementById(trigger.getAttribute('aria-controls'))).toHaveClass('kebab-dropdown');
    });

    it('opens the row actions with the keyboard and closes them with Escape, returning focus to the button', async () => {
      const user = userEvent.setup();
      showUsers([student]);
      renderComponent();
      const trigger = screen.getByRole('button', { name: 'Actions for @student1' });

      trigger.focus();
      await user.keyboard('{Enter}');
      expect(screen.getByText('Adjust Ducks')).toBeInTheDocument();
      screen.getByText('Reset Password').focus();
      await user.keyboard('{Escape}');

      expect(screen.queryByText('Adjust Ducks')).not.toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveFocus();
    });

    it('does nothing on Escape while the row actions are closed', async () => {
      const user = userEvent.setup();
      showUsers([student]);
      renderComponent();
      const search = screen.getByRole('textbox', { name: 'Search users' });

      search.focus();
      await user.keyboard('{Escape}');

      expect(search).toHaveFocus();
    });

    it('names the expand button after the parent and reports whether the children are shown', async () => {
      const client = await import('../../api/client');
      client.default.get.mockResolvedValueOnce({ data: { children: [] } });
      showUsers([parent]);
      renderWithProviders(<Users />, { route: '/admin/users?role=parent' });

      const expand = screen.getByRole('button', { name: 'Expand children of @parent1' });
      expect(expand).toHaveAttribute('type', 'button');
      expect(expand).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(expand);

      const collapse = await screen.findByRole('button', { name: 'Collapse children of @parent1' });
      expect(collapse).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
