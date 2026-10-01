import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import client from './client';
import useAuthStore from '../store/useAuthStore';
import { server } from '../test/mocks/server';

// The 401 interceptor is what turns an expired session into the logged-out UI.
// The heartbeat endpoint answers 401 when the session is gone, so it relies on it.
describe('api client', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    useAuthStore.setState({
      user: { id: 1, username: 'testuser' },
      isAuthenticated: true,
      hamburgerProgress: 0.5,
    });
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
});
