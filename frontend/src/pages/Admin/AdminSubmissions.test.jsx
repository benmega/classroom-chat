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

    // Test input change
    const input = screen.getByPlaceholderText(/optional note/i);
    fireEvent.change(input, { target: { value: 'Good job!' } });

    // Test approve
    client.post.mockResolvedValueOnce({ data: { status: 'success' } });
    fireEvent.click(screen.getByTitle(/Mark Reviewed/i));

    // Test delete
    showConfirm.mockResolvedValue(true);
    client.delete.mockResolvedValueOnce({ data: { status: 'success' } });
    fireEvent.click(screen.getByTitle(/Delete/i));
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
});
