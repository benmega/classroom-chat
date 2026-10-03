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

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <GameRewardsCsvModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with concise description and upload dropzone when open', () => {
    render(<GameRewardsCsvModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Upload Game Rewards CSV')).toBeInTheDocument();
    expect(screen.getByText('Sample CSV')).toBeInTheDocument();
    expect(screen.getByText(/Drag and drop your/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload CSV/i })).toBeInTheDocument();
  });

  it('downloads sample CSV when Sample CSV button is clicked', async () => {
    client.get.mockResolvedValueOnce({ data: 'game_name,game_url\nTest,http://test' });

    // Mock URL.createObjectURL
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const mockRevokeObjectURL = vi.fn();
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;

    render(<GameRewardsCsvModal isOpen={true} onClose={vi.fn()} />);

    const downloadBtn = screen.getByRole('button', { name: /sample csv/i });
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
    client.post.mockResolvedValueOnce({
      data: { success: true, inserted: 5, total_rows: 5 },
    });
    const onClose = vi.fn();

    render(<GameRewardsCsvModal isOpen={true} onClose={onClose} />);

    // Upload button should initially be disabled
    const uploadBtn = screen.getByRole('button', { name: /upload csv/i });
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
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('rejects non-csv files with error toast', () => {
    render(<GameRewardsCsvModal isOpen={true} onClose={vi.fn()} />);

    const badFile = new File(['binary'], 'image.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [badFile] } });

    expect(toast.error).toHaveBeenCalledWith('Please choose a .csv file');
  });

  describe('failed uploads', () => {
    const upload = async () => {
      render(<GameRewardsCsvModal isOpen={true} onClose={vi.fn()} />);
      const file = new File(['game_name,game_url\nGame1,url1'], 'rewards.csv', { type: 'text/csv' });
      fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /upload csv/i }));
    };

    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it.each([
      ['an enveloped error', { status: 'error', data: null, error: 'Missing required column: game_name' }, 'Missing required column: game_name'],
      ['a message', { success: false, message: 'Invalid CSV file' }, 'Invalid CSV file'],
    ])('shows the reason the server gives as %s', async (_label, body, expected) => {
      client.post.mockRejectedValueOnce({ response: { status: 400, data: body } });

      await upload();

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expected));
    });

    it('falls back to a generic message when the failure has no body', async () => {
      client.post.mockRejectedValueOnce(new Error('Network Error'));

      await upload();

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to upload CSV.'));
    });
  });
});
