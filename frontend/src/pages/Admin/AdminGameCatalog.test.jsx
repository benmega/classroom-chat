import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminGameCatalog from './AdminGameCatalog';
import client from '../../api/client';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../components/admin/GameRewardsCsvModal', () => ({
  default: ({ isOpen }) => (isOpen ? <div data-testid="mock-csv-modal">CSV Modal</div> : null),
}));

describe('AdminGameCatalog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders catalog controls and displays games when loaded', async () => {
    client.get.mockResolvedValueOnce({
      data: {
        games: [
          {
            id: 1,
            game_name: '2048',
            game_url: 'https://play2048.co/',
            assigned_lesson: 'Ozaria 3.1.1b',
            challenge_slug: 'ozaria-loop-challenge',
            platform: 'Ozaria',
            rating: 9,
            requires_account: false,
            verified: true,
          },
        ],
      },
    });

    render(<AdminGameCatalog />);

    expect(screen.getByText('Upload Game CSV')).toBeInTheDocument();
    expect(screen.getByText('Sample CSV')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('2048')).toBeInTheDocument();
      expect(screen.getByText('Ozaria 3.1.1b')).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Challenge' })).toBeInTheDocument();
      expect(screen.getByText('ozaria-loop-challenge')).toBeInTheDocument();
      expect(screen.getAllByText('Ozaria').length).toBeGreaterThan(0);
    });
  });

  it('renders empty state when no games exist', async () => {
    client.get.mockResolvedValueOnce({ data: { games: [] } });

    render(<AdminGameCatalog />);

    await waitFor(() => {
      expect(screen.getByText('No games found')).toBeInTheDocument();
    });
  });

  it('shows the reason the server gives when the catalog cannot be loaded', async () => {
    client.get.mockRejectedValueOnce({ response: { status: 500, data: { error: 'Catalog unavailable' } } });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<AdminGameCatalog />);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Catalog unavailable'));
  });

  it('falls back to a generic message when the failure has no body', async () => {
    client.get.mockRejectedValueOnce(new Error('Network Error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<AdminGameCatalog />);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to load game catalog.'));
  });
});
