import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
vi.mock('./pages/General/Landing', () => ({
  default: () => <div>Landing Page Mock</div>
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
vi.mock('./pages/Auth/Login', () => ({
  default: () => <div>Login Page Mock</div>
}));
vi.mock('./pages/Error/AccessDenied', () => ({
  default: () => <div>Access Denied Mock</div>
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

  it('renders landing page initially when not authenticated', () => {
    useAuthStore.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      isServerOffline: false,
      user: null,
      checkAuth: vi.fn(),
    });

    renderApp();
    expect(screen.getByText('Landing Page Mock')).toBeInTheDocument();
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

  it('redirects authenticated student away from /login to /chat', () => {
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
    expect(screen.getByText('Chat Page Mock')).toBeInTheDocument();
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

  it('redirects parent role to /parent/dashboard from protected routes', () => {
    window.history.pushState({}, 'Test page', '/chat');
    useAuthStore.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      isServerOffline: false,
      user: { role: 'parent', is_admin: false },
      checkAuth: vi.fn(),
    });

    renderApp();
    // Parents should be redirected away from /chat to parent dashboard
    expect(screen.getByText('Parent Dashboard Mock')).toBeInTheDocument();
    expect(screen.queryByText('Chat Page Mock')).not.toBeInTheDocument();
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
});
