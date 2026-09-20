import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminGameCatalog from './AdminGameCatalog';
import client from '../../api/client';

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
});
