import React, { useEffect } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';
import useAuthStore from './store/useAuthStore';
import useLogout from './hooks/useLogout';
import { server } from './test/mocks/server';

// How often the layout and the page were mounted: a remount means the user saw them torn down
const mounts = vi.hoisted(() => ({ layout: 0, page: 0 }));
// The real checks, before beforeEach swaps checkAuth for a stub (App runs it on mount)
const { checkAuth: realCheckAuth, refreshUser } = useAuthStore.getState();

// Unlike App.test.jsx this runs the real auth store, so it can show how the route guard and the
// sign-out work together: the guard remembers the page when a session ends, but not on a deliberate sign-out.
vi.mock('./pages/General/Landing', () => ({ default: () => <div>Landing Page Mock</div> }));
vi.mock('./pages/Chat/Chat', () => {
  const ChatMock = () => {
    useEffect(() => {
      mounts.page += 1;
    }, []);
    return <div>Chat Page Mock</div>;
  };
  return { default: ChatMock };
});
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
vi.mock('./components/Layout/Layout', () => {
  const LayoutMock = ({ children }) => {
    const logout = useLogout();
    useEffect(() => {
      mounts.layout += 1;
    }, []);
    return (
      <div>
        <button onClick={logout}>Sign out</button>
        {children}
      </div>
    );
  };
  return { default: LayoutMock };
});

describe('App sessions', () => {
  let pushState;
  let replaceState;

  beforeEach(() => {
    mounts.layout = 0;
    mounts.page = 0;
    window.history.pushState({}, '', '/chat?room=7');
    useAuthStore.setState({
      user: { id: 1, username: 'testuser', role: 'student' },
      isAuthenticated: true,
      isLoading: false,
      isServerOffline: false,
      // App checks the session on mount; the test controls the session itself
      checkAuth: vi.fn(),
    });
    pushState = vi.spyOn(window.history, 'pushState');
    replaceState = vi.spyOn(window.history, 'replaceState');
  });

  afterEach(() => {
    pushState.mockRestore();
    replaceState.mockRestore();
    act(() => useAuthStore.getState().clearSession());
  });

  // What the router stored as the return page in every history entry it wrote
  const returnPagesWritten = () =>
    [...pushState.mock.calls, ...replaceState.mock.calls].map(([state]) => state?.usr?.from).filter(Boolean);

  it('remembers the page when the session ends underneath the user', async () => {
    render(<App />);
    expect(await screen.findByText('Chat Page Mock')).toBeInTheDocument();

    // What the 401 interceptor does
    act(() => useAuthStore.getState().clearSession());

    expect(await screen.findByText('Login Page Mock')).toBeInTheDocument();
    expect(screen.getByTestId('login-from')).toHaveTextContent('/chat?room=7');
  });

  it('does not remember the page when the user signs out on purpose', async () => {
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByText('Landing Page Mock')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(window.location.pathname).toBe('/');
    // Nothing in history offers the next person to sign in on this browser the previous user's page
    expect(returnPagesWritten()).toEqual([]);
  });

  it('goes back to remembering the page once the sign-out is over', async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    await screen.findByText('Landing Page Mock');

    // Someone else signs in and opens a page; when their session ends the page is remembered again
    act(() => useAuthStore.setState({ user: { id: 2, username: 'next', role: 'student' }, isAuthenticated: true }));
    act(() => {
      window.history.pushState({}, '', '/chat');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await screen.findByText('Chat Page Mock');
    act(() => useAuthStore.getState().clearSession());

    await waitFor(() => expect(screen.getByTestId('login-from')).toHaveTextContent('/chat'));
  });

  // The balance, the profile and the perks are re-read after many actions (a purchase, an upload, a test
  // result), right in the middle of the page the user is on. That must not look like a new page load.
  describe('refreshing the signed-in user', () => {
    const loaderShown = () => screen.queryByText('Preparing your workspace...');

    const watchLoading = () => {
      const seen = [];
      const unsubscribe = useAuthStore.subscribe((state) => seen.push(state.isLoading));
      return { seen, stop: unsubscribe };
    };

    it('swaps in the fresh user without remounting the layout or the page', async () => {
      render(<App />);
      await screen.findByText('Chat Page Mock');
      expect(mounts).toEqual({ layout: 1, page: 1 });
      const before = useAuthStore.getState().user;
      const loading = watchLoading();

      await act(async () => {
        await refreshUser();
      });
      loading.stop();

      expect(useAuthStore.getState().user).not.toBe(before);
      expect(useAuthStore.getState().user.username).toBe('testuser');
      expect(loading.seen).not.toContain(true);
      expect(loaderShown()).not.toBeInTheDocument();
      expect(screen.getByText('Chat Page Mock')).toBeInTheDocument();
      expect(mounts).toEqual({ layout: 1, page: 1 });
    });

    it('stays on the page, signed in, when the refresh fails', async () => {
      server.use(http.get('*/user/api/auth/status', () => HttpResponse.error()));
      render(<App />);
      await screen.findByText('Chat Page Mock');
      const before = useAuthStore.getState().user;

      await act(async () => {
        await refreshUser();
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user).toBe(before);
      expect(useAuthStore.getState().isServerOffline).toBe(false);
      expect(screen.getByText('Chat Page Mock')).toBeInTheDocument();
      expect(screen.queryByText('Login Page Mock')).not.toBeInTheDocument();
      expect(mounts).toEqual({ layout: 1, page: 1 });
    });

    it('stays on the page when the server times out or errors', async () => {
      server.use(http.get('*/user/api/auth/status', () => new HttpResponse(null, { status: 503 })));
      render(<App />);
      await screen.findByText('Chat Page Mock');

      await act(async () => {
        await refreshUser();
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isServerOffline).toBe(false);
      expect(screen.getByText('Chat Page Mock')).toBeInTheDocument();
      expect(mounts).toEqual({ layout: 1, page: 1 });
    });

    it('sends the user to the sign-in page when the server says the session is gone', async () => {
      server.use(http.get('*/user/api/auth/status', () => HttpResponse.json({ data: { logged_in: false } })));
      render(<App />);
      await screen.findByText('Chat Page Mock');

      await act(async () => {
        await refreshUser();
      });

      expect(await screen.findByText('Login Page Mock')).toBeInTheDocument();
    });

    // The reason refreshUser exists: the same call as a full session check tears the page down
    it('whereas a full session check puts the loader up and remounts them', async () => {
      render(<App />);
      await screen.findByText('Chat Page Mock');
      const loading = watchLoading();

      await act(async () => {
        await realCheckAuth();
      });
      loading.stop();

      expect(loading.seen).toContain(true);
      expect(mounts.layout).toBeGreaterThan(1);
      expect(mounts.page).toBeGreaterThan(1);
    });

    it('whereas a failing full session check replaces the app with the offline page', async () => {
      server.use(http.get('*/user/api/auth/status', () => HttpResponse.error()));
      render(<App />);
      await screen.findByText('Chat Page Mock');

      await act(async () => {
        await realCheckAuth(true);
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().isServerOffline).toBe(true);
      expect(screen.queryByText('Chat Page Mock')).not.toBeInTheDocument();
    });
  });
});
