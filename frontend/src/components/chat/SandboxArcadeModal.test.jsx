import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SandboxArcadeModal from './SandboxArcadeModal';
import client from '../../api/client';
import confetti from 'canvas-confetti';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

describe('SandboxArcadeModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockGamesData = {
    sandbox_active: true,
    highest_milestone: 'Lesson 5.1a',
    games: [
      {
        id: 'game-1',
        game_name: 'Dungeon Crawler',
        game_url: 'https://example.com/dungeon',
        assigned_lesson: 'Lesson 5.1a',
        comment: 'Explore the dungeon and defeat the boss!',
        requires_account: false,
        rating: 4.8,
      },
      {
        id: 'game-2',
        game_name: 'Space Invaders Pro',
        game_url: 'https://example.com/space',
        assigned_lesson: 'Lesson 4.2',
        comment: 'Shoot alien ships.',
        requires_account: true,
        rating: 4.5,
      },
    ],
  };

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <SandboxArcadeModal isOpen={false} onClose={vi.fn()} classId="cls123" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders celebratory modal and triggers confetti when opened', async () => {
    client.get.mockResolvedValueOnce({ data: mockGamesData });

    render(
      <SandboxArcadeModal isOpen={true} onClose={vi.fn()} classId="cls123" />
    );

    expect(confetti).toHaveBeenCalledWith(
      expect.objectContaining({
        particleCount: 120,
        spread: 80,
      })
    );

    expect(screen.getByText(/Sandbox Mode!/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/You've unlocked games from your most advanced completed lessons/i)
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Dungeon Crawler')).toBeInTheDocument();
      expect(screen.getByText('Space Invaders Pro')).toBeInTheDocument();
      expect(screen.getByText('Lesson 5.1a')).toBeInTheDocument();
      expect(screen.queryByText('Lesson 4.2')).not.toBeInTheDocument();
      expect(screen.getByTitle('Account Required')).toBeInTheDocument();
      expect(screen.getByText('4.8')).toBeInTheDocument();
      expect(screen.queryByText('Explore the dungeon and defeat the boss!')).not.toBeInTheDocument();
    });
  });

  it('renders Play Now button that opens game_url in a new tab and removes open in new tab button', async () => {
    client.get.mockResolvedValueOnce({ data: mockGamesData });

    render(
      <SandboxArcadeModal isOpen={true} onClose={vi.fn()} classId="cls123" />
    );

    await waitFor(() => {
      expect(screen.getByText('Dungeon Crawler')).toBeInTheDocument();
    });

    const playLinks = screen.getAllByRole('link', { name: /play now/i });
    expect(playLinks).toHaveLength(2);
    expect(playLinks[0]).toHaveAttribute('href', 'https://example.com/dungeon');
    expect(playLinks[0]).toHaveAttribute('target', '_blank');
    expect(playLinks[0]).toHaveAttribute('rel', 'noopener noreferrer');

    expect(playLinks[1]).toHaveAttribute('href', 'https://example.com/space');
    expect(playLinks[1]).toHaveAttribute('target', '_blank');
    expect(playLinks[1]).toHaveAttribute('rel', 'noopener noreferrer');

    expect(screen.queryByText(/open in new tab/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /back to games/i })).not.toBeInTheDocument();
  });

  it('handles empty games list gracefully', async () => {
    client.get.mockResolvedValueOnce({
      data: { sandbox_active: true, highest_milestone: '', games: [] },
    });

    render(
      <SandboxArcadeModal isOpen={true} onClose={vi.fn()} classId="cls123" />
    );

    await waitFor(() => {
      expect(screen.getByText(/no games unlocked yet/i)).toBeInTheDocument();
    });
  });

  it('handles error state and allows retry', async () => {
    client.get.mockRejectedValueOnce(new Error('Network error'));

    render(
      <SandboxArcadeModal isOpen={true} onClose={vi.fn()} classId="cls123" />
    );

    await waitFor(() => {
      expect(screen.getByText(/unable to load sandbox games/i)).toBeInTheDocument();
    });

    client.get.mockResolvedValueOnce({ data: mockGamesData });
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByText('Dungeon Crawler')).toBeInTheDocument();
    });
  });

  it('calls onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    client.get.mockResolvedValueOnce({ data: mockGamesData });

    render(
      <SandboxArcadeModal isOpen={true} onClose={handleClose} classId="cls123" />
    );

    const closeBtn = screen.getByRole('button', { name: /close arcade/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
