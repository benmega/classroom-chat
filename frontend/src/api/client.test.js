import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';
import client from './client';
import useAuthStore from '../store/useAuthStore';
import { server } from '../test/mocks/server';

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));

// The 401 interceptor is what turns an expired session into the logged-out UI.
// The heartbeat endpoint answers 401 when the session is gone, so it relies on it.
describe('api client', () => {
  const originalCheckAuth = useAuthStore.getState().checkAuth;

  beforeEach(() => {
    window.history.pushState({}, '', '/');
    toast.error.mockClear();
    useAuthStore.setState({
      user: { id: 1, username: 'testuser' },
      isAuthenticated: true,
      hamburgerProgress: 0.5,
      unreadCount: 3,
      activityUnreadCount: 2,
    });
  });

  afterEach(() => {
    useAuthStore.setState({ checkAuth: originalCheckAuth });
  });

  const settle = () => new Promise((resolve) => setTimeout(resolve, 25));

  it('logs the user out when the heartbeat reports that the session is gone', async () => {
    server.use(
      http.post('*/api/session/heartbeat', () =>
        HttpResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
      )
    );

    await expect(client.post('/api/session/heartbeat')).rejects.toMatchObject({
      response: { status: 401 },
    });

    await vi.waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.hamburgerProgress).toBe(0);
    // Nothing of the previous session is left behind for whoever signs in next
    expect(state.unreadCount).toBe(0);
    expect(state.activityUnreadCount).toBe(0);
    // The page is left where it is: no redirect is triggered from the client
    expect(window.location.pathname).toBe('/');
  });

  it('leaves the auth state alone on the login page', async () => {
    window.history.pushState({}, '', '/login');
    server.use(
      http.post('*/api/session/heartbeat', () =>
        HttpResponse.json({ success: false }, { status: 401 })
      )
    );

    await expect(client.post('/api/session/heartbeat')).rejects.toMatchObject({
      response: { status: 401 },
    });
    await settle();

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  // The sign-in pages expect 401s (a wrong password, say), so they must never wipe the auth state
  it.each(['/login', '/signup', '/forgot-password', '/reset-password', '/dev-login', '/login/'])(
    'leaves the auth state alone on %s',
    async (path) => {
      window.history.pushState({}, '', path);
      server.use(
        http.post('*/api/session/heartbeat', () => HttpResponse.json({ success: false }, { status: 401 }))
      );

      await expect(client.post('/api/session/heartbeat')).rejects.toMatchObject({
        response: { status: 401 },
      });
      await settle();

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    }
  );

  it('still logs the user out on a page whose path only starts like a sign-in page', async () => {
    window.history.pushState({}, '', '/login-help');
    server.use(
      http.post('*/api/session/heartbeat', () => HttpResponse.json({ success: false }, { status: 401 }))
    );

    await expect(client.post('/api/session/heartbeat')).rejects.toMatchObject({
      response: { status: 401 },
    });

    await vi.waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
  });

  it('keeps the user logged in on other errors', async () => {
    server.use(
      http.post('*/api/session/heartbeat', () =>
        HttpResponse.json({ success: false }, { status: 500 })
      )
    );

    await expect(client.post('/api/session/heartbeat')).rejects.toMatchObject({
      response: { status: 500 },
    });
    await settle();

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('passes successful responses through untouched', async () => {
    const response = await client.post('/api/session/heartbeat');

    expect(response.data).toEqual({ success: true });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('sends the CSRF cookie as the X-CSRFToken header', async () => {
    document.cookie = 'csrf_token_v2=token123';
    let seen;
    server.use(
      http.post('*/api/session/heartbeat', ({ request }) => {
        seen = request.headers.get('x-csrftoken');
        return HttpResponse.json({ success: true });
      })
    );

    await client.post('/api/session/heartbeat');

    expect(seen).toBe('token123');
    document.cookie = 'csrf_token_v2=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  describe('CSRF failures', () => {
    const csrfPage = (reason) =>
      new HttpResponse(`<!doctype html><title>400 Bad Request</title><h1>Bad Request</h1><p>${reason}</p>`, {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });

    beforeEach(() => {
      useAuthStore.setState({ checkAuth: vi.fn() });
    });

    it('tells the user the session expired instead of leaving it to the call site', async () => {
      server.use(http.post('*/some/form', () => csrfPage('The CSRF token has expired.')));

      await expect(client.post('/some/form', {})).rejects.toMatchObject({ response: { status: 400 } });

      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('reload the page'),
        expect.objectContaining({ id: 'csrf-expired' })
      );
    });

    it('uses one toast id, so a burst of failing calls does not stack toasts', async () => {
      server.use(http.post('*/some/form', () => csrfPage('The CSRF tokens do not match.')));

      await Promise.allSettled([client.post('/some/form', {}), client.post('/some/form', {})]);

      const ids = toast.error.mock.calls.map(([, options]) => options.id);
      expect(ids).toEqual(['csrf-expired', 'csrf-expired']);
    });

    it('re-checks the session in the background, in case it is gone altogether', async () => {
      server.use(http.post('*/some/form', () => csrfPage('The CSRF session token is missing.')));

      await expect(client.post('/some/form', {})).rejects.toMatchObject({ response: { status: 400 } });

      await vi.waitFor(() => expect(useAuthStore.getState().checkAuth).toHaveBeenCalledWith(true));
    });

    it('also recognises a JSON error body that names the CSRF token', async () => {
      server.use(
        http.post('*/some/form', () => HttpResponse.json({ error: 'CSRF token missing' }, { status: 400 }))
      );

      await expect(client.post('/some/form', {})).rejects.toMatchObject({ response: { status: 400 } });

      expect(toast.error).toHaveBeenCalledTimes(1);
    });

    it('leaves an ordinary 400 to its call site', async () => {
      server.use(
        http.post('*/some/form', () => HttpResponse.json({ error: 'Name is required' }, { status: 400 }))
      );

      await expect(client.post('/some/form', {})).rejects.toMatchObject({ response: { status: 400 } });
      await settle();

      expect(toast.error).not.toHaveBeenCalled();
      expect(useAuthStore.getState().checkAuth).not.toHaveBeenCalled();
    });

    it('does not mistake a CSRF mention in a non-400 response for an expired token', async () => {
      server.use(http.post('*/some/form', () => new HttpResponse('CSRF', { status: 500 })));

      await expect(client.post('/some/form', {})).rejects.toMatchObject({ response: { status: 500 } });
      await settle();

      expect(toast.error).not.toHaveBeenCalled();
    });

    it('ignores a 400 with no readable body, such as a blob download', async () => {
      server.use(http.get('*/some/export', () => new HttpResponse(null, { status: 400 })));

      await expect(client.get('/some/export', { responseType: 'blob' })).rejects.toMatchObject({
        response: { status: 400 },
      });
      await settle();

      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe('timeouts', () => {
    // Resolves with the timeout the request finally carried, without touching the network
    const timeoutOf = async (config) => {
      let seen;
      await client.request({
        ...config,
        adapter: async (finalConfig) => {
          seen = finalConfig.timeout;
          return { data: {}, status: 200, statusText: 'OK', headers: {}, config: finalConfig };
        },
      });
      return seen;
    };

    it('gives ordinary requests a default timeout so a hung server cannot spin forever', async () => {
      expect(client.defaults.timeout).toBe(30000);
      expect(await timeoutOf({ method: 'get', url: '/api/anything' })).toBe(30000);
      expect(await timeoutOf({ method: 'post', url: '/api/anything', data: { a: 1 } })).toBe(30000);
    });

    it('lifts the timeout for uploads, which can outlast it on a slow connection', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['x']), 'x.txt');

      expect(await timeoutOf({ method: 'post', url: '/api/submissions', data: formData })).toBe(0);
    });

    it('allows blob downloads, which are generated server side, a longer wait', async () => {
      expect(await timeoutOf({ method: 'get', url: '/api/admin/export/transactions', responseType: 'blob' })).toBe(300000);
    });

    it('keeps a timeout that the call site chose itself', async () => {
      const formData = new FormData();

      expect(await timeoutOf({ method: 'get', url: '/user/api/auth/status', timeout: 10000 })).toBe(10000);
      expect(await timeoutOf({ method: 'post', url: '/upload', data: formData, timeout: 60000 })).toBe(60000);
      expect(await timeoutOf({ method: 'get', url: '/export', responseType: 'blob', timeout: 5000 })).toBe(5000);
    });
  });
});
