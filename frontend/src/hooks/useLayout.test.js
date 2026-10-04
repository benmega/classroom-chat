import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLayout } from './useLayout';
import client from '../api/client';
import useChatSocket from './useChatSocket';

// Mock react-router-dom
const navigateMock = vi.hoisted(() => vi.fn());
// The page the hook thinks it is on; tests that care set it, the rest stay on '/'
const route = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useLocation: () => ({ pathname: route.pathname }),
}));

// The chat socket is not under test here; keep it from opening a connection
vi.mock('./useChatSocket', () => ({ default: vi.fn() }));

// Mock useSidebar
vi.mock('./useSidebar', () => ({
  default: () => ({
    isSidebarOpen: false,
    toggleSidebar: vi.fn(),
    setSidebarOpen: vi.fn(),
  }),
}));

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({ data: { messages: [] } }),
  },
}));

let currentStoreState = {
  user: { id: 1, username: 'testuser', duck_balance: 10 },
  logout: vi.fn(),
  isAuthenticated: true,
  hamburgerProgress: 0,
  unreadCount: 0,
  setUnreadCount: vi.fn(),
  setLastReadMessageId: vi.fn(),
};

vi.mock('../store/useAuthStore', () => {
  const store = () => currentStoreState;
  store.getState = () => currentStoreState;
  return { default: store };
});

describe('useLayout - Quack sound for earning ducks', () => {
  let playMock;
  let audioConstructorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    currentStoreState = {
      user: { id: 1, username: 'testuser', duck_balance: 10 },
      logout: vi.fn(),
      isAuthenticated: true,
      hamburgerProgress: 0,
      unreadCount: 0,
      setUnreadCount: vi.fn(),
      setLastReadMessageId: vi.fn(),
    };

    // Spy on Audio
    playMock = vi.fn().mockResolvedValue(undefined);
    audioConstructorSpy = vi.fn().mockImplementation((src) => ({
      src,
      volume: 1.0,
      play: playMock,
    }));
    window.Audio = audioConstructorSpy;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not play quack sound on initial load', () => {
    renderHook(() => useLayout());
    expect(audioConstructorSpy).not.toHaveBeenCalled();
  });

  it('plays 1 quack when duck balance increases by a fraction (e.g. 0.5 ducks)', () => {
    const { rerender } = renderHook(() => useLayout());

    // Trigger increase
    currentStoreState = {
      ...currentStoreState,
      user: { ...currentStoreState.user, duck_balance: 10.5 },
    };

    rerender();

    expect(audioConstructorSpy).toHaveBeenCalledTimes(1);
    expect(audioConstructorSpy).toHaveBeenCalledWith('/static/sounds/quack.mp3');
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it('plays multiple quacks when duck balance increases by a larger whole number', () => {
    const { rerender } = renderHook(() => useLayout());

    // Trigger increase by 3 ducks
    currentStoreState = {
      ...currentStoreState,
      user: { ...currentStoreState.user, duck_balance: 13 },
    };

    rerender();

    // First quack should play immediately
    expect(audioConstructorSpy).toHaveBeenCalledTimes(1);
    expect(playMock).toHaveBeenCalledTimes(1);

    // Fast-forward interval timers to play the rest
    act(() => {
      vi.advanceTimersByTime(250); // Second quack
    });
    expect(audioConstructorSpy).toHaveBeenCalledTimes(2);

    act(() => {
      vi.advanceTimersByTime(250); // Third quack
    });
    expect(audioConstructorSpy).toHaveBeenCalledTimes(3);

    act(() => {
      vi.advanceTimersByTime(250); // Should not play more since quackCount is 3
    });
    expect(audioConstructorSpy).toHaveBeenCalledTimes(3);
  });

  it('caps the quacks at 100 when earning a very large number of ducks', () => {
    const { rerender } = renderHook(() => useLayout());

    // Trigger massive increase by 190 ducks
    currentStoreState = {
      ...currentStoreState,
      user: { ...currentStoreState.user, duck_balance: 200 },
    };

    rerender();

    // First quack plays immediately
    expect(audioConstructorSpy).toHaveBeenCalledTimes(1);

    // Fast forward through all remaining quacks
    act(() => {
      vi.advanceTimersByTime(250 * 105);
    });

    expect(audioConstructorSpy).toHaveBeenCalledTimes(100);
  });

  it('does not play quack sound when duck balance decreases', () => {
    const { rerender } = renderHook(() => useLayout());

    // Trigger decrease
    currentStoreState = {
      ...currentStoreState,
      user: { ...currentStoreState.user, duck_balance: 8 },
    };

    rerender();

    expect(audioConstructorSpy).not.toHaveBeenCalled();
  });
});

