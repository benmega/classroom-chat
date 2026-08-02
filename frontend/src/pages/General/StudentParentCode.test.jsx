import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StudentParentCode from './StudentParentCode';
import client from '../../api/client';
import toast from 'react-hot-toast';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
  },
}));

describe('StudentParentCode Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(global.navigator, 'clipboard', {
      writable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders loading state initially and then displays connection code', async () => {
    client.get.mockResolvedValueOnce({
      data: {
        connection_code: 'XYZ-999',
      },
    });

    render(<StudentParentCode />);

    await waitFor(() => {
      expect(screen.getByText('XYZ-999')).toBeInTheDocument();
    });

    expect(screen.getByText('Share with Your Parent')).toBeInTheDocument();
  });

  it('handles error when fetching code fails', async () => {
    client.get.mockRejectedValueOnce({
      response: {
        data: { error: 'Failed to generate code' },
      },
    });

    render(<StudentParentCode />);

    await waitFor(() => {
      expect(screen.getByText('Failed to generate code')).toBeInTheDocument();
    });
  });

  it('copies connection code to clipboard on copy button click', async () => {
    client.get.mockResolvedValueOnce({
      data: {
        connection_code: 'CODE-123',
      },
    });

    render(<StudentParentCode />);

    await waitFor(() => {
      expect(screen.getByText('CODE-123')).toBeInTheDocument();
    });

    const copyBtn = screen.getByTitle('Copy code');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('CODE-123');
    expect(toast.success).toHaveBeenCalledWith('Connection code copied!');
  });

  it('refreshes code on Refresh Code button click', async () => {
    client.get.mockResolvedValueOnce({ data: { connection_code: 'CODE-1' } });
    client.get.mockResolvedValueOnce({ data: { connection_code: 'CODE-2' } });

    render(<StudentParentCode />);

    await waitFor(() => {
      expect(screen.getByText('CODE-1')).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole('button', { name: /Refresh Code/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getByText('CODE-2')).toBeInTheDocument();
    });
  });
});
