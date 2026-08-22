import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminSubmissions from './AdminSubmissions';
import client from '../../api/client';


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
      expect(screen.getByText('Inbox Zero')).toBeInTheDocument();
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
    const input = screen.getByPlaceholderText('Note...');
    fireEvent.change(input, { target: { value: 'Good job!' } });

    // Test approve
    client.post.mockResolvedValueOnce({ data: { status: 'success' } });
    fireEvent.click(screen.getByTitle(/Mark Reviewed/i));

    // Test delete
    window.confirm = vi.fn().mockReturnValue(true);
    client.delete.mockResolvedValueOnce({ data: { status: 'success' } });
    fireEvent.click(screen.getByTitle(/Delete/i));
  });
});