describe('useLayout - heartbeat', () => {
  const HEARTBEAT = '/api/session/heartbeat';
  const heartbeatCalls = () => client.post.mock.calls.filter(([url]) => url === HEARTBEAT);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    client.post.mockResolvedValue({});

    currentStoreState = {
      user: { id: 1, username: 'testuser', duck_balance: 10 },
      logout: vi.fn(),
      isAuthenticated: true,
      hamburgerProgress: 0,
      unreadCount: 0,
      setUnreadCount: vi.fn(),
      setLastReadMessageId: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends a heartbeat on load and then every 30 seconds while logged in', () => {
    renderHook(() => useLayout());
    expect(heartbeatCalls()).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(heartbeatCalls()).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(heartbeatCalls()).toHaveLength(4);
  });

  it('does not send heartbeats when logged out', () => {
    currentStoreState = { ...currentStoreState, user: null, isAuthenticated: false };

    renderHook(() => useLayout());
    act(() => {
      vi.advanceTimersByTime(120000);
    });

    expect(heartbeatCalls()).toHaveLength(0);
  });

  it('stops heartbeating once the session is gone and the store is logged out', () => {
    // A 401 from the heartbeat makes the API client flip the store to logged out
    const { rerender } = renderHook(() => useLayout());
    expect(heartbeatCalls()).toHaveLength(1);

    currentStoreState = { ...currentStoreState, user: null, isAuthenticated: false };
    rerender();
    act(() => {
      vi.advanceTimersByTime(120000);
    });

    expect(heartbeatCalls()).toHaveLength(1);
  });

  it('logs a failed heartbeat and keeps the loop running', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('network down');
    client.post.mockRejectedValue(failure);

    renderHook(() => useLayout());
    await act(async () => {});
    expect(consoleError).toHaveBeenCalledWith('Heartbeat failed:', failure);

    await act(async () => {
      vi.advanceTimersByTime(30000);
    });
    expect(heartbeatCalls()).toHaveLength(2);
    consoleError.mockRestore();
  });
});

