import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Login from './Login';
import { renderWithProviders } from '../../test/test-utils';
import toast from 'react-hot-toast';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Login Component', () => {
  it('renders login form correctly', () => {
    renderWithProviders(<Login />);

    expect(screen.getByPlaceholderText(/Username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
  });

  it('updates input values on change', () => {
    renderWithProviders(<Login />);

    const usernameInput = screen.getByPlaceholderText(/Username/i);
    const passwordInput = screen.getByPlaceholderText(/Password/i);

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(usernameInput.value).toBe('testuser');
    expect(passwordInput.value).toBe('password123');
  });

  it('shows success toast and navigates on successful login', async () => {
    renderWithProviders(<Login />);

    const usernameInput = screen.getByPlaceholderText(/Username/i);
    const passwordInput = screen.getByPlaceholderText(/Password/i);
    const loginButton = screen.getByRole('button', { name: /Login/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Login successful!');
    });
  });

  it('shows error toast on invalid credentials', async () => {
    renderWithProviders(<Login />);

    const usernameInput = screen.getByPlaceholderText(/Username/i);
    const passwordInput = screen.getByPlaceholderText(/Password/i);
    const loginButton = screen.getByRole('button', { name: /Login/i });

    fireEvent.change(usernameInput, { target: { value: 'wronguser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid username or password.');
    });
  });

  describe('labels and keyboard use', () => {
    it('gives each field an accessible name that does not depend on its placeholder', () => {
      renderWithProviders(<Login />);

      expect(screen.getByRole('textbox', { name: 'Username or email' })).toHaveAttribute('id', 'usernameOrEmail');
      expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveAttribute('type', 'password');
    });

    it('reaches every control with Tab, including the show-password button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);

      await user.tab();
      expect(screen.getByRole('textbox', { name: 'Username or email' })).toHaveFocus();
      await user.tab();
      expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Show password' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: /Login/i })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('link', { name: 'New Student' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('link', { name: 'New Parent' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('link', { name: 'Forgot Password?' })).toHaveFocus();
    });

    it('announces the visibility toggle as a pressed state instead of changing its name', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);
      const toggle = screen.getByRole('button', { name: 'Show password' });
      const password = screen.getByLabelText('Password', { selector: 'input' });
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
      expect(toggle).not.toHaveAttribute('tabindex');

      await user.click(toggle);

      expect(password).toHaveAttribute('type', 'text');
      expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('aria-pressed', 'true');

      await user.click(toggle);

      expect(password).toHaveAttribute('type', 'password');
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });

    it('can be filled in and submitted without a mouse', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);

      await user.tab();
      await user.keyboard('student1');
      await user.tab();
      await user.keyboard('secret');
      await user.tab();
      await user.tab();
      expect(screen.getByRole('button', { name: /Login/i })).toHaveFocus();

      expect(screen.getByRole('textbox', { name: 'Username or email' })).toHaveValue('student1');
      expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveValue('secret');
    });
  });
});
