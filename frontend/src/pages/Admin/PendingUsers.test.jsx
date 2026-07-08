import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import PendingUsers from './PendingUsers';

// Mock the API client
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

const pendingUsersResponse = {
  data: {
    status: 'success',
    data: {
      users: [
        { id: 10, username: 'newuser1', nickname: 'New User 1' },
        { id: 11, username: 'newuser2', nickname: 'New User 2' },
      ],
    },
  },
};

const emptyPendingResponse = {
  data: { status: 'success', data: { users: [] } },
};

const renderComponent = () => renderWithProviders(<PendingUsers />);

describe('PendingUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it('shows loading state while pending users request is in flight', () => {
    client.get.mockImplementation(() => new Promise(() => {}));
    renderComponent();
    expect(screen.getByText(/Loading Account Approvals/i)).toBeInTheDocument();
  });

  it('renders pending users after loading', async () => {
    client.get.mockImplementation((url) => {
      if (url.includes('pending_users')) return Promise.resolve(pendingUsersResponse);
      return Promise.resolve(emptyPendingResponse);
    });

    renderComponent();

    await waitFor(() => expect(screen.getAllByText('newuser1')[0]).toBeInTheDocument());
    expect(screen.getAllByText('newuser2')[0]).toBeInTheDocument();
  });

  it('renders "No Pending Signups" empty state when users list is empty', async () => {
    client.get.mockImplementation((url) => {
      if (url.includes('pending_users')) return Promise.resolve(emptyPendingResponse);
      return Promise.resolve(emptyPendingResponse);
    });

    renderComponent();

    await waitFor(() => expect(screen.getByText('No Pending Signups')).toBeInTheDocument());
  });

  it('approves a user and removes them from the list', async () => {
    client.get.mockImplementation((url) => {
      if (url.includes('pending_users')) return Promise.resolve(pendingUsersResponse);
      return Promise.resolve(emptyPendingResponse);
    });
    client.post.mockResolvedValue({
      data: { status: 'success', data: { message: 'User approved!' } },
    });

    renderComponent();
    await waitFor(() => expect(screen.getAllByText('newuser1')[0]).toBeInTheDocument());

    const approveButtons = screen.getAllByText(/Approve Account/i);
    fireEvent.click(approveButtons[0]);

    await waitFor(() =>
      expect(client.post).toHaveBeenCalledWith('/api/admin/approve_user/10')
    );
    await waitFor(() => expect(screen.queryAllByText('newuser1').length).toBe(0));
  });

  it('rejects a user after confirmation', async () => {
    client.get.mockImplementation((url) => {
      if (url.includes('pending_users')) return Promise.resolve(pendingUsersResponse);
      return Promise.resolve(emptyPendingResponse);
    });
    client.post.mockResolvedValue({
      data: { status: 'success', data: { message: 'User rejected!' } },
    });

    renderComponent();
    await waitFor(() => expect(screen.getAllByText('newuser1')[0]).toBeInTheDocument());

    const rejectButtons = screen.getAllByText(/Reject/i);
    fireEvent.click(rejectButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() =>
      expect(client.post).toHaveBeenCalledWith('/api/admin/reject_user/10')
    );
    await waitFor(() => expect(screen.queryAllByText('newuser1').length).toBe(0));
  });

  it('does not reject user if confirmation is cancelled', async () => {
    window.confirm = vi.fn(() => false);
    client.get.mockImplementation((url) => {
      if (url.includes('pending_users')) return Promise.resolve(pendingUsersResponse);
      return Promise.resolve(emptyPendingResponse);
    });

    renderComponent();
    await waitFor(() => expect(screen.getAllByText('newuser1')[0]).toBeInTheDocument());

    const rejectButtons = screen.getAllByText(/Reject/i);
    fireEvent.click(rejectButtons[0]);

    expect(client.post).not.toHaveBeenCalled();
    expect(screen.getAllByText('newuser1')[0]).toBeInTheDocument();
  });

  it('shows Account Approvals heading', async () => {
    client.get.mockImplementation(() => Promise.resolve(emptyPendingResponse));

    renderComponent();
    await waitFor(() => expect(screen.getByText('Account Approvals')).toBeInTheDocument());
  });
});