describe('useLayout - unread count', () => {
  const UNREAD_URL = '/message/api/unread-count';
  const unreadCalls = () => client.get.mock.calls.filter(([url]) => url === UNREAD_URL);
  const storeWith = (overrides = {}) => {
    currentStoreState = {
      user: { id: 1, username: 'testuser', duck_balance: 10, role: 'student' },
      logout: vi.fn(),
      isAuthenticated: true,
      hamburgerProgress: 0,
      unreadCount: 0,
      setUnreadCount: vi.fn(),
      setLastReadMessageId: vi.fn(),
      ...overrides,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    client.post.mockResolvedValue({});
    client.get.mockResolvedValue({ data: { success: true, count: 0, latest_id: null } });
    storeWith();
  });

  it('asks the server for the count instead of fetching the feed', async () => {
    localStorage.setItem('last_read_message_id_1', '40');
    client.get.mockResolvedValue({ data: { success: true, count: 3, latest_id: 45 } });

    renderHook(() => useLayout());

    await waitFor(() => expect(currentStoreState.setUnreadCount).toHaveBeenCalledWith(3));
    expect(unreadCalls()).toHaveLength(1);
    expect(unreadCalls()[0][1].params).toEqual({ last_read_id: 40 });
    expect(client.get.mock.calls.some(([url]) => String(url).includes('/message/api/feed'))).toBe(false);
    expect(currentStoreState.setLastReadMessageId).toHaveBeenCalledWith(40);
  });

  it('starts from the newest message when there is no read marker yet', async () => {
    client.get.mockResolvedValue({ data: { success: true, count: 0, latest_id: 77 } });

    renderHook(() => useLayout());

    await waitFor(() => expect(currentStoreState.setLastReadMessageId).toHaveBeenCalledWith(77));
    expect(unreadCalls()[0][1].params).toEqual({ last_read_id: null });
    expect(localStorage.getItem('last_read_message_id_1')).toBe('77');
    expect(currentStoreState.setUnreadCount).toHaveBeenCalledWith(0);
  });

  it('shows no unread messages when the feed is empty', async () => {
    renderHook(() => useLayout());

    await waitFor(() => expect(currentStoreState.setUnreadCount).toHaveBeenCalledWith(0));
    expect(currentStoreState.setLastReadMessageId).not.toHaveBeenCalled();
    expect(localStorage.getItem('last_read_message_id_1')).toBeNull();
  });

  it('does not ask for the count when logged out or for a parent', async () => {
    storeWith({ user: null, isAuthenticated: false });
    const { unmount } = renderHook(() => useLayout());
    unmount();

    storeWith({ user: { id: 2, role: 'parent', duck_balance: 0 } });
    renderHook(() => useLayout());
    await act(async () => {});

    expect(unreadCalls()).toHaveLength(0);
  });

  it('logs a failed request and leaves the badge alone', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('network down');
    client.get.mockRejectedValue(failure);

    renderHook(() => useLayout());

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith('Failed to load initial unread messages count:', failure)
    );
    expect(currentStoreState.setUnreadCount).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('ignores a request that was cancelled when the hook unmounted', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const cancelled = Object.assign(new Error('canceled'), { code: 'ERR_CANCELED' });
    client.get.mockRejectedValue(cancelled);

    const { unmount } = renderHook(() => useLayout());
    unmount();
    await act(async () => {});

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('useLayout - logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.post.mockResolvedValue({});
    client.get.mockResolvedValue({ data: { success: true, count: 0, latest_id: null } });
    currentStoreState = {
      user: { id: 1, username: 'testuser', duck_balance: 10 },
      logout: vi.fn().mockResolvedValue(undefined),
      isAuthenticated: true,
      hamburgerProgress: 0,
      unreadCount: 0,
      setUnreadCount: vi.fn(),
      setLastReadMessageId: vi.fn(),
    };
  });

  it('signs out first and only then returns to the landing page', async () => {
    const order = [];
    currentStoreState.logout.mockImplementation(async () => { order.push('logout'); });
    navigateMock.mockImplementation(() => { order.push('navigate'); });
    const { result } = renderHook(() => useLayout());

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(order).toEqual(['logout', 'navigate']);
    expect(navigateMock).toHaveBeenCalledWith('/');
  });
});

