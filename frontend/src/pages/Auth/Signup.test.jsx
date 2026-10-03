import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
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
  let locationBackup;
  beforeEach(() => {
    vi.clearAllMocks();
    locationBackup = global.window.location;
    delete global.window.location;
    global.window.location = { href: '', assign: vi.fn() };
  });

  afterEach(() => {
    global.window.location = locationBackup;
  });

  it('renders correctly for student', () => {
    renderWithProviders(<Signup />);
    expect(screen.getByText('Welcome new student')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
  });

  it('validates password match', async () => {
    renderWithProviders(<Signup />);
    const usernameInput = screen.getByPlaceholderText(/username/i);
    const passInput = screen.getByPlaceholderText(/^Password/i);
    const confirmInput = screen.getByPlaceholderText(/^Confirm Password/i);
    const submitBtn = screen.getByRole('button', { name: /Request Access/i });

    fireEvent.change(usernameInput, { target: { value: 'student123' } });
    fireEvent.change(passInput, { target: { value: 'pass123' } });
    fireEvent.change(confirmInput, { target: { value: 'pass456' } });

    await act(async () => {
        fireEvent.click(submitBtn);
    });

    expect(toast.error).toHaveBeenCalledWith('Passwords do not match.');
  });

  it('validates password length', async () => {
    renderWithProviders(<Signup />);
    const passInput = screen.getByPlaceholderText(/^Password/i);
    const confirmInput = screen.getByPlaceholderText(/^Confirm Password/i);
    const submitBtn = screen.getByRole('button', { name: /Request Access/i });

    const usernameInput = screen.getByPlaceholderText(/username/i);
    fireEvent.change(usernameInput, { target: { value: 'stu1' } });

    fireEvent.change(passInput, { target: { value: 'short' } });
    fireEvent.change(confirmInput, { target: { value: 'short' } });

    await act(async () => {
        fireEvent.click(submitBtn);
    });

    expect(toast.error).toHaveBeenCalledWith('Password must be at least 8 characters long.');
  });

  it('toggles password visibility', () => {
    renderWithProviders(<Signup />);
    const passInput = screen.getByPlaceholderText(/^Password/i);
    const confirmInput = screen.getByPlaceholderText(/^Confirm Password/i);
    const toggleBtns = screen.getAllByRole('button', { name: /Show password/i });
    
    expect(passInput.type).toBe('password');
    fireEvent.click(toggleBtns[0]);
    expect(passInput.type).toBe('text');
    fireEvent.click(toggleBtns[0]);
    expect(passInput.type).toBe('password');

    expect(confirmInput.type).toBe('password');
    fireEvent.click(toggleBtns[1]);
    expect(confirmInput.type).toBe('text');
  });

  it('signs up student successfully', async () => {
    client.post.mockResolvedValueOnce({
      data: {
        data: { message: 'Signup successful! Awaiting approval.' }
      }
    });

    renderWithProviders(<Signup />);
    const usernameInput = screen.getByPlaceholderText(/username/i);
    const passInput = screen.getByPlaceholderText(/^Password/i);
    const confirmInput = screen.getByPlaceholderText(/^Confirm Password/i);
    const submitBtn = screen.getByRole('button', { name: /Request Access/i });

    fireEvent.change(usernameInput, { target: { value: 'student123' } });
    fireEvent.change(passInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });

    await act(async () => {
        fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/user/signup', {
        username: 'student123',
        password: 'password123'
      });
      expect(screen.getByText('Request Submitted!')).toBeInTheDocument();
    });
  });

  it('switches role to parent, signs up parent, and verifies', async () => {
    client.post.mockResolvedValueOnce({
      data: { success: true }
    });

    renderWithProviders(<Signup />);
    
    const parentRoleTab = screen.getByText('Parent');
    fireEvent.click(parentRoleTab);
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument();

    const emailInput = screen.getByPlaceholderText(/email address/i);
    const passInput = screen.getByPlaceholderText(/^Password/i);
    const confirmInput = screen.getByPlaceholderText(/^Confirm Password/i);
    const submitBtn = screen.getByRole('button', { name: /Request Access/i });

    fireEvent.change(emailInput, { target: { value: 'parent@example.com' } });
    fireEvent.change(passInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });

    await act(async () => {
        fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/api/auth/cognito/register', {
        email: 'parent@example.com',
        password: 'password123'
      });
      expect(toast.success).toHaveBeenCalledWith('Verification code sent to your email!');
    });

    expect(screen.getByPlaceholderText('6-Digit Code')).toBeInTheDocument();
    const codeInput = screen.getByPlaceholderText('6-Digit Code');
    fireEvent.change(codeInput, { target: { value: '123456' } });

    client.post.mockResolvedValueOnce({ data: { success: true } });
    client.post.mockResolvedValueOnce({ data: { success: true } });

    const verifyBtn = screen.getByRole('button', { name: /Verify Code/i });
    
    await act(async () => {
        fireEvent.click(verifyBtn);
    });

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/api/auth/cognito/verify', { email: 'parent@example.com', code: '123456' });
      expect(client.post).toHaveBeenCalledWith('/api/auth/cognito/login', { email: 'parent@example.com', password: 'password123' });
    });
  });

  it('handles parent verify error', async () => {
    client.post.mockResolvedValueOnce({ data: { success: true } });
    renderWithProviders(<Signup />);
    fireEvent.click(screen.getByText('Parent'));
    fireEvent.change(screen.getByPlaceholderText(/email address/i), { target: { value: 'p@ex.com' } });
    fireEvent.change(screen.getByPlaceholderText(/^Password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText(/^Confirm Password/i), { target: { value: 'password123' } });
    
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Request Access/i }));
    });
    
    await waitFor(() => expect(screen.getByPlaceholderText('6-Digit Code')).toBeInTheDocument());

    client.post.mockRejectedValueOnce({ response: { data: { error: 'Invalid code' } } });
    fireEvent.change(screen.getByPlaceholderText('6-Digit Code'), { target: { value: '000000' } });
    
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Verify Code/i }));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid code');
    });
  });

  it('handles existing parent account login fallback', async () => {
    client.post.mockRejectedValueOnce({ response: { data: { error: 'already exists' } } });
    client.post.mockResolvedValueOnce({ data: { success: true } });

    renderWithProviders(<Signup />);
    fireEvent.click(screen.getByText('Parent'));
    fireEvent.change(screen.getByPlaceholderText(/email address/i), { target: { value: 'p@ex.com' } });
    fireEvent.change(screen.getByPlaceholderText(/^Password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText(/^Confirm Password/i), { target: { value: 'password123' } });
    
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Request Access/i }));
    });

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/api/auth/cognito/login', { email: 'p@ex.com', password: 'password123' });
      expect(window.location.href).toBe('/parent/dashboard');
    });
  });

  it('handles existing student account login fallback', async () => {
    client.post.mockRejectedValueOnce({ response: { status: 409, data: { error: 'Username already exists.' } } });
    client.post.mockResolvedValueOnce({ data: { success: true } });

    renderWithProviders(<Signup />);
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'stu1' } });
    fireEvent.change(screen.getByPlaceholderText(/^Password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText(/^Confirm Password/i), { target: { value: 'password123' } });
    
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Request Access/i }));
    });

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/user/login', { username: 'stu1', password: 'password123' });
      expect(window.location.href).toBe('/');
    });
  });

  it('handles generic error on student signup', async () => {
    client.post.mockRejectedValueOnce({ response: { data: { error: 'Some error' } } });
    renderWithProviders(<Signup />);
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'stu1' } });
    fireEvent.change(screen.getByPlaceholderText(/^Password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText(/^Confirm Password/i), { target: { value: 'password123' } });
    
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Request Access/i }));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Some error');
    });
  });

  it('handles existing student account login fallback failure', async () => {
    client.post.mockRejectedValueOnce({ response: { status: 409, data: { error: 'Username already exists.' } } });
    client.post.mockRejectedValueOnce(new Error('Wrong password'));

    

    renderWithProviders(<Signup />);
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'stu1' } });
    fireEvent.change(screen.getByPlaceholderText(/^Password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText(/^Confirm Password/i), { target: { value: 'password123' } });
    
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Request Access/i }));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Account exists, but password was incorrect. Please log in.');
      
    });

    
  });

  it('shows the envelope error text on student signup failure', async () => {
    client.post.mockRejectedValueOnce({
      response: { status: 400, data: { status: 'error', data: null, error: 'Username is too short.' } },
    });
    renderWithProviders(<Signup />);
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'stu1' } });
    fireEvent.change(screen.getByPlaceholderText(/^Password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText(/^Confirm Password/i), { target: { value: 'password123' } });

    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Request Access/i }));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Username is too short.');
    });
  });

  it('falls back to a generic message when a parent signup error body is not a string', async () => {
    client.post.mockRejectedValueOnce({ response: { status: 500, data: { error: { code: 7 } } } });
    renderWithProviders(<Signup />);
    fireEvent.click(screen.getByText('Parent'));
    fireEvent.change(screen.getByPlaceholderText(/email address/i), { target: { value: 'p@ex.com' } });
    fireEvent.change(screen.getByPlaceholderText(/^Password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText(/^Confirm Password/i), { target: { value: 'password123' } });

    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Request Access/i }));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Signup failed.');
    });
  });

  describe('labels and keyboard use', () => {
    it('names the student fields independently of their placeholders', () => {
      renderWithProviders(<Signup />);

      expect(screen.getByRole('textbox', { name: 'Username' })).toHaveAttribute('id', 'username');
      expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveAttribute('id', 'password');
      expect(screen.getByLabelText('Confirm password', { selector: 'input' })).toHaveAttribute('id', 'confirmPassword');
    });

    it('names the parent email field', () => {
      renderWithProviders(<Signup />);

      fireEvent.click(screen.getByRole('button', { name: 'Parent' }));

      expect(screen.getByRole('textbox', { name: 'Email address' })).toHaveAttribute('type', 'email');
      expect(screen.queryByRole('textbox', { name: 'Username' })).not.toBeInTheDocument();
    });

    it('tells assistive technology which role is selected', () => {
      renderWithProviders(<Signup />);
      const student = screen.getByRole('button', { name: 'Student' });
      const parent = screen.getByRole('button', { name: 'Parent' });
      expect(student).toHaveAttribute('aria-pressed', 'true');
      expect(parent).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(parent);

      expect(student).toHaveAttribute('aria-pressed', 'false');
      expect(parent).toHaveAttribute('aria-pressed', 'true');
    });

    it('starts with the role from the URL marked as pressed', () => {
      // window.location is stubbed in this file, so a memory router carries the query string.
      render(
        <MemoryRouter initialEntries={['/signup?role=parent']}>
          <Signup />
        </MemoryRouter>
      );

      expect(screen.getByRole('button', { name: 'Parent' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Student' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('reaches the fields and both show-password buttons with Tab', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Signup />);
      const [passwordToggle, confirmToggle] = screen.getAllByRole('button', { name: 'Show password' });
      expect(passwordToggle).not.toHaveAttribute('tabindex');
      expect(confirmToggle).not.toHaveAttribute('tabindex');

      await user.tab();
      expect(screen.getByRole('button', { name: 'Student' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Parent' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('textbox', { name: 'Username' })).toHaveFocus();
      await user.tab();
      expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveFocus();
      await user.tab();
      expect(passwordToggle).toHaveFocus();
      await user.tab();
      expect(screen.getByLabelText('Confirm password', { selector: 'input' })).toHaveFocus();
      await user.tab();
      expect(confirmToggle).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: /Request Access/i })).toHaveFocus();
    });

    it('announces each visibility toggle as a pressed state', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Signup />);
      const [passwordToggle, confirmToggle] = screen.getAllByRole('button', { name: 'Show password' });
      expect(passwordToggle).toHaveAttribute('aria-pressed', 'false');
      expect(confirmToggle).toHaveAttribute('aria-pressed', 'false');

      await user.click(passwordToggle);
      expect(passwordToggle).toHaveAttribute('aria-pressed', 'true');
      expect(confirmToggle).toHaveAttribute('aria-pressed', 'false');

      await user.click(confirmToggle);
      expect(confirmToggle).toHaveAttribute('aria-pressed', 'true');
    });

    it('names the verification code field and lets the browser fill it from a text message', async () => {
      client.post.mockResolvedValueOnce({ data: { success: true } });
      renderWithProviders(<Signup />);
      fireEvent.click(screen.getByRole('button', { name: 'Parent' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), { target: { value: 'p@ex.com' } });
      fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), { target: { value: 'password123' } });
      fireEvent.change(screen.getByLabelText('Confirm password', { selector: 'input' }), { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Request Access/i }));
      });

      const code = await screen.findByRole('textbox', { name: 'Verification code' });
      expect(code).toHaveAttribute('id', 'verificationCode');
      expect(code).toHaveAttribute('autocomplete', 'one-time-code');
    });
  });
});
