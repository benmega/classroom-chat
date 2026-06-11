import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLayout } from './useLayout';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
}));

// Mock useSidebar
vi.mock('./useSidebar', () => ({
  default: () => ({
    isSidebarOpen: false,
    toggleSidebar: vi.fn(),
    setSidebarOpen: vi.fn(),
  }),
}));

// Mock client
vi.mock('../api/client', () => ({
  default: {
    post: vi.fn().mockResolvedValue({}),
  },
}));

let currentStoreState = {
  user: { username: 'testuser', duck_balance: 10 },
  logout: vi.fn(),
  isAuthenticated: true,
  hamburgerProgress: 0,
};

// Mock useAuthStore
vi.mock('../store/useAuthStore', () => ({
  default: () => currentStoreState,
}));

describe('useLayout - Quack sound for earning ducks', () => {
  let playMock;
  let audioConstructorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset initial mock store state
    currentStoreState = {
      user: { username: 'testuser', duck_balance: 10 },
      logout: vi.fn(),
      isAuthenticated: true,
      hamburgerProgress: 0,
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
