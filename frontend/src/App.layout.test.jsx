import React, { useEffect } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Link } from 'react-router-dom';
import App from './App';
import useAuthStore from './store/useAuthStore';

// Runs the real auth store and route table to show that the page chrome is not rebuilt as the user
// moves between pages: it is the header's effects (heartbeat, polling) that would restart if it were.
const layoutMounts = vi.hoisted(() => ({ count: 0 }));

vi.mock('./components/Layout/Layout', () => {
  const LayoutMock = ({ children }) => {
    useEffect(() => {
      layoutMounts.count += 1;
    }, []);
    return (
      <div>
        <Link to="/chat">Go chat</Link>
        <Link to="/activity">Go activity</Link>
        <Link to="/shop">Go shop</Link>
        <Link to="/parent/dashboard">Go parent dashboard</Link>
        <Link to="/parent/course-progress/jane">Go child progress</Link>
        {children}
      </div>
    );
  };
  return { default: LayoutMock };
});
vi.mock('./pages/Chat/Chat', () => ({ default: () => <div>Chat Page Mock</div> }));
vi.mock('./pages/General/Activity', () => ({ default: () => <div>Activity Page Mock</div> }));
vi.mock('./pages/General/Shop', () => ({ default: () => <div>Shop Page Mock</div> }));
vi.mock('./pages/Parent/ParentDashboard', () => ({ default: () => <div>Parent Dashboard Mock</div> }));
vi.mock('./pages/General/CourseProgressTree', () => ({ default: () => <div>Course Progress Mock</div> }));

const signInAs = (user) =>
  useAuthStore.setState({ user, isAuthenticated: true, isLoading: false, isServerOffline: false, checkAuth: vi.fn() });

describe('App layout', () => {
  beforeEach(() => {
    layoutMounts.count = 0;
  });

  afterEach(() => {
    act(() => useAuthStore.getState().clearSession());
  });

  it('keeps the same layout mounted as a student moves between pages', async () => {
    window.history.pushState({}, '', '/chat');
    signInAs({ id: 1, username: 'testuser', role: 'student' });
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText('Chat Page Mock')).toBeInTheDocument();

    await user.click(screen.getByText('Go activity'));
    expect(await screen.findByText('Activity Page Mock')).toBeInTheDocument();
    await user.click(screen.getByText('Go shop'));
    expect(await screen.findByText('Shop Page Mock')).toBeInTheDocument();
    await user.click(screen.getByText('Go chat'));
    expect(await screen.findByText('Chat Page Mock')).toBeInTheDocument();

    expect(layoutMounts.count).toBe(1);
  });

  it('keeps the same layout mounted as a parent moves between their pages', async () => {
    window.history.pushState({}, '', '/parent/dashboard');
    signInAs({ id: 2, username: 'mum', role: 'parent' });
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText('Parent Dashboard Mock')).toBeInTheDocument();

    await user.click(screen.getByText('Go child progress'));
    expect(await screen.findByText('Course Progress Mock')).toBeInTheDocument();
    await user.click(screen.getByText('Go parent dashboard'));
    expect(await screen.findByText('Parent Dashboard Mock')).toBeInTheDocument();

    expect(layoutMounts.count).toBe(1);
  });
});
