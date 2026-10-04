import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';
import useAuthStore from './store/useAuthStore';
import useLogout from './hooks/useLogout';

// Unlike App.test.jsx this runs the real auth store, so it can show how the route guard and the
// sign-out work together: the guard remembers the page when a session ends, but not on a deliberate sign-out.
vi.mock('./pages/General/Landing', () => ({ default: () => <div>Landing Page Mock</div> }));
vi.mock('./pages/Chat/Chat', () => ({ default: () => <div>Chat Page Mock</div> }));
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
});
