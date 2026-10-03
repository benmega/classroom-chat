import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import ImageUpload from './ImageUpload';
import axios from '../../api/client';
import toast from 'react-hot-toast';

vi.mock('../../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('ImageUpload Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload placeholder when no initial image is provided', () => {
    render(<ImageUpload uploadUrl="/api/upload" label="Test Label" />);

    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByText('Click to upload or drag and drop')).toBeInTheDocument();
    expect(screen.queryByAltText('Upload preview')).not.toBeInTheDocument();
  });

  it('renders preview image when initialImage is provided', () => {
    render(
      <ImageUpload 
        uploadUrl="/api/upload" 
        initialImage="/images/test.jpg" 
        label="Project Cover" 
      />
    );

    expect(screen.getByText('Project Cover')).toBeInTheDocument();
    const preview = screen.getByAltText('Upload preview');
    expect(preview).toBeInTheDocument();
    expect(preview.getAttribute('src')).toContain('test.jpg');
  });

  it('updates preview when initialImage prop changes', () => {
    const { rerender } = render(
      <ImageUpload 
        uploadUrl="/api/upload" 
        initialImage="/images/initial.jpg" 
      />
    );

    expect(screen.getByAltText('Upload preview').getAttribute('src')).toContain('initial.jpg');

    rerender(
      <ImageUpload 
        uploadUrl="/api/upload" 
        initialImage="/images/updated.jpg" 
      />
    );

    expect(screen.getByAltText('Upload preview').getAttribute('src')).toContain('updated.jpg');
  });

  it('calls onRemove and clears preview when remove button is clicked', () => {
    const onRemoveMock = vi.fn();
    render(
      <ImageUpload 
        uploadUrl="/api/upload" 
        initialImage="/images/test.jpg" 
        onRemove={onRemoveMock} 
      />
    );

    const removeBtn = screen.getByRole('button', { name: /Remove image/i });
    fireEvent.click(removeBtn);

    expect(onRemoveMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByAltText('Upload preview')).not.toBeInTheDocument();
    expect(screen.getByText('Click to upload or drag and drop')).toBeInTheDocument();
  });

  it('rejects non-image files with a toast error', () => {
    render(<ImageUpload uploadUrl="/api/upload" />);

    const input = document.querySelector('input[type="file"]');
    const textFile = new File(['hello'], 'document.txt', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [textFile] } });

    expect(toast.error).toHaveBeenCalledWith('Please select a valid image file');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('rejects files larger than 10MB', () => {
    render(<ImageUpload uploadUrl="/api/upload" />);

    const input = document.querySelector('input[type="file"]');
    const largeFile = new File(['a'], 'huge.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

    fireEvent.change(input, { target: { files: [largeFile] } });

    expect(toast.error).toHaveBeenCalledWith('File is too large (max 10MB)');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('uploads valid image file and calls onUploadSuccess', async () => {
    const onUploadSuccessMock = vi.fn();
    axios.post.mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          new_url: '/user/project_images/success-img.png',
          filename: 'success-img.png',
        },
      },
    });

    render(
      <ImageUpload 
        uploadUrl="/api/project-templates/upload-image" 
        onUploadSuccess={onUploadSuccessMock} 
      />
    );

    const input = document.querySelector('input[type="file"]');
    const imageFile = new File(['image data'], 'pic.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [imageFile] } });

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/project-templates/upload-image',
        expect.any(FormData),
        expect.objectContaining({
          signal: expect.anything(),
          onUploadProgress: expect.any(Function),
        })
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Image uploaded successfully');
      expect(onUploadSuccessMock).toHaveBeenCalledWith({
        new_url: '/user/project_images/success-img.png',
        filename: 'success-img.png',
      });
    });
  });

  it('supports drag and drop file upload', async () => {
    const onUploadSuccessMock = vi.fn();
    axios.post.mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          new_url: '/user/project_images/dropped.png',
          filename: 'dropped.png',
        },
      },
    });

    render(
      <ImageUpload 
        uploadUrl="/api/project-templates/upload-image" 
        onUploadSuccess={onUploadSuccessMock} 
      />
    );

    const dropzone = screen.getByRole('button');
    const imageFile = new File(['dropped image'], 'dropped.png', { type: 'image/png' });

    fireEvent.dragOver(dropzone);
    expect(dropzone.classList.contains('dragging')).toBe(true);

    fireEvent.dragLeave(dropzone);
    expect(dropzone.classList.contains('dragging')).toBe(false);

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [imageFile],
      },
    });

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
      expect(onUploadSuccessMock).toHaveBeenCalledWith({
        new_url: '/user/project_images/dropped.png',
        filename: 'dropped.png',
      });
    });
  });
});
