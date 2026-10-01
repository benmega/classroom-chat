import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import toast from 'react-hot-toast';
import App from './App';
import useAuthStore from './store/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('./store/useAuthStore', () => ({
  default: vi.fn()
}));

vi.mock('./pages/Error/ServerOffline', () => ({
  default: () => <div>Server is Offline Mock</div>
}));

// Mock heavy page components to keep tests focused on App-level routing logic
// Lets a test make the Landing page throw while it renders (for the error boundary tests).
const pageErrors = vi.hoisted(() => ({ landing: null }));
vi.mock('./pages/General/Landing', () => ({
  default: () => {
    if (pageErrors.landing) throw pageErrors.landing;
    return <div>Landing Page Mock</div>;
  }
}));
vi.mock('./pages/Chat/Chat', () => ({
  default: () => <div>Chat Page Mock</div>
}));
vi.mock('./pages/Profile/index', () => ({
  default: () => <div>Profile Page Mock</div>
}));
vi.mock('./pages/Admin/AdminDashboard', () => ({
  default: () => <div>Admin Dashboard Mock</div>
}));
vi.mock('./pages/Parent/ParentDashboard', () => ({
  default: () => <div>Parent Dashboard Mock</div>
}));
// Shows where the guard said the user came from, so the tests can read the redirect state
vi.mock('./pages/Auth/Login', async () => {
  const { useLocation } = await import('react-router-dom');
  const LoginMock = () => {
    const { state } = useLocation();
    return (
      <>
        <div>Login Page Mock</div>
        {state?.from && <span data-testid="login-from">{state.from}</span>}
      </>
    );
  };
  return { default: LoginMock };
});
vi.mock('./pages/Error/AccessDenied', () => ({
  default: () => <div>Access Denied Mock</div>
}));

vi.mock('./components/Layout/Layout', () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>
}));

vi.mock('./components/Layout/AdminLayout', () => ({
  default: ({ children }) => <div data-testid="admin-layout">{children}</div>
}));


