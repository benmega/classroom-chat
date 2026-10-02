import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import useAuthStore from './useAuthStore';
import client from '../api/client';
import { resetSocket } from '../hooks/useChatSocket';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';

vi.mock('../hooks/useChatSocket', () => ({ resetSocket: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));

describe('useAuthStore', () => {
  let warn;

  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isServerOffline: false,
    });
    // Resetting an authenticated store counts as a cleared session; start each test from zero
    resetSocket.mockClear();
    toast.error.mockClear();
    // A failed logout logs a warning; keep it out of the test output and let tests assert on it
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('initializes with default state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(true);
    expect(state.isServerOffline).toBe(false);
    expect(state.hamburgerProgress).toBe(0);
  });

  it('setHamburgerProgress sets progress and saves to localStorage if user exists', () => {
    useAuthStore.setState({ user: { username: 'testuser' } });
    useAuthStore.getState().setHamburgerProgress(0.5);
    expect(useAuthStore.getState().hamburgerProgress).toBe(0.5);
    expect(localStorage.getItem('hamburger_override_testuser')).toBe('0.5');
  });

  it('checkAuth sets user when logged in', async () => {
    await useAuthStore.getState().checkAuth();
    
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user.username).toBe('testuser');
    expect(state.isLoading).toBe(false);
  });

  it('checkAuth clears user when not logged in', async () => {
    // Override handler for this test
    server.use(
      http.get('*/user/api/auth/status', () => {
        return HttpResponse.json({
          data: { logged_in: false }
        });
      })
    );

    await useAuthStore.getState().checkAuth();
    
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('login updates state on success', async () => {
    const result = await useAuthStore.getState().login('testuser', 'password123');
    
    expect(result.success).toBe(true);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user.username).toBe('testuser');
  });

  it('login returns error on failure', async () => {
    const result = await useAuthStore.getState().login('wrong', 'wrong');
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid username or password.');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
  });

  it('login tolerates a plain string error body', async () => {
    server.use(
      http.post('*/user/login', () => new HttpResponse('Invalid username or password.', { status: 401 }))
    );
    const result = await useAuthStore.getState().login('wrong', 'wrong');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid username or password.');
  });

  it('login reports the server message for an account that is awaiting approval', async () => {
    server.use(
      http.post('*/user/login', () =>
        HttpResponse.json(
          { error: 'Your account is awaiting admin approval.', is_approved: false },
          { status: 403 }
        )
      )
    );

    const result = await useAuthStore.getState().login('newstudent', 'password123');

    expect(result).toEqual({ success: false, error: 'Your account is awaiting admin approval.' });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('login falls back to a generic message when the server sends no error text', async () => {
    server.use(http.post('*/user/login', () => new HttpResponse(null, { status: 500 })));

    const result = await useAuthStore.getState().login('testuser', 'password123');

    expect(result).toEqual({ success: false, error: 'Login failed' });
  });

  it('loginParentCognito updates state on success', async () => {
    server.use(
      http.post('*/api/auth/cognito/login', () => {
        return HttpResponse.json({ success: true, role: 'parent' });
      })
    );
    const result = await useAuthStore.getState().loginParentCognito('parent@test.com', 'password');
    expect(result.success).toBe(true);
  });

  it('completeTutorial updates user state', async () => {
    server.use(
      http.post('*/user/api/auth/tutorial/complete', () => {
        return HttpResponse.json({ success: true });
      })
    );
    useAuthStore.setState({ user: { username: 'testuser', has_seen_tutorial: false } });
    await useAuthStore.getState().completeTutorial();
    const state = useAuthStore.getState();
    expect(state.user.has_seen_tutorial).toBe(true);
  });

  it('logout clears state', async () => {
    // Set initial state
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });
    
    await useAuthStore.getState().logout();
    
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('logout discards the chat socket so the next login gets a fresh one', async () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });

    await useAuthStore.getState().logout();

    expect(resetSocket).toHaveBeenCalled();
  });

  it('logout discards the chat socket and clears state even when the request fails', async () => {
    server.use(http.get('*/user/logout', () => HttpResponse.error()));
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });

    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined();

    expect(resetSocket).toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('logout does not reject on a server error, so callers still navigate away', async () => {
    server.use(http.get('*/user/logout', () => new HttpResponse(null, { status: 500 })));
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 }, hamburgerProgress: 0.4 });

    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.hamburgerProgress).toBe(0);
  });

  it('logout warns that the server may still hold the session when the request fails', async () => {
    server.use(http.get('*/user/logout', () => HttpResponse.error()));
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });

    await useAuthStore.getState().logout();

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('still be signed in'));
    expect(warn).toHaveBeenCalled();
  });

  it('logout stays quiet when the request succeeds', async () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });

    await useAuthStore.getState().logout();

    expect(toast.error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('clearSession resets the user and everything derived from them', () => {
    useAuthStore.setState({
      user: { id: 1, username: 'testuser' },
      isAuthenticated: true,
      hamburgerProgress: 0.7,
      unreadCount: 4,
      lastReadMessageId: 99,
      activityUnreadCount: 2,
    });

    useAuthStore.getState().clearSession();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.hamburgerProgress).toBe(0);
    expect(state.unreadCount).toBe(0);
    expect(state.lastReadMessageId).toBeNull();
    expect(state.activityUnreadCount).toBe(0);
  });

  it('logout leaves the next user no unread badges from the previous one', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 1 },
      unreadCount: 3,
      lastReadMessageId: 12,
      activityUnreadCount: 5,
    });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.lastReadMessageId).toBeNull();
    expect(state.activityUnreadCount).toBe(0);
  });

  it('discards the chat socket when an auth check finds the session gone', async () => {
    server.use(
      http.get('*/user/api/auth/status', () => HttpResponse.json({ data: { logged_in: false } }))
    );
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });
    expect(resetSocket).not.toHaveBeenCalled();

    await useAuthStore.getState().checkAuth();

    expect(resetSocket).toHaveBeenCalledTimes(1);
  });

  it('discards the chat socket when the 401 interceptor clears the session', async () => {
    server.use(http.get('*/some/protected', () => new HttpResponse(null, { status: 401 })));
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });

    await expect(client.get('/some/protected')).rejects.toThrow();

    await vi.waitFor(() => expect(resetSocket).toHaveBeenCalledTimes(1));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('keeps the chat socket while the session lives', async () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });
    useAuthStore.setState({ unreadCount: 3 });
    await useAuthStore.getState().checkAuth(true);

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(resetSocket).not.toHaveBeenCalled();
  });

  it('checkAuth sets isServerOffline to true on 502 Bad Gateway', async () => {
    server.use(
      http.get('*/user/api/auth/status', () => {
        return new HttpResponse(null, { status: 502 });
      })
    );

    await useAuthStore.getState().checkAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.isServerOffline).toBe(true);
  });

  it('checkAuth sets isServerOffline to true on network error (no response)', async () => {
    server.use(
      http.get('*/user/api/auth/status', () => {
        return HttpResponse.error();
      })
    );

    await useAuthStore.getState().checkAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.isServerOffline).toBe(true);
  });
});
