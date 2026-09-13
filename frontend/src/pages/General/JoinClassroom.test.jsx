import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JoinClassroom from './JoinClassroom';
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

describe('JoinClassroom Component', () => {
  const mockOnJoined = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input and header when not compact', () => {
    render(<JoinClassroom compact={false} onJoined={mockOnJoined} />);

    expect(screen.getByText('Join Your Classroom')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter code e\.g\. AB3C9/i)).toBeInTheDocument();
  });

  it('renders trigger button when compact and expands on click', () => {
    render(<JoinClassroom compact={true} onJoined={mockOnJoined} />);

    const trigger = screen.getByRole('button', { name: /Join a classroom/i });
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByPlaceholderText(/Enter code e\.g\. AB3C9/i)).toBeInTheDocument();
  });

  it('validates 5-character code requirement on submit', async () => {
    render(<JoinClassroom compact={false} onJoined={mockOnJoined} />);

    const input = screen.getByPlaceholderText(/Enter code e\.g\. AB3C9/i);
    fireEvent.change(input, { target: { value: 'AB' } });

    // Submit form directly
    const form = input.closest('form');
    fireEvent.submit(form);

    expect(toast.error).toHaveBeenCalledWith('Enter a 5-character classroom code.');
    expect(client.post).not.toHaveBeenCalled();
  });

  it('submits code successfully and triggers onJoined callback', async () => {
    client.post.mockResolvedValueOnce({
      data: {
        data: {
          classroom: { name: 'CS 101' },
        },
      },
    });

    render(<JoinClassroom compact={false} onJoined={mockOnJoined} />);

    const input = screen.getByPlaceholderText(/Enter code e\.g\. AB3C9/i);
    fireEvent.change(input, { target: { value: 'AB3C9' } });

    const submitBtn = screen.getByRole('button', { name: 'Join' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/api/classroom/join', { code: 'AB3C9' });
      
      expect(mockOnJoined).toHaveBeenCalledWith({ name: 'CS 101' });
    });

    expect(screen.getByText('Joined')).toBeInTheDocument();
    expect(screen.getByText('CS 101')).toBeInTheDocument();
  });

  it('handles submission error gracefully', async () => {
    client.post.mockRejectedValueOnce({
      response: {
        data: { error: 'Invalid classroom code' },
      },
    });

    render(<JoinClassroom compact={false} onJoined={mockOnJoined} />);

    const input = screen.getByPlaceholderText(/Enter code e\.g\. AB3C9/i);
    fireEvent.change(input, { target: { value: 'WRONG' } });

    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid classroom code');
    });
  });
});
