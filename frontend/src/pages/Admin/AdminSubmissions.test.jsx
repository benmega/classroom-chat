import adminCache from '../../utils/adminCache';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminSubmissions from './AdminSubmissions';
import client from '../../api/client';


import { showConfirm } from '../../utils/confirm';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../utils/confirm', () => ({
    showConfirm: vi.fn()
}));

vi.mock('../../components/admin/AdminPageHeader', () => ({
  default: () => <div data-testid="AdminPageHeader">Header</div>
}));

describe('AdminSubmissions Component', () => {
  beforeEach(() => {
    adminCache.clear();
    vi.clearAllMocks();
  });

  it('renders loading skeleton and then empty state', async () => {
    client.get.mockResolvedValueOnce({
      data: { status: 'success', data: { submissions: [] } },
    });

    render(<AdminSubmissions />);

    await waitFor(() => {
      expect(screen.getByText('No Submissions')).toBeInTheDocument();
    });
  });

  it('renders submissions list', async () => {
    client.get.mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          submissions: [
            {
              id: 1,
              username: 'testuser',
              nickname: 'Test User',
              status: 'pending',
              timestamp: '2023-01-01T00:00:00Z',
              original_filename: 'test.pdf',
              file_size: 1024,
              note: 'Here is my file',
            },
          ],
        },
      },
    });

    render(<AdminSubmissions />);

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText('Here is my file')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/optional note/i);
    fireEvent.change(input, { target: { value: 'Good job!' } });

    client.post.mockResolvedValueOnce({ data: { status: 'success' } });
    fireEvent.click(screen.getByTitle(/Mark Reviewed/i));

    showConfirm.mockResolvedValue(true);
    client.delete.mockResolvedValueOnce({ data: { status: 'success' } });
    fireEvent.click(screen.getByTitle(/Delete/i));
  });

  it('initializes from admin_submissions cache immediately and fetches in background', async () => {
    const cachedSubmissions = [
      {
        id: 999,
        username: 'cachedstudent',
        nickname: 'Cached Student',
        status: 'pending',
        timestamp: '2023-01-01T00:00:00Z',
        original_filename: 'cached.py',
        file_size: 512,
        note: 'Cached note',
      }
    ];
    adminCache.set('admin_submissions_pending', cachedSubmissions);

    client.get.mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          submissions: [
            {
              id: 1000,
              username: 'freshstudent',
              nickname: 'Fresh Student',
              status: 'pending',
              timestamp: '2023-01-01T00:00:00Z',
              original_filename: 'fresh.py',
              file_size: 1024,
              note: 'Fresh note',
            }
          ]
        }
      }
    });

    render(<AdminSubmissions />);

    expect(screen.getByText('cached.py')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('fresh.py')).toBeInTheDocument();
    });
    expect(adminCache.get('admin_submissions_pending')).toBeDefined();
  });

});
