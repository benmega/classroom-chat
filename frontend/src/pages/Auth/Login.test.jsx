import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import Login from './Login';
import { renderWithProviders } from '../../test/test-utils';
import { server } from '../../test/mocks/server';
import useAuthStore from '../../store/useAuthStore';
import toast from 'react-hot-toast';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// The store is shared by every test in this file: start each from the signed-out state it has on load
const signedOut = useAuthStore.getState();

const signInAs = (username, password) => {
  fireEvent.change(screen.getByPlaceholderText(/Username/i), { target: { value: username } });
  fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /Login/i }));
};

// The login endpoint's answer for a student, with any fields the test cares about changed
const loginResponse = (user = {}, extra = {}) =>
  http.post('*/user/login', () =>
    HttpResponse.json({ user: { id: 1, username: 'testuser', role: 'student', ducks: 10, ...user }, ...extra })
  );

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState(signedOut, true);
  });

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
    // The user is signed in and sent to the chat, the home page of a student without a profile page
    await waitFor(() => expect(window.location.pathname).toBe('/chat'));
    const { isAuthenticated, user } = useAuthStore.getState();
    expect(isAuthenticated).toBe(true);
    expect(user.username).toBe('testuser');
  });

  it('says so when the daily duck was awarded', async () => {
    renderWithProviders(<Login />);

    signInAs('testuser', 'password123');

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Welcome! Daily duck awarded.', { icon: '🦆' }));
    expect(toast.success).toHaveBeenCalledWith('Login successful!');
  });

  it('does not mention a duck when none was awarded', async () => {
    server.use(loginResponse({}, { awarded_duck: false }));
    renderWithProviders(<Login />);

    signInAs('testuser', 'password123');

    await waitFor(() => expect(window.location.pathname).toBe('/chat'));
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Login successful!');
  });

  it('sends a student with a profile page to their course progress', async () => {
    server.use(loginResponse({ slug: 'jane-doe' }));
    renderWithProviders(<Login />);

    signInAs('testuser', 'password123');

    await waitFor(() => expect(window.location.pathname).toBe('/course-progress/jane-doe'));
  });

  it('sends a parent to the parent dashboard', async () => {
    server.use(loginResponse({ username: 'mum', role: 'parent' }));
    renderWithProviders(<Login />);

    signInAs('mum', 'password123');

    await waitFor(() => expect(window.location.pathname).toBe('/parent/dashboard'));
    expect(useAuthStore.getState().user.role).toBe('parent');
  });

  it('sends an admin to the chat, since a home page is only chosen for parents and students with a page', async () => {
    server.use(loginResponse({ username: 'teacher', role: 'admin' }));
    renderWithProviders(<Login />);

    signInAs('teacher', 'password123');

    await waitFor(() => expect(window.location.pathname).toBe('/chat'));
  });

  describe('where the user is sent', () => {
    // A router that starts on /login with the given navigation state, and shows where it ends up
    const Where = () => {
      const { pathname, search } = useLocation();
      return <div data-testid="where">{pathname + search}</div>;
    };
    const renderLoginAt = (state) =>
      render(
        <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
          <Login />
          <Where />
        </MemoryRouter>
      );

    it('goes back to the page the user was bounced from', async () => {
      renderLoginAt({ from: '/shop?tab=2' });

      signInAs('testuser', 'password123');

      await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/shop?tab=2'));
    });

    it('prefers the page the user was bounced from over their home page', async () => {
      server.use(loginResponse({ slug: 'jane-doe' }));
      renderLoginAt({ from: '/activity' });

      signInAs('testuser', 'password123');

      await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/activity'));
    });

    it('finishes connecting a parent to a child when a connection code is waiting', async () => {
      localStorage.setItem('pendingConnectionCode', 'ABC123');
      renderLoginAt(undefined);

      signInAs('testuser', 'password123');

      await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/parent/connect?code=ABC123'));
    });

    it('stays on the login page after a failed login', async () => {
      renderLoginAt({ from: '/shop' });

      signInAs('wronguser', 'wrongpass');

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(screen.getByTestId('where')).toHaveTextContent('/login');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('parent accounts', () => {
    it('signs in an email address through the parent login instead of the student one', async () => {
      let studentLoginCalled = false;
      let cognitoBody;
      server.use(
        http.post('*/user/login', () => {
          studentLoginCalled = true;
          return HttpResponse.json({}, { status: 500 });
        }),
        http.post('*/api/auth/cognito/login', async ({ request }) => {
          cognitoBody = await request.json();
          return HttpResponse.json({ success: true, role: 'parent' });
        })
      );
      renderWithProviders(<Login />);

      signInAs('mum@example.com', 'password123');

      await waitFor(() => expect(window.location.pathname).toBe('/parent/dashboard'));
      expect(cognitoBody).toEqual({ email: 'mum@example.com', password: 'password123' });
      expect(studentLoginCalled).toBe(false);
      expect(toast.success).toHaveBeenCalledWith('Login successful!');
      // The parent login only sets the cookie: the user is then loaded from the auth check
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('shows the reason when the parent login is refused', async () => {
      server.use(
        http.post('*/api/auth/cognito/login', () =>
          HttpResponse.json({ error: 'Incorrect username or password.' }, { status: 401 })
        )
      );
      renderWithProviders(<Login />);

      signInAs('mum@example.com', 'wrong');

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Incorrect username or password.'));
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  it('shows a generic message when the login fails without giving a reason', async () => {
    useAuthStore.setState({ login: vi.fn().mockResolvedValue({ success: false }) });
    renderWithProviders(<Login />);

    signInAs('testuser', 'password123');

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid credentials.'));
  });

  it('shows an unexpected-error message when the login itself throws', async () => {
    useAuthStore.setState({ login: vi.fn().mockRejectedValue(new Error('boom')) });
    renderWithProviders(<Login />);

    signInAs('testuser', 'password123');

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('An unexpected error occurred. Please try again.'));
    // The form is usable again
    expect(screen.getByRole('button', { name: /Login/i })).toBeEnabled();
  });

  it('disables the button and says it is working while the login runs', async () => {
    let release;
    server.use(
      http.post('*/user/login', async () => {
        await new Promise((resolve) => { release = resolve; });
        return HttpResponse.json({ user: { id: 1, username: 'testuser', role: 'student' } });
      })
    );
    renderWithProviders(<Login />);

    signInAs('testuser', 'password123');

    const busy = await screen.findByRole('button', { name: /Logging in/i });
    expect(busy).toBeDisabled();
    await waitFor(() => expect(release).toBeDefined());
    release();
    await waitFor(() => expect(screen.getByRole('button', { name: /Login/i })).toBeEnabled());
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
