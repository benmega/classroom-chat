import adminCache from '../../utils/adminCache';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminSubmissions from './AdminSubmissions';
import client from '../../api/client';
import toast from 'react-hot-toast';


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

  describe('failed actions', () => {
    beforeEach(() => {
      // The test above leaves unconsumed one-shot responses behind.
      client.get.mockReset();
      client.post.mockReset();
      client.delete.mockReset();
    });

    const pendingSubmission = {
      id: 1,
      username: 'testuser',
      nickname: 'Test User',
      status: 'pending',
      timestamp: '2023-01-01T00:00:00Z',
      original_filename: 'test.pdf',
      file_size: 1024,
    };
    // Both routes are wrapped by @api_response, which answers a failure with a string `error`.
    const notFound = { response: { status: 404, data: { status: 'error', data: null, error: 'Submission not found' } } };

    const renderPending = async () => {
      client.get.mockResolvedValueOnce({ data: { status: 'success', data: { submissions: [pendingSubmission] } } });
      render(<AdminSubmissions />);
      await waitFor(() => expect(screen.getByText('test.pdf')).toBeInTheDocument());
    };

    it('shows the reason the server gives when a submission cannot be marked reviewed', async () => {
      await renderPending();
      client.post.mockRejectedValueOnce(notFound);

      fireEvent.click(screen.getByTitle(/Mark Reviewed/i));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Submission not found'));
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    it('shows the reason the server gives when a submission cannot be deleted', async () => {
      await renderPending();
      showConfirm.mockResolvedValue(true);
      client.delete.mockRejectedValueOnce(notFound);

      fireEvent.click(screen.getByTitle(/Delete/i));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Submission not found'));
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
  });

  describe('accessible names', () => {
    beforeEach(() => {
      client.get.mockReset();
    });

    const submission = (overrides) => ({
      id: 1,
      username: 'testuser',
      nickname: 'Test User',
      status: 'pending',
      timestamp: '2023-01-01T00:00:00Z',
      original_filename: 'test.pdf',
      file_size: 1024,
      ...overrides,
    });

    it('names the note box, and the download, review and delete icon buttons, after the submission', async () => {
      client.get.mockResolvedValueOnce({ data: { status: 'success', data: { submissions: [submission()] } } });

      render(<AdminSubmissions />);

      expect(await screen.findByRole('textbox', { name: 'Note back to Test User' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Download test.pdf' })).toHaveAttribute('href', expect.stringContaining('/api/admin/submissions/1/download'));
      expect(screen.getByRole('button', { name: 'Mark test.pdf as reviewed' })).toHaveAttribute('type', 'button');
      expect(screen.getByRole('button', { name: 'Delete test.pdf' })).toHaveAttribute('type', 'button');
    });

    it('falls back to the username in the note box name, and has no note box or review button once reviewed', async () => {
      client.get.mockResolvedValueOnce({
        data: { status: 'success', data: { submissions: [
          submission({ id: 1, nickname: '' }),
          submission({ id: 2, status: 'reviewed', original_filename: 'done.pdf' }),
        ] } },
      });

      render(<AdminSubmissions />);

      expect(await screen.findByRole('textbox', { name: 'Note back to testuser' })).toBeInTheDocument();
      expect(screen.getAllByRole('textbox')).toHaveLength(1);
      expect(screen.queryByRole('button', { name: 'Mark done.pdf as reviewed' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete done.pdf' })).toBeInTheDocument();
    });
  });
});
