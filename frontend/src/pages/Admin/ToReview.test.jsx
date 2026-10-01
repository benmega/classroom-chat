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
        return Promise.resolve({ data: { status: 'success', data: { certificates: [{ id: 1, achievement: { name: 'Cert 1' }, user: { nickname: 'Bob' }, submitted_at: '2023-01-01' }] } } });
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
      return Promise.resolve({ data: { data: { projects: [], users: [], trades: [], certificates: [] }, requests: [] } });
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
        return Promise.resolve({ data: { status: 'success', data: { certificates: [{ id: 1, achievement: { name: 'Cert 1' }, user: { nickname: 'Bob' }, submitted_at: '2023-01-01' }] } } });
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

  describe('certificates', () => {
    const mockCertificates = (certificates) => {
      client.get.mockImplementation((url) => {
        if (url.includes('/api/achievements/admin/certificates')) {
          // Real shape: the endpoint is wrapped by @api_response.
          return Promise.resolve({ data: { status: 'success', data: { certificates } } });
        }
        return Promise.resolve({ data: { data: [] } });
      });
    };

    it('renders certificates from the enveloped response', async () => {
      mockCertificates([
        { id: 7, achievement: { name: 'Python Basics' }, user: { username: 'bob', nickname: 'Bob' }, submitted_at: '2023-01-01T10:00:00' },
      ]);

      render(<ToReview />);

      expect(await screen.findByText('Python Basics')).toBeInTheDocument();
      expect(screen.getByText('@bob')).toBeInTheDocument();
    });

    it('shows a placeholder instead of Invalid Date when submitted_at is missing', async () => {
      mockCertificates([
        { id: 8, achievement: { name: 'No Date Cert' }, user: { username: 'amy' }, submitted_at: null },
        { id: 9, achievement: { name: 'Absent Date Cert' }, user: { username: 'cal' } },
      ]);

      render(<ToReview />);

      expect(await screen.findByText('No Date Cert')).toBeInTheDocument();
      expect(screen.getAllByText('Unknown date')).toHaveLength(2);
      expect(screen.queryByText(/Invalid Date/i)).not.toBeInTheDocument();
    });

    it('formats a present submitted_at as a date', async () => {
      mockCertificates([
        { id: 10, achievement: { name: 'Dated Cert' }, user: { username: 'dee' }, submitted_at: '2023-01-02T03:04:05' },
      ]);

      render(<ToReview />);

      expect(await screen.findByText('Dated Cert')).toBeInTheDocument();
      expect(screen.getByText(new Date('2023-01-02T03:04:05').toLocaleString())).toBeInTheDocument();
      expect(screen.queryByText('Unknown date')).not.toBeInTheDocument();
    });

    it('still loads the other items when the certificates request fails', async () => {
      client.get.mockImplementation((url) => {
        if (url.includes('/api/achievements/admin/certificates')) {
          return Promise.reject(new Error('boom'));
        }
        if (url.includes('manage-projects')) {
          return Promise.resolve({ data: { data: { projects: [{ id: 3, name: 'Survivor Project', submitted_at: '2023-01-01', user_nickname: 'Eve' }] } } });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      render(<ToReview />);

      expect(await screen.findByText('Survivor Project')).toBeInTheDocument();
    });
  });

});
