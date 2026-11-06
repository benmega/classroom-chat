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

  it('login reads the message field of an error body that has no error field', async () => {
    server.use(
      http.post('*/user/login', () => HttpResponse.json({ success: false, message: 'Too many attempts.' }, { status: 429 }))
    );

    const result = await useAuthStore.getState().login('testuser', 'password123');

    expect(result).toEqual({ success: false, error: 'Too many attempts.' });
  });

  it('login does not show a proxy error page as the message', async () => {
    server.use(
      http.post('*/user/login', () =>
        new HttpResponse('<html><body>502 Bad Gateway</body></html>', { status: 502, headers: { 'Content-Type': 'text/html' } })
      )
    );

    const result = await useAuthStore.getState().login('testuser', 'password123');

    expect(result).toEqual({ success: false, error: 'Login failed' });
  });

  it('login falls back to a generic message when the server sends no error text', async () => {
    server.use(http.post('*/user/login', () => new HttpResponse(null, { status: 500 })));

    const result = await useAuthStore.getState().login('testuser', 'password123');

    expect(result).toEqual({ success: false, error: 'Login failed' });
  });

  describe('loginParentCognito reads the user without the loader', () => {
    const cognitoLogin = () => useAuthStore.getState().loginParentCognito('parent@test.com', 'password');

    beforeEach(() => {
      // An override saved by an earlier test would win over the progress computed from the challenges
      localStorage.removeItem('hamburger_override_testuser');
      useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false, hamburgerProgress: 0 });
      server.use(
        http.post('*/api/auth/cognito/login', () => HttpResponse.json({ success: true, role: 'parent' }))
      );
    });

    afterEach(() => {
      localStorage.removeItem('hamburger_override_testuser');
    });

    it('sets the user and session when the sign-in and the user read both succeed, never showing the loader', async () => {
      const seen = [];
      const unsubscribe = useAuthStore.subscribe((state) => seen.push(state.isLoading));

      const result = await cognitoLogin();
      unsubscribe();

      expect(result).toEqual({ success: true, role: 'parent' });
      const state = useAuthStore.getState();
      expect(state.user.username).toBe('testuser');
      expect(state.isAuthenticated).toBe(true);
      expect(seen.length).toBeGreaterThan(0);
      expect(seen).not.toContain(true);
    });

    it('reports that the account could not be loaded when the user read fails, without marking the server offline', async () => {
      server.use(http.get('*/user/api/auth/status', () => HttpResponse.error()));

      const result = await cognitoLogin();

      expect(result).toEqual({
        success: false,
        error: 'Signed in, but your account could not be loaded. Please try again.',
      });
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isServerOffline).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('does not read the user when the sign-in is refused', async () => {
      server.use(
        http.post('*/api/auth/cognito/login', () => HttpResponse.json({ success: false }))
      );
      const getSpy = vi.spyOn(client, 'get');

      const result = await cognitoLogin();
      const readUser = getSpy.mock.calls.length;
      getSpy.mockRestore();

      expect(result).toEqual({ success: false, error: 'Login failed' });
      expect(readUser).toBe(0);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('loginParentCognito failures', () => {
    const cognitoLogin = () => useAuthStore.getState().loginParentCognito('parent@test.com', 'password');

    it('reports the error text of a rejected sign-in', async () => {
      server.use(
        http.post('*/api/auth/cognito/login', () => HttpResponse.json({ error: 'Incorrect email or password.' }, { status: 401 }))
      );

      expect(await cognitoLogin()).toEqual({ success: false, error: 'Incorrect email or password.' });
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('reads the message field and a plain string body the same way as the other pages', async () => {
      server.use(
        http.post('*/api/auth/cognito/login', () => HttpResponse.json({ message: 'Account locked.' }, { status: 403 }))
      );
      expect(await cognitoLogin()).toEqual({ success: false, error: 'Account locked.' });

      server.use(
        http.post('*/api/auth/cognito/login', () => new HttpResponse('Sign-in is unavailable.', { status: 503 }))
      );
      expect(await cognitoLogin()).toEqual({ success: false, error: 'Sign-in is unavailable.' });
    });

    it('falls back to a generic message for a page that is not an error message', async () => {
      server.use(
        http.post('*/api/auth/cognito/login', () =>
          new HttpResponse('<html><body>502 Bad Gateway</body></html>', { status: 502, headers: { 'Content-Type': 'text/html' } })
        )
      );

      expect(await cognitoLogin()).toEqual({ success: false, error: 'Login failed' });
    });

    it('falls back to a generic message when the server answers without success', async () => {
      server.use(
        http.post('*/api/auth/cognito/login', () => HttpResponse.json({ success: false }))
      );

      expect(await cognitoLogin()).toEqual({ success: false, error: 'Login failed' });
    });
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
    server.use(http.post('*/user/logout', () => HttpResponse.error()));
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });

    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined();

    expect(resetSocket).toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('logout does not reject on a server error, so callers still navigate away', async () => {
    server.use(http.post('*/user/logout', () => new HttpResponse(null, { status: 500 })));
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 }, hamburgerProgress: 0.4 });

    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.hamburgerProgress).toBe(0);
  });

  it('logout warns that the server may still hold the session when the request fails', async () => {
    server.use(http.post('*/user/logout', () => HttpResponse.error()));
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });

    await useAuthStore.getState().logout();

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('still be signed in'));
    expect(warn).toHaveBeenCalled();
  });

  it('logout falls back to the deprecated GET when the server does not accept POST yet', async () => {
    const methods = [];
    server.use(
      http.post('*/user/logout', ({ request }) => {
        methods.push(request.method);
        return new HttpResponse(null, { status: 405 });
      }),
      http.get('*/user/logout', ({ request }) => {
        methods.push(request.method);
        return HttpResponse.json({ status: 'success', message: 'Logged out' });
      })
    );
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });

    await useAuthStore.getState().logout();

    expect(methods).toEqual(['POST', 'GET']);
    expect(toast.error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('logout warns when neither POST nor the deprecated GET ends the session', async () => {
    server.use(
      http.post('*/user/logout', () => new HttpResponse(null, { status: 405 })),
      http.get('*/user/logout', () => new HttpResponse(null, { status: 500 }))
    );
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });

    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined();

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('still be signed in'));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('logout does not retry with GET on an error other than 405', async () => {
    const methods = [];
    server.use(
      http.post('*/user/logout', () => new HttpResponse(null, { status: 500 })),
      http.get('*/user/logout', ({ request }) => {
        methods.push(request.method);
        return HttpResponse.json({ status: 'success' });
      })
    );
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });

    await useAuthStore.getState().logout();

    expect(methods).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('still be signed in'));
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
    resetSocket.mockClear();

    await useAuthStore.getState().checkAuth();

    expect(resetSocket).toHaveBeenCalledTimes(1);
  });

  it('discards the chat socket when the 401 interceptor clears the session', async () => {
    server.use(http.get('*/some/protected', () => new HttpResponse(null, { status: 401 })));
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });
    resetSocket.mockClear();

    await expect(client.get('/some/protected')).rejects.toThrow();

    await vi.waitFor(() => expect(resetSocket).toHaveBeenCalledTimes(1));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('discards the chat socket on login too, so a socket refused while anonymous is never reused', async () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    await useAuthStore.getState().login('testuser', 'password123');

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(resetSocket).toHaveBeenCalledTimes(1);
  });

  it('discards the chat socket when an auth check signs a user in', async () => {
    await useAuthStore.getState().checkAuth();

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(resetSocket).toHaveBeenCalledTimes(1);
  });

  it('keeps the chat socket while the session lives', async () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });
    useAuthStore.setState({ unreadCount: 3 });
    resetSocket.mockClear();
    await useAuthStore.getState().checkAuth(true);
    await useAuthStore.getState().refreshUser();

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(resetSocket).not.toHaveBeenCalled();
  });

  describe('refreshUser', () => {
    const signedIn = { id: 1, username: 'testuser', role: 'student', duck_balance: 5 };

    beforeEach(() => {
      // An override saved by an earlier test would win over the progress computed from the challenges
      localStorage.removeItem('hamburger_override_testuser');
      useAuthStore.setState({ user: signedIn, isAuthenticated: true, isLoading: false, hamburgerProgress: 0.3 });
      resetSocket.mockClear();
    });

    afterEach(() => {
      localStorage.removeItem('hamburger_override_testuser');
    });

    it('swaps in the fresh user and recomputes the hamburger progress', async () => {
      server.use(
        http.get('*/user/api/auth/status', () => HttpResponse.json({
          data: { logged_in: true, user: { ...signedIn, duck_balance: 9, completed_challenges_count: 4 } },
        }))
      );

      await useAuthStore.getState().refreshUser();

      const state = useAuthStore.getState();
      expect(state.user.duck_balance).toBe(9);
      expect(state.user).not.toBe(signedIn);
      expect(state.isAuthenticated).toBe(true);
      expect(state.hamburgerProgress).toBeCloseTo(0.4);
    });

    it('applies a saved hamburger override like checkAuth does', async () => {
      localStorage.setItem('hamburger_override_testuser', '0.8');

      await useAuthStore.getState().refreshUser();

      expect(useAuthStore.getState().hamburgerProgress).toBe(0.8);
    });

    it('never shows the loader', async () => {
      const seen = [];
      const unsubscribe = useAuthStore.subscribe((state) => seen.push(state.isLoading));

      await useAuthStore.getState().refreshUser();
      unsubscribe();

      expect(seen.length).toBeGreaterThan(0);
      expect(seen.every((isLoading) => isLoading === false)).toBe(true);
    });

    it.each([
      ['a network error', () => HttpResponse.error()],
      ['a 502 from the proxy', () => new HttpResponse(null, { status: 502 })],
      ['a 503', () => new HttpResponse(null, { status: 503 })],
      ['a 500 from the status route', () => HttpResponse.json({ data: { logged_in: false } }, { status: 500 })],
      ['a body without data', () => HttpResponse.json({})],
    ])('keeps the session when the request fails with %s', async (_name, respond) => {
      server.use(http.get('*/user/api/auth/status', respond));

      await useAuthStore.getState().refreshUser();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toBe(signedIn);
      expect(state.isServerOffline).toBe(false);
      expect(state.hamburgerProgress).toBe(0.3);
      expect(resetSocket).not.toHaveBeenCalled();
    });

    it('keeps the session when the request times out', async () => {
      const getSpy = vi.spyOn(client, 'get').mockRejectedValueOnce(
        Object.assign(new Error('timeout of 10000ms exceeded'), { code: 'ECONNABORTED' })
      );

      await useAuthStore.getState().refreshUser();
      getSpy.mockRestore();

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user).toBe(signedIn);
    });

    it('does not reject, so call sites need no try/catch', async () => {
      server.use(http.get('*/user/api/auth/status', () => HttpResponse.error()));

      await expect(useAuthStore.getState().refreshUser()).resolves.toBeUndefined();
    });

    it('still signs the user out when the server says the session is gone', async () => {
      server.use(http.get('*/user/api/auth/status', () => HttpResponse.json({ data: { logged_in: false } })));

      await useAuthStore.getState().refreshUser();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(resetSocket).toHaveBeenCalledTimes(1);
    });

    it('drops an answer that arrives after the user signed out', async () => {
      let answer;
      server.use(http.get('*/user/api/auth/status', async () => {
        await new Promise((resolve) => { answer = resolve; });
        return HttpResponse.json({ data: { logged_in: true, user: { ...signedIn, duck_balance: 99 } } });
      }));

      const pending = useAuthStore.getState().refreshUser();
      await vi.waitFor(() => expect(answer).toBeDefined());
      useAuthStore.getState().clearSession();
      answer();
      await pending;

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('checkAuth is the session check', () => {
    it('still signs a failing session out and flags the server offline, in the background too', async () => {
      useAuthStore.setState({ user: { id: 1, username: 'testuser' }, isAuthenticated: true });
      server.use(http.get('*/user/api/auth/status', () => HttpResponse.error()));

      await useAuthStore.getState().checkAuth(true);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isServerOffline).toBe(true);
    });

    it('shows the loader only when it is not a background check', async () => {
      useAuthStore.setState({ isLoading: false });
      const seen = [];
      const unsubscribe = useAuthStore.subscribe((state) => seen.push(state.isLoading));

      await useAuthStore.getState().checkAuth(true);
      expect(seen).not.toContain(true);

      await useAuthStore.getState().checkAuth();
      unsubscribe();
      expect(seen).toContain(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
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
