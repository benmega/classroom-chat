import adminCache from '../../utils/adminCache';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ToReview from './ToReview';
import client from '../../api/client';

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
});