const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderApp = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
};

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, 'Test page', '/');
  });

  it('renders landing page initially when not authenticated', async () => {
    useAuthStore.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      isServerOffline: false,
      user: null,
      checkAuth: vi.fn(),
    });

    renderApp();
    expect(await screen.findByText('Landing Page Mock')).toBeInTheDocument();
  });

  it('renders ServerOffline component when server is offline', () => {
    useAuthStore.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      isServerOffline: true,
      user: null,
      checkAuth: vi.fn(),
    });

    renderApp();
    expect(screen.getByText('Server is Offline Mock')).toBeInTheDocument();
  });

  it('redirects authenticated student away from /login to /chat', async () => {
    window.history.pushState({}, 'Test page', '/login');
    useAuthStore.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      isServerOffline: false,
      user: { role: 'student', is_admin: false },
      checkAuth: vi.fn(),
    });

    renderApp();
    // Login page should NOT be visible; student should be redirected to chat
    expect(screen.queryByText('Login Page Mock')).not.toBeInTheDocument();
    expect(await screen.findByText('Chat Page Mock')).toBeInTheDocument();
  });

  it.each(['/signup', '/forgot-password', '/reset-password'])(
    'redirects an authenticated user away from %s',
    async (path) => {
      window.history.pushState({}, 'Test page', path);
      useAuthStore.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        isServerOffline: false,
        user: { role: 'student', is_admin: false },
        checkAuth: vi.fn(),
      });

      renderApp();

      expect(await screen.findByText('Chat Page Mock')).toBeInTheDocument();
      expect(window.location.pathname).toBe('/chat');
    }
  );

  it('sends a signed-in user back to the page they were bounced from, not their home page', async () => {
    window.history.pushState({ usr: { from: '/profile' }, key: 'bounced', idx: 0 }, 'Test page', '/login');
    useAuthStore.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      isServerOffline: false,
      user: { role: 'student', is_admin: false },
      checkAuth: vi.fn(),
    });

    renderApp();

    expect(await screen.findByText('Profile Page Mock')).toBeInTheDocument();
    expect(screen.queryByText('Chat Page Mock')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/profile');
  });

  it('shows loading spinner when isLoading is true', () => {
    useAuthStore.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      isServerOffline: false,
      user: null,
      checkAuth: vi.fn(),
    });

    window.history.pushState({}, 'Test page', '/chat');
    renderApp();
    expect(screen.getByText('Preparing your workspace...')).toBeInTheDocument();
    expect(screen.getByText('Classroom Chat')).toBeInTheDocument();
  });

  it('colours the loading spinner from the --blue-600 CSS variable', () => {
    useAuthStore.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      isServerOffline: false,
      user: null,
      checkAuth: vi.fn(),
    });

    window.history.pushState({}, 'Test page', '/chat');
    renderApp();
    const spinner = document.querySelector('svg');
    expect(spinner.getAttribute('style')).toContain('color: var(--blue-600)');
    expect(spinner.getAttribute('stroke')).toBe('currentColor');
  });

  describe('when a signed-out user opens a protected page', () => {
    beforeEach(() => {
      useAuthStore.mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
        isServerOffline: false,
        user: null,
        checkAuth: vi.fn(),
      });
    });

    it('redirects to /login and remembers the page, with its query and hash', async () => {
      window.history.pushState({}, 'Test page', '/activity?tab=2#recent');

      renderApp();

      expect(await screen.findByText('Login Page Mock')).toBeInTheDocument();
      expect(window.location.pathname).toBe('/login');
      expect(screen.getByTestId('login-from')).toHaveTextContent('/activity?tab=2#recent');
    });

    it('replaces the protected page in history so Back does not bounce straight back to /login', async () => {
      const push = vi.spyOn(window.history, 'pushState');
      const replace = vi.spyOn(window.history, 'replaceState');
      window.history.pushState({}, 'Test page', '/activity');
      push.mockClear();

      renderApp();
      await screen.findByText('Login Page Mock');

      expect(push).not.toHaveBeenCalled();
      expect(replace).toHaveBeenCalledWith(
        expect.objectContaining({ usr: { from: '/activity' } }),
        '',
        expect.stringContaining('/login')
      );
      push.mockRestore();
      replace.mockRestore();
    });

    it('does not invent a return page for a user who opens /login directly', async () => {
      window.history.pushState({}, 'Test page', '/login');

      renderApp();

      expect(await screen.findByText('Login Page Mock')).toBeInTheDocument();
      expect(screen.queryByTestId('login-from')).not.toBeInTheDocument();
    });
  });

  it('redirects parent role to parent dashboard', async () => {
    window.history.pushState({}, 'Test page', '/shop');
    useAuthStore.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      isServerOffline: false,
      user: { role: 'parent', is_admin: false },
      checkAuth: vi.fn(),
    });

    renderApp();
    // Parents should be redirected away from /shop to parent dashboard
    expect(await screen.findByText('Parent Dashboard Mock')).toBeInTheDocument();
  });

  it('renders AccessDenied for non-admin accessing admin route', () => {
    window.history.pushState({}, 'Test page', '/admin');
    useAuthStore.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      isServerOffline: false,
      user: { role: 'student', is_admin: false },
      checkAuth: vi.fn(),
    });

    renderApp();
    expect(screen.getByText('Access Denied Mock')).toBeInTheDocument();
  });

  it('redirects printed card links (/user/profile/:slug) to the public profile page', async () => {
    window.history.pushState({}, 'Test page', '/user/profile/jane-doe');
    useAuthStore.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      isServerOffline: false,
      user: null,
      checkAuth: vi.fn(),
    });

    renderApp();
    expect(await screen.findByText('Profile Page Mock')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/profile/jane-doe');
  });

  it('calls checkAuth on mount', () => {
    const mockCheckAuth = vi.fn();
    useAuthStore.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      isServerOffline: false,
      user: null,
      checkAuth: mockCheckAuth,
    });

    renderApp();
    expect(mockCheckAuth).toHaveBeenCalledTimes(1);
  });

  describe('error boundary', () => {
    let consoleError;

    beforeEach(() => {
      pageErrors.landing = null;
      // React and the boundary log caught render errors; keep test output clean.
      consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      useAuthStore.mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
        isServerOffline: false,
        user: null,
        checkAuth: vi.fn(),
      });
    });

    afterEach(() => {
      pageErrors.landing = null;
      consoleError.mockRestore();
    });

    it('shows a recoverable error screen instead of a blank page when a page throws', async () => {
      pageErrors.landing = new Error('page exploded');

      renderApp();

      expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to home' })).toHaveAttribute('href', '/');
      expect(screen.queryByText('A new version is available')).not.toBeInTheDocument();
    });

    it('shows the new-version prompt when a lazy chunk fails to load', async () => {
      pageErrors.landing = new Error('Failed to fetch dynamically imported module: /assets/Landing-abc.js');

      renderApp();

      expect(await screen.findByText('A new version is available')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('recovers with "Try again" once the page renders successfully', async () => {
      pageErrors.landing = new Error('page exploded');
      renderApp();
      const retry = await screen.findByRole('button', { name: 'Try again' });

      pageErrors.landing = null;
      await act(async () => {
        retry.click();
      });

      expect(await screen.findByText('Landing Page Mock')).toBeInTheDocument();
    });

    it('clears the error screen when the user navigates to another route', async () => {
      pageErrors.landing = new Error('page exploded');
      renderApp();
      expect(await screen.findByText('Something went wrong')).toBeInTheDocument();

      pageErrors.landing = null;
      await act(async () => {
        window.history.pushState({}, 'Test page', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      expect(await screen.findByText('Login Page Mock')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('toast announcements', () => {
    beforeEach(() => {
      useAuthStore.mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
        isServerOffline: false,
        user: null,
        checkAuth: vi.fn(),
      });
    });

    afterEach(() => {
      act(() => { toast.remove(); });
    });

    it('announces an error toast as an assertive alert', async () => {
      renderApp();
      await screen.findByText('Landing Page Mock');

      act(() => { toast.error('Passwords do not match.'); });

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Passwords do not match.');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('keeps announcing success toasts politely', async () => {
      renderApp();
      await screen.findByText('Landing Page Mock');

      act(() => { toast.success('Saved!'); });

      const status = await screen.findByRole('status');
      expect(status).toHaveTextContent('Saved!');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('keeps the configured toast styling on the alert', async () => {
      renderApp();
      await screen.findByText('Landing Page Mock');

      act(() => { toast.error('Something broke'); });

      const style = (await screen.findByRole('alert')).parentElement.getAttribute('style');
      expect(style).toContain('background: var(--bg-primary)');
      expect(style).toContain('padding: 14px 20px');
      expect(style).toContain('max-width: 420px');
    });

    it('still alerts for a toast that sets its own position', async () => {
      renderApp();
      await screen.findByText('Landing Page Mock');

      act(() => { toast.error('Up here', { position: 'top-center' }); });

      expect(await screen.findByRole('alert')).toHaveTextContent('Up here');
    });
  });
});