describe('useLayout - unread badges fed by the chat socket', () => {
  // The callbacks useLayout hands to useChatSocket: (onMessageReceived, onClassroomEnrolled, lifecycle, onActivityResolved)
  const socketCallbacks = () => {
    const [onMessageReceived, , , onActivityResolved] = useChatSocket.mock.calls.at(-1);
    return { onMessageReceived, onActivityResolved };
  };
  const storeWith = (overrides = {}) => {
    currentStoreState = {
      user: { id: 1, username: 'testuser', duck_balance: 10, role: 'student' },
      logout: vi.fn(),
      isAuthenticated: true,
      hamburgerProgress: 0,
      unreadCount: 4,
      activityUnreadCount: 7,
      setUnreadCount: vi.fn(),
      setLastReadMessageId: vi.fn(),
      setActivityUnreadCount: vi.fn(),
      ...overrides,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    route.pathname = '/shop';
    client.post.mockResolvedValue({});
    client.get.mockResolvedValue({ data: { success: true, count: 0, latest_id: null } });
    storeWith();
  });

  afterEach(() => {
    route.pathname = '/';
  });

  it('counts a new message on top of the stored count when the chat is not open', () => {
    renderHook(() => useLayout());

    socketCallbacks().onMessageReceived({ id: 1 });

    expect(currentStoreState.setUnreadCount).toHaveBeenCalledTimes(1);
    expect(currentStoreState.setUnreadCount).toHaveBeenCalledWith(5);
  });

  it('does not count a message while the chat is open', () => {
    route.pathname = '/chat';
    renderHook(() => useLayout());

    socketCallbacks().onMessageReceived({ id: 1 });

    expect(currentStoreState.setUnreadCount).not.toHaveBeenCalled();
  });

  it('does not count messages for a parent, who has no feed', () => {
    storeWith({ user: { id: 2, role: 'parent', duck_balance: 0 } });
    renderHook(() => useLayout());

    socketCallbacks().onMessageReceived({ id: 1 });

    expect(currentStoreState.setUnreadCount).not.toHaveBeenCalled();
  });

  it('does not count messages for nobody', () => {
    storeWith({ user: null, isAuthenticated: false });
    renderHook(() => useLayout());

    socketCallbacks().onMessageReceived({ id: 1 });

    expect(currentStoreState.setUnreadCount).not.toHaveBeenCalled();
  });

  it('counts a resolved activity on top of the stored count when the activity page is not open', () => {
    renderHook(() => useLayout());

    socketCallbacks().onActivityResolved({ id: 9 });

    expect(currentStoreState.setActivityUnreadCount).toHaveBeenCalledTimes(1);
    expect(currentStoreState.setActivityUnreadCount).toHaveBeenCalledWith(8);
  });

  it('does not count a resolved activity while the activity page is open', () => {
    route.pathname = '/activity';
    renderHook(() => useLayout());

    socketCallbacks().onActivityResolved({ id: 9 });

    expect(currentStoreState.setActivityUnreadCount).not.toHaveBeenCalled();
  });

  it('does not count a resolved activity for a parent', () => {
    storeWith({ user: { id: 2, role: 'parent', duck_balance: 0 } });
    renderHook(() => useLayout());

    socketCallbacks().onActivityResolved({ id: 9 });

    expect(currentStoreState.setActivityUnreadCount).not.toHaveBeenCalled();
  });

  it('counts messages on the activity page and activities in the chat, as each badge is its own', () => {
    route.pathname = '/activity';
    const { unmount } = renderHook(() => useLayout());
    socketCallbacks().onMessageReceived({ id: 1 });
    expect(currentStoreState.setUnreadCount).toHaveBeenCalledWith(5);
    unmount();

    route.pathname = '/chat';
    renderHook(() => useLayout());
    socketCallbacks().onActivityResolved({ id: 9 });
    expect(currentStoreState.setActivityUnreadCount).toHaveBeenCalledWith(8);
  });
});

describe('useLayout - page flags', () => {
  const flagsFor = (pathname) => {
    route.pathname = pathname;
    const { result } = renderHook(() => useLayout());
    return { isGuestPage: result.current.isGuestPage, isChatPage: result.current.isChatPage };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client.post.mockResolvedValue({});
    client.get.mockResolvedValue({ data: { success: true, count: 0, latest_id: null } });
    currentStoreState = {
      user: { id: 1, username: 'testuser', duck_balance: 10, role: 'student' },
      logout: vi.fn(),
      isAuthenticated: true,
      hamburgerProgress: 0,
      unreadCount: 0,
      setUnreadCount: vi.fn(),
      setLastReadMessageId: vi.fn(),
    };
  });

  afterEach(() => {
    route.pathname = '/';
  });

  it.each(['/login', '/signup'])('treats %s as a guest page', (pathname) => {
    expect(flagsFor(pathname)).toEqual({ isGuestPage: true, isChatPage: false });
  });

  it.each(['/', '/chat'])('treats %s as the chat page', (pathname) => {
    expect(flagsFor(pathname)).toEqual({ isGuestPage: false, isChatPage: true });
  });

  it('treats the pages under /chat as the chat page too', () => {
    expect(flagsFor('/chat/room/3')).toEqual({ isGuestPage: false, isChatPage: true });
  });

  it.each(['/shop', '/activity', '/profile', '/admin/dashboard'])('treats %s as neither', (pathname) => {
    expect(flagsFor(pathname)).toEqual({ isGuestPage: false, isChatPage: false });
  });
});
