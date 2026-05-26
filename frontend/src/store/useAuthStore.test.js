import { describe, it, expect, beforeEach } from 'vitest';
import useAuthStore from './useAuthStore';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isServerOffline: false,
    });
  });

  it('initializes with default state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(true);
    expect(state.isServerOffline).toBe(false);
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
    expect(result.error).toBeDefined();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
  });

  it('logout clears state', async () => {
    // Set initial state
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });
    
    await useAuthStore.getState().logout();
    
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
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
