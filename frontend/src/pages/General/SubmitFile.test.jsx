import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubmitFile from './SubmitFile';
import client from '../../api/client';
import toast from 'react-hot-toast';

vi.mock('../../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SubmitFile Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form correctly', () => {
    render(<SubmitFile />);
    expect(screen.getByText('Send a File')).toBeInTheDocument();
    expect(screen.getByText('Note (optional)')).toBeInTheDocument();
  });

  it('shows error if submitting without a file', async () => {
    render(<SubmitFile />);
    const form = screen.getByRole('button', { name: /Send to Teacher/i }).closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Please choose a file to send.');
    });
  });

  it('submits a file successfully', async () => {
    client.post.mockResolvedValueOnce({
      data: { status: 'success' },
    });

    render(<SubmitFile />);
    
    // Create a dummy file
    const file = new File(['dummy content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/File/i, { selector: 'input[type="file"]' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitBtn = screen.getByRole('button', { name: /Send to Teacher/i });
    
    // We can't easily click if it's disabled, but we selected a file so it should be enabled
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(client.post).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('File sent to your teacher!');
    });
  });

  it('handles drag and drop', () => {
    render(<SubmitFile />);
    const dropZone = screen.getByText('Click to choose a file, or drag one here').closest('label');
    
    // Test drag events
    fireEvent.dragEnter(dropZone, { dataTransfer: { types: ['Files'] } });
    fireEvent.dragOver(dropZone);
    fireEvent.dragLeave(dropZone);
    
    // Test drop
    const file = new File(['dummy content'], 'test.txt', { type: 'text/plain' });
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
    
    // Test clear file
    const removeBtn = screen.getByRole('button', { name: /Remove selected file/i });
    fireEvent.click(removeBtn);
  });
});
