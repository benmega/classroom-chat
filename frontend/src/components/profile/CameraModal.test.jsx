import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CameraModal from './CameraModal';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}));

describe('CameraModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnCapture = vi.fn();
  const mockTrackStop = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn(),
      },
    });
  });

  it('does not render content when isOpen is false', () => {
    render(<CameraModal isOpen={false} onClose={mockOnClose} onCapture={mockOnCapture} />);
    expect(screen.queryByText('Scan Note')).not.toBeInTheDocument();
  });

  it('renders modal and initializes webcam stream when isOpen is true', async () => {
    const mockStream = {
      getTracks: () => [{ stop: mockTrackStop }],
    };
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(mockStream);

    render(<CameraModal isOpen={true} onClose={mockOnClose} onCapture={mockOnCapture} />);

    expect(screen.getByText('Scan Note')).toBeInTheDocument();
    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true });
    });
  });

  it('handles camera error gracefully', async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Permission denied'));

    render(<CameraModal isOpen={true} onClose={mockOnClose} onCapture={mockOnCapture} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Could not access camera.');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('captures photo on handleSnap button click', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    });
    HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => {
      cb(new Blob(['fake-img'], { type: 'image/jpeg' }));
    });

    const mockStream = {
      getTracks: () => [{ stop: mockTrackStop }],
    };
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(mockStream);

    render(<CameraModal isOpen={true} onClose={mockOnClose} onCapture={mockOnCapture} />);

    const video = document.querySelector('video');
    if (video) {
      Object.defineProperty(video, 'videoWidth', { value: 640 });
      Object.defineProperty(video, 'videoHeight', { value: 480 });
    }

    const captureBtn = screen.getByRole('button', { name: /Capture & Upload/i });
    fireEvent.click(captureBtn);

    await waitFor(() => {
      expect(mockOnCapture).toHaveBeenCalledWith(expect.any(File));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
