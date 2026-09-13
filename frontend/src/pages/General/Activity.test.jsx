import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Activity from './Activity';
import client from '../../api/client';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Activity Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders skeleton initially and then empty state', async () => {
    client.get.mockResolvedValueOnce({
      data: {
        data: {
          items: [],
          total: 0,
          has_more: false,
          page: 1,
        },
      },
    });

    render(<Activity />);

    await waitFor(() => {
      expect(screen.getByText('Keep Up the Great Work!')).toBeInTheDocument();
    });
  });

  it('renders activity items', async () => {
    client.get.mockResolvedValueOnce({
      data: {
        data: {
          items: [
            { id: 1, kind: 'challenge', status: 'pending', title: 'Pending Challenge', detail: 'Waiting', reward: 50 },
            { id: 2, kind: 'certificate', status: 'approved', title: 'Approved Cert', detail: 'Done', reward: 100 },
          ],
          total: 2,
          has_more: false,
          page: 1,
        },
      },
    });

    render(<Activity />);

    await waitFor(() => {
      expect(screen.getByText('Pending Challenge')).toBeInTheDocument();
      expect(screen.getByText('Approved Cert')).toBeInTheDocument();
    });
  });
});
