import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import Signup from './Signup';
import client from '../../api/client';
import toast from 'react-hot-toast';

vi.mock('../../api/client', () => {
  return {
    default: {
      post: vi.fn(),
    },
  };
});

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Signup Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly for student', () => {
    renderWithProviders(<Signup />);
    expect(screen.getByText('Welcome new student')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
  });

  it('validates password match', async () => {
    const { container } = renderWithProviders(<Signup />);
    const usernameInput = screen.getByPlaceholderText('Username');
    const passInput = container.querySelector('#password');
    const confirmInput = container.querySelector('#confirmPassword');
    const submitBtn = screen.getByRole('button', { name: /Request Access/i });

    fireEvent.change(usernameInput, { target: { value: 'student123' } });
    fireEvent.change(passInput, { target: { value: 'pass123' } });
    fireEvent.change(confirmInput, { target: { value: 'pass456' } });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(toast.error).toHaveBeenCalledWith('Passwords do not match.');
  });

  it('signs up student successfully', async () => {
    client.post.mockResolvedValueOnce({
      data: {
        data: { message: 'Signup successful! Awaiting approval.' }
      }
    });

    const { container } = renderWithProviders(<Signup />);
    const usernameInput = screen.getByPlaceholderText('Username');
    const passInput = container.querySelector('#password');
    const confirmInput = container.querySelector('#confirmPassword');
    const submitBtn = screen.getByRole('button', { name: /Request Access/i });

    fireEvent.change(usernameInput, { target: { value: 'student123' } });
    fireEvent.change(passInput, { target: { value: 'pass123' } });
    fireEvent.change(confirmInput, { target: { value: 'pass123' } });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/user/signup', {
        username: 'student123',
        password: 'pass123'
      });
      expect(toast.success).toHaveBeenCalledWith('Signup successful! Awaiting approval.');
      expect(screen.getByText('Request Submitted!')).toBeInTheDocument();
    });
  });

  it('switches role to parent and signs up parent', async () => {
    client.post.mockResolvedValueOnce({
      data: { success: true }
    });

    const { container } = renderWithProviders(<Signup />);
    
    // Switch to Parent role
    const parentRoleTab = screen.getByText('Parent');
    fireEvent.click(parentRoleTab);

    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();

    const emailInput = screen.getByPlaceholderText('Email Address');
    const passInput = container.querySelector('#password');
    const confirmInput = container.querySelector('#confirmPassword');
    const submitBtn = screen.getByRole('button', { name: /Request Access/i });

    fireEvent.change(emailInput, { target: { value: 'parent@example.com' } });
    fireEvent.change(passInput, { target: { value: 'pass123' } });
    fireEvent.change(confirmInput, { target: { value: 'pass123' } });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/api/auth/cognito/register', {
        email: 'parent@example.com',
        password: 'pass123'
      });
      expect(toast.success).toHaveBeenCalledWith('Verification code sent to your email!');
    });
  });
});
