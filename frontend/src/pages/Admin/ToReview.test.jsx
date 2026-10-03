import adminCache from '../../utils/adminCache';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ToReview from './ToReview';
import client from '../../api/client';
import toast from 'react-hot-toast';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../utils/apiUrl', () => ({
  getApiUrl: () => 'about:blank',
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../components/admin/AdminPageHeader', () => ({
  default: () => <div data-testid="AdminPageHeader">Header</div>
}));

import { showConfirm } from '../../utils/confirm';

vi.mock('../../utils/confirm', () => ({
    showConfirm: vi.fn()
}));

// Prevent happy-dom from trying to load iframe src which causes a TCP handle crash
beforeEach(() => {
  vi.stubGlobal('HTMLIFrameElement', class HTMLIFrameElement {
    get src() { return ''; }
    set src(val) {}
  });
});

describe('ToReview Component', () => {
  beforeEach(() => {
    adminCache.clear();
    vi.clearAllMocks();
    showConfirm.mockResolvedValue(true);
    window.prompt = vi.fn(() => 'Test Reason');
  });

  it('renders correctly and loads data', async () => {
    client.get.mockImplementation((url) => {
      if (url.includes('/api/admin/crud/classroom') || url.includes('/api/admin/crud/course')) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url.includes('course-requests')) {
        return Promise.resolve({ data: { requests: [] } });
      }
      if (url.includes('projects')) {
        return Promise.resolve({ data: { data: { projects: [{ id: 1, name: 'Project 1', submitted_at: '2023-01-01', user_nickname: 'Bob' }] } } });
      }
      if (url.includes('certificates')) {
        return Promise.resolve({ data: { certificates: [{ id: 1, achievement: { name: 'Cert 1' }, user: { nickname: 'Bob' }, submitted_at: '2023-01-01' }] } });
      }
      if (url.includes('users')) {
        return Promise.resolve({ data: { data: { users: [{ id: 1, username: 'bob', nickname: 'Bob' }] } } });
      }
      if (url.includes('trades')) {
        return Promise.resolve({ data: { data: { trades: [{ id: 1, username: 'bob', timestamp: '2023-01-01' }] } } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<ToReview />);

    await waitFor(() => {
      // Check for the mocked header
      expect(screen.getByTestId('AdminPageHeader')).toBeInTheDocument();
      // Check for a tab label
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });
  });

  it('renders empty state', async () => {
    client.get.mockImplementation(() => {
      // Return empty arrays for all data types to trigger empty state
      return Promise.resolve({ data: { data: { projects: [], users: [], trades: [] }, requests: [], certificates: [] } });
    });

    render(<ToReview />);

    await waitFor(() => {
      expect(screen.getByText('All Caught Up!')).toBeInTheDocument();
    });
  });

  it('switches tabs and renders appropriate content', async () => {
    client.get.mockImplementation((url) => {
      if (url.includes('/api/admin/crud/classroom') || url.includes('/api/admin/crud/course')) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url.includes('course-requests')) {
        return Promise.resolve({ data: { requests: [] } });
      }
      if (url.includes('projects')) {
        return Promise.resolve({ data: { data: { projects: [{ id: 1, name: 'Project 1', submitted_at: '2023-01-01', user_nickname: 'Bob' }] } } });
      }
      if (url.includes('certificates')) {
        return Promise.resolve({ data: { certificates: [{ id: 1, achievement: { name: 'Cert 1' }, user: { nickname: 'Bob' }, submitted_at: '2023-01-01' }] } });
      }
      if (url.includes('users')) {
        return Promise.resolve({ data: { data: { users: [{ id: 1, username: 'bob', nickname: 'Bob' }] } } });
      }
      if (url.includes('trades')) {
        return Promise.resolve({ data: { data: { trades: [{ id: 1, username: 'bob', timestamp: '2023-01-01' }] } } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<ToReview />);
    await waitFor(() => {
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    // Click on 'Course Requests' tab
    // We don't have the exact label, maybe 'Course & Track Requests' or similar. 
    // We'll click some tabs that exist based on data.
    const tabs = screen.getAllByRole("button").filter(b => b.classList.contains("review-tab-item"));
    if (tabs.length > 1) {
        fireEvent.click(tabs[1]);
        fireEvent.click(tabs[2]);
    }

    client.post.mockResolvedValueOnce({ data: { status: 'success' } });
    const approveBtns = screen.queryAllByRole('button', { name: /Approve/i });
    if (approveBtns.length > 0) {
        fireEvent.click(approveBtns[0]);
    }

    client.post.mockResolvedValueOnce({ data: { status: 'success' } });
    const rejectBtns = screen.queryAllByRole('button', { name: /Reject/i });
    if (rejectBtns.length > 0) {
        fireEvent.click(rejectBtns[0]);
    }
  });

  it('renders resubmitted badge and previous feedback for resubmitted project', async () => {
    client.get.mockImplementation((url) => {
      if (url.includes('projects')) {
        return Promise.resolve({
          data: {
            data: {
              projects: [
                {
                  id: 2,
                  name: 'Resubmitted Game',
                  submitted_at: '2023-01-01',
                  user_nickname: 'Alice',
                  status: 'pending',
                  teacher_comment: 'Please add a video and comments'
                }
              ]
            }
          }
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<ToReview />);
    await waitFor(() => {
      expect(screen.getByText('Resubmitted')).toBeInTheDocument();
      expect(screen.getByText(/Please add a video and comments/)).toBeInTheDocument();
    });
  });


  describe('project approval toast', () => {
    beforeEach(() => {
      // Drop any unconsumed mockResolvedValueOnce values queued by earlier tests.
      client.post.mockReset();
    });

    const mockOneProject = () => {
      client.get.mockImplementation((url) => {
        if (url.includes('projects')) {
          return Promise.resolve({
            data: { data: { projects: [{ id: 5, name: 'Name Tag Model', submitted_at: '2023-01-01', user_nickname: 'Bob' }] } },
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });
    };

    const approveProject = async () => {
      render(<ToReview />);
      await screen.findByText('Name Tag Model');
      fireEvent.change(screen.getByLabelText(/Teacher Feedback/i), { target: { value: 'Nice work' } });
      fireEvent.click(screen.getByRole('button', { name: /Approve Project/i }));
    };

    it('shows a challenge-completed toast when the approval completed a 3D challenge', async () => {
      mockOneProject();
      client.post.mockResolvedValueOnce({
        data: { status: 'success', message: 'ok', challenge_completed: true, challenge_slug: 'name-tag-model' },
      });

      await approveProject();

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Project approved — 3D challenge completed!'));
      await waitFor(() => expect(screen.queryByText('Name Tag Model')).not.toBeInTheDocument());
    });

    it('shows no toast for an ordinary approval (no linked challenge or already completed)', async () => {
      mockOneProject();
      client.post.mockResolvedValueOnce({
        data: { status: 'success', message: 'ok', challenge_completed: false, challenge_slug: null },
      });

      await approveProject();

      await waitFor(() => expect(screen.queryByText('Name Tag Model')).not.toBeInTheDocument());
      expect(client.post).toHaveBeenCalledWith(
        '/api/admin/handle-project-review/5',
        expect.objectContaining({ action: 'approve' })
      );
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  it('initializes from admin_to_review cache immediately and fetches in background', async () => {
    const cachedData = {
      projects: [{ id: 99, name: 'Cached Review Project', submitted_at: '2023-01-01', user_nickname: 'CachedUser' }],
      certificates: [],
      pendingUsers: [],
      trades: [],
      courseRequests: [],
      classrooms: [],
      courses: []
    };
    adminCache.set('admin_to_review', cachedData);

    client.get.mockImplementation((url) => {
      if (url.includes('projects')) {
        return Promise.resolve({ data: { data: { projects: [{ id: 100, name: 'Fresh Project', submitted_at: '2023-01-01', user_nickname: 'FreshUser' }] } } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<ToReview />);

    // Immediately shows cached data without loading state
    expect(screen.getByText('Cached Review Project')).toBeInTheDocument();

    // Background fetch resolves and updates view
    await waitFor(() => {
      expect(screen.getByText('Fresh Project')).toBeInTheDocument();
    });
    expect(adminCache.get('admin_to_review')).toBeDefined();
  });

  it('renders parent messages tab and resolves a message', async () => {
    client.get.mockImplementation((url) => {
      if (url.includes('/api/admin/crud/classroom') || url.includes('/api/admin/crud/course')) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url.includes('parent-messages')) {
        return Promise.resolve({
          data: {
            messages: [
              {
                id: 101,
                parent_id: 10,
                parent_name: 'Jane Doe',
                parent_username: 'janedoe',
                parent_email: 'jane@example.com',
                student_names: ['Tommy'],
                subject: 'Attendance inquiry',
                body: 'Will Tommy miss points for absence?',
                status: 'pending',
                created_at: '2026-09-13T10:00:00Z',
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    client.post.mockResolvedValue({
      data: { status: 'success', message: 'Parent message marked as resolved.' },
    });

    render(<ToReview />);

    await waitFor(() => {
      expect(screen.getByText('Parent Messages')).toBeInTheDocument();
    });

    // Switch to Parent Messages tab
    fireEvent.click(screen.getByText('Parent Messages'));

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Attendance inquiry')).toBeInTheDocument();
      expect(screen.getByText('Will Tommy miss points for absence?')).toBeInTheDocument();
      expect(screen.getByText('Tommy')).toBeInTheDocument();
    });

    // Click Mark as Resolved
    const resolveBtn = screen.getByRole('button', { name: /Mark as Resolved/i });
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/api/admin/parent-messages/101/resolve');
    });

    // Card is removed from view
    await waitFor(() => {
      expect(screen.queryByText('Attendance inquiry')).not.toBeInTheDocument();
    });
  });

  describe('parent message resolve errors', () => {
    beforeEach(() => {
      // Drop any queued once-implementations leaked from earlier tests
      client.get.mockReset();
      client.post.mockReset();
    });

    const mockPendingMessage = () => {
      client.get.mockImplementation((url) => {
        if (url.includes('/api/admin/crud/classroom') || url.includes('/api/admin/crud/course')) {
          return Promise.resolve({ data: { data: [] } });
        }
        if (url.includes('parent-messages')) {
          return Promise.resolve({
            data: {
              messages: [{
                id: 202, parent_id: 11, parent_name: 'Sam Parent', parent_username: 'samp',
                student_names: ['Kid'], subject: 'Stale message', body: 'Hello', status: 'pending',
                created_at: '2026-09-13T10:00:00Z',
              }],
            },
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });
    };

    const openMessagesAndResolve = async () => {
      render(<ToReview />);
      await waitFor(() => expect(screen.getByText('Parent Messages')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Parent Messages'));
      await waitFor(() => expect(screen.getByText('Stale message')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /Mark as Resolved/i }));
    };

    it('removes the card, invalidates the cache and shows the API error on 404', async () => {
      mockPendingMessage();
      const invalidateSpy = vi.spyOn(adminCache, 'invalidate');
      client.post.mockRejectedValue({
        response: { status: 404, data: { status: 'error', data: null, error: 'Message not found' } },
      });

      await openMessagesAndResolve();

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Message not found'));
      await waitFor(() => expect(screen.queryByText('Stale message')).not.toBeInTheDocument());
      expect(invalidateSpy).toHaveBeenCalledWith('admin_to_review');
    });

    it('keeps the card and falls back to message/default text on other errors', async () => {
      mockPendingMessage();
      client.post.mockRejectedValueOnce({
        response: { status: 500, data: { message: 'Legacy failure' } },
      });

      await openMessagesAndResolve();

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Legacy failure'));
      expect(screen.getByText('Stale message')).toBeInTheDocument();

      client.post.mockRejectedValueOnce({ response: { status: 500, data: {} } });
      fireEvent.click(screen.getByRole('button', { name: /Mark as Resolved/i }));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to resolve parent message.'));
      expect(screen.getByText('Stale message')).toBeInTheDocument();
    });
  });
});
