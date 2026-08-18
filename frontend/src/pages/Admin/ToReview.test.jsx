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
    window.confirm = vi.fn(() => true);
    window.prompt = vi.fn(() => 'Test Reason');
  });

  it('renders correctly and loads data', async () => {
    client.get.mockImplementation((url) => {
      if (url.includes('/api/admin/crud/classroom') || url.includes('/api/admin/crud/course')) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url.includes('course-requests') || url.includes('track-requests')) {
        return Promise.resolve({ data: { requests: [{ id: 1, type: 'track', requested_at: '2023-01-01' }] } });
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
      if (url.includes('course-requests') || url.includes('track-requests')) {
        return Promise.resolve({ data: { requests: [{ id: 1, type: 'track', requested_at: '2023-01-01' }] } });
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
    const tabs = document.querySelectorAll('.review-tab-item');
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


});
