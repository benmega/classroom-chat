import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameRewardsCsvModal from './GameRewardsCsvModal';
import client from '../../api/client';
import toast from 'react-hot-toast';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('GameRewardsCsvModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockGames = [
    {
      id: 1,
      game_name: 'Pacman Grid',
      game_url: 'https://example.com/pacman',
      assigned_lesson: 'Lesson 1.1',
      rating: 4.5,
      requires_account: false,
    },
    {
      id: 2,
      game_name: 'Snake Duel',
      game_url: 'https://example.com/snake',
      assigned_lesson: 'Lesson 2.3',
      rating: 5,
      requires_account: true,
    },
  ];

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <GameRewardsCsvModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal and fetches games list when open', async () => {
    client.get.mockResolvedValueOnce({ data: { games: mockGames } });

    render(<GameRewardsCsvModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/Game Rewards Management \(CSV Upload\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Download Sample CSV/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Pacman Grid')).toBeInTheDocument();
      expect(screen.getByText('Snake Duel')).toBeInTheDocument();
      expect(screen.getByText('2 total')).toBeInTheDocument();
    });
  });

  it('downloads sample CSV when Download Sample CSV button is clicked', async () => {
    client.get.mockImplementation((url) => {
      if (url.includes('/sample-csv')) {
        return Promise.resolve({ data: 'game_name,game_url\nTest,http://test' });
      }
      return Promise.resolve({ data: { games: [] } });
    });

    // Mock URL.createObjectURL
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const mockRevokeObjectURL = vi.fn();
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;

    render(<GameRewardsCsvModal isOpen={true} onClose={vi.fn()} />);

    const downloadBtn = screen.getByRole('button', { name: /download sample csv/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(client.get).toHaveBeenCalledWith('/api/admin/level-games/sample-csv', {
        responseType: 'blob',
      });
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Sample CSV downloaded.');
    });
  });

  it('selects a CSV file and uploads it successfully', async () => {
    client.get.mockResolvedValue({ data: { games: [] } });
    client.post.mockResolvedValueOnce({
      data: { success: true, inserted: 5, total_rows: 5 },
    });

    render(<GameRewardsCsvModal isOpen={true} onClose={vi.fn()} />);

    // Upload button should initially be disabled
    const uploadBtn = screen.getByRole('button', { name: /upload & process csv/i });
    expect(uploadBtn).toBeDisabled();

    // Select file
    const file = new File(['game_name,game_url\nGame1,url1'], 'rewards.csv', {
      type: 'text/csv',
    });
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('rewards.csv')).toBeInTheDocument();
    expect(uploadBtn).not.toBeDisabled();

    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith(
        '/api/admin/level-games/upload-csv',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('5 games saved')
      );
    });
  });

  it('rejects non-csv files with error toast', () => {
    client.get.mockResolvedValueOnce({ data: { games: [] } });
    render(<GameRewardsCsvModal isOpen={true} onClose={vi.fn()} />);

    const badFile = new File(['binary'], 'image.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [badFile] } });

    expect(toast.error).toHaveBeenCalledWith('Please choose a .csv file');
    expect(screen.queryByText('image.png')).not.toBeInTheDocument();
  });
});
