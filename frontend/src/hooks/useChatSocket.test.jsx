import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import toast from 'react-hot-toast';
import useChatSocket, { getSocket, resetSocket } from './useChatSocket';
import useAuthStore from '../store/useAuthStore';
import { SOCKET_EVENTS } from '../constants/socketEvents';
import { getAbsoluteApiBaseUrl } from '../utils/apiUrl';
import * as socketIoClient from 'socket.io-client';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }));

// A socket stand-in with a tiny emitter: on/off keep the registered handlers and trigger() plays a
// server or transport event into them, as socket.io would.
const { createMockSocket } = vi.hoisted(() => ({
  createMockSocket: (connected = true) => {
    const handlers = {};
    const socket = {
      connected,
      handlers,
      on: vi.fn((event, handler) => {
        (handlers[event] ||= new Set()).add(handler);
        return socket;
      }),
      off: vi.fn((event, handler) => {
        handlers[event]?.delete(handler);
        return socket;
      }),
      emit: vi.fn(),
      // socket.timeout(ms) returns the socket itself with the wait remembered for the next emit
      timeout: vi.fn(() => socket),
      connect: vi.fn(),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(() => {
        Object.keys(handlers).forEach((event) => delete handlers[event]);
      }),
      trigger: (event, ...args) => [...(handlers[event] || [])].forEach((handler) => handler(...args)),
    };
    return socket;
  },
}));

// Every io() call opens a brand new socket, so a test never inherits one from an earlier test
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => createMockSocket()),
}));

const signIn = () => useAuthStore.setState({ isAuthenticated: true, user: { id: 1, username: 'student' } });
const signOut = () => useAuthStore.setState({ isAuthenticated: false, user: null });

describe('useChatSocket Hook', () => {
  beforeEach(() => {
    // The chat socket only opens for a signed-in user
    signIn();
    // The socket is a module-level singleton: drop the one a previous test left behind
    resetSocket();
    vi.clearAllMocks();
  });

  afterEach(() => {
    signOut();
    resetSocket();
  });

  it('should initialize socket connection', () => {
    const { result } = renderHook(() => useChatSocket());
    expect(socketIoClient.io).toHaveBeenCalledTimes(1);
    // Still connecting
    expect(result.current.isConnected).toBe(false);

    act(() => getSocket().trigger('connect'));

    expect(result.current.isConnected).toBe(true);
  });

  it('starts out connected when another hook has already opened a connected socket', () => {
    getSocket();
    socketIoClient.io.mockClear();

    const { result } = renderHook(() => useChatSocket());

    expect(result.current.isConnected).toBe(true);
    expect(socketIoClient.io).not.toHaveBeenCalled();
  });

  it('should attach and detach event listeners', () => {
    const { unmount } = renderHook(() => useChatSocket());
    const socket = getSocket();
    expect(socket.on).toHaveBeenCalledWith('message_received', expect.any(Function));

    unmount();
    expect(socket.off).toHaveBeenCalledWith('message_received', expect.any(Function));
    // Every handler that was registered is gone again
    expect(Object.values(socket.handlers).every((set) => set.size === 0)).toBe(true);
  });

  it('should handle sendMessage when not connected', () => {
    getSocket().connected = false;
    const { result } = renderHook(() => useChatSocket());
    const cb = vi.fn();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    result.current.sendMessage({ text: 'Hello' }, cb);
    expect(cb).toHaveBeenCalledWith({ success: false, error: 'Socket not connected.' });

    // without callback
    result.current.sendMessage({ text: 'Hello2' });
    expect(getSocket().emit).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('should handle socket events and call passed callbacks', () => {
    const onMessageReceived = vi.fn();
    const onClassroomEnrolled = vi.fn();
    const lifecycleCallbacks = {
      onMessageDeleted: vi.fn()
    };
    const onActivityResolved = vi.fn();

    const { result } = renderHook(() => useChatSocket(
      onMessageReceived,
      onClassroomEnrolled,
      lifecycleCallbacks,
      onActivityResolved
    ));

    const socket = getSocket();

    act(() => socket.trigger('connect'));
    expect(result.current.isConnected).toBe(true);

    act(() => socket.trigger('disconnect'));
    expect(result.current.isConnected).toBe(false);

    act(() => socket.trigger('connect_error'));
    expect(result.current.isConnected).toBe(false);

    socket.trigger('message_received', { id: 1 });
    expect(onMessageReceived).toHaveBeenCalledWith({ id: 1 });

    socket.trigger('classroom_enrolled', { id: 2 });
    expect(onClassroomEnrolled).toHaveBeenCalledWith({ id: 2 });

    socket.trigger('message_deleted', { id: 6 });
    expect(lifecycleCallbacks.onMessageDeleted).toHaveBeenCalledWith({ id: 6 });

    socket.trigger('activity_resolved', { id: 7 });
    expect(onActivityResolved).toHaveBeenCalledWith({ id: 7 });
  });

  it('ignores events that arrive while no callback was given', () => {
    renderHook(() => useChatSocket());
    const socket = getSocket();

    expect(() => {
      socket.trigger('message_received', { id: 1 });
      socket.trigger('classroom_enrolled', { id: 2 });
      socket.trigger('message_deleted', { id: 3 });
      socket.trigger('activity_resolved', { id: 4 });
    }).not.toThrow();
  });

  describe('callbacks that change between renders', () => {
    const makeCallbacks = () => ({
      onMessageReceived: vi.fn(),
      onClassroomEnrolled: vi.fn(),
      lifecycle: { onMessageDeleted: vi.fn() },
      onActivityResolved: vi.fn(),
    });
    const useWith = ({ cb }) =>
      useChatSocket(cb.onMessageReceived, cb.onClassroomEnrolled, cb.lifecycle, cb.onActivityResolved);

    it('lets the handlers that are already registered call the latest callbacks', () => {
      const first = makeCallbacks();
      const second = makeCallbacks();
      const { rerender } = renderHook(useWith, { initialProps: { cb: first } });
      const socket = getSocket();
      // Handlers as they were registered on mount
      const registered = Object.fromEntries(
        Object.entries(socket.handlers).map(([event, set]) => [event, [...set][0]])
      );

      rerender({ cb: second });

      act(() => {
        registered.message_received({ id: 1 });
        registered.classroom_enrolled({ id: 2 });
        registered.message_deleted({ id: 3 });
        registered.activity_resolved({ id: 4 });
      });
      expect(second.onMessageReceived).toHaveBeenCalledWith({ id: 1 });
      expect(second.onClassroomEnrolled).toHaveBeenCalledWith({ id: 2 });
      expect(second.lifecycle.onMessageDeleted).toHaveBeenCalledWith({ id: 3 });
      expect(second.onActivityResolved).toHaveBeenCalledWith({ id: 4 });
      expect(first.onMessageReceived).not.toHaveBeenCalled();
      expect(first.onClassroomEnrolled).not.toHaveBeenCalled();
      expect(first.lifecycle.onMessageDeleted).not.toHaveBeenCalled();
      expect(first.onActivityResolved).not.toHaveBeenCalled();
    });

    it('does not subscribe again when the callbacks change', () => {
      const { rerender, unmount } = renderHook(useWith, { initialProps: { cb: makeCallbacks() } });
      const socket = getSocket();
      const subscriptions = socket.on.mock.calls.length;
      expect(subscriptions).toBeGreaterThan(0);

      rerender({ cb: makeCallbacks() });
      rerender({ cb: makeCallbacks() });

      expect(socket.on).toHaveBeenCalledTimes(subscriptions);
      expect(socket.off).not.toHaveBeenCalled();

      unmount();
      expect(socket.off).toHaveBeenCalledTimes(subscriptions);
    });

    it('keeps reaching the live callback after an event was delivered to the old one', () => {
      const first = makeCallbacks();
      const second = makeCallbacks();
      const { rerender } = renderHook(useWith, { initialProps: { cb: first } });
      const socket = getSocket();

      socket.trigger('message_received', { id: 1 });
      rerender({ cb: second });
      socket.trigger('message_received', { id: 2 });

      expect(first.onMessageReceived).toHaveBeenCalledTimes(1);
      expect(first.onMessageReceived).toHaveBeenCalledWith({ id: 1 });
      expect(second.onMessageReceived).toHaveBeenCalledTimes(1);
      expect(second.onMessageReceived).toHaveBeenCalledWith({ id: 2 });
    });
  });

  describe('achievement_unlocked', () => {
    it('toasts every new award', () => {
      renderHook(() => useChatSocket());

      getSocket().trigger('achievement_unlocked', { new_awards: [{ name: 'First Duck' }, { name: 'Streak' }] });

      expect(toast.success).toHaveBeenCalledTimes(2);
      expect(toast.success).toHaveBeenCalledWith('Achievement Unlocked: First Duck!', expect.any(Object));
      expect(toast.success).toHaveBeenCalledWith('Achievement Unlocked: Streak!', expect.any(Object));
    });

    it('stays quiet when there is nothing new', () => {
      renderHook(() => useChatSocket());

      getSocket().trigger('achievement_unlocked', { new_awards: [] });
      getSocket().trigger('achievement_unlocked', undefined);

      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('connection and reconnection', () => {
    it('opens one socket against the API origin, with credentials, retrying forever', () => {
      renderHook(() => useChatSocket());

      expect(socketIoClient.io).toHaveBeenCalledTimes(1);
      expect(socketIoClient.io).toHaveBeenCalledWith(
        getAbsoluteApiBaseUrl(),
        expect.objectContaining({
          withCredentials: true,
          transports: ['polling', 'websocket'],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
        })
      );
    });

    it('shares one socket between hooks and getSocket() callers', () => {
      const first = renderHook(() => useChatSocket());
      const second = renderHook(() => useChatSocket());
      act(() => getSocket().trigger('connect'));

      expect(socketIoClient.io).toHaveBeenCalledTimes(1);
      expect(getSocket()).toBe(getSocket());
      expect(first.result.current.socket).toBe(getSocket());
      expect(second.result.current.socket).toBe(getSocket());
    });

    it('starts out disconnected when the socket is still connecting', () => {
      socketIoClient.io.mockImplementationOnce(() => createMockSocket(false));

      const { result } = renderHook(() => useChatSocket());

      expect(result.current.isConnected).toBe(false);
    });

    it('follows the socket through a lost connection and the reconnect that follows', () => {
      const { result } = renderHook(() => useChatSocket());
      const socket = getSocket();
      act(() => socket.trigger('connect'));
      expect(result.current.isConnected).toBe(true);

      act(() => socket.trigger('disconnect', 'transport close'));
      expect(result.current.isConnected).toBe(false);

      // socket.io keeps retrying on its own: a failed attempt, then one that gets through
      act(() => socket.trigger('connect_error', new Error('xhr poll error')));
      expect(result.current.isConnected).toBe(false);

      act(() => socket.trigger('connect'));
      expect(result.current.isConnected).toBe(true);
      // The hook did not open a second socket to recover
      expect(socketIoClient.io).toHaveBeenCalledTimes(1);
    });

    it('can send again once the socket has reconnected', () => {
      const { result } = renderHook(() => useChatSocket());
      const socket = getSocket();
      const cb = vi.fn();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      socket.connected = false;
      act(() => socket.trigger('disconnect', 'transport close'));
      result.current.sendMessage({ text: 'lost' }, cb);
      expect(cb).toHaveBeenCalledWith({ success: false, error: 'Socket not connected.' });
      expect(socket.emit).not.toHaveBeenCalled();

      socket.connected = true;
      act(() => socket.trigger('connect'));
      result.current.sendMessage({ text: 'back' });
      expect(socket.emit).toHaveBeenCalledWith('send_message', { text: 'back' });
      warn.mockRestore();
    });
  });

  describe('sending a message', () => {
    it('emits without waiting for an answer when no callback is given', () => {
      const { result } = renderHook(() => useChatSocket());
      const socket = getSocket();

      result.current.sendMessage({ text: 'Hello' });

      expect(socket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.SEND_MESSAGE, { text: 'Hello' });
      expect(socket.timeout).not.toHaveBeenCalled();
    });

    it('waits at most 5 seconds for the acknowledgement', () => {
      const { result } = renderHook(() => useChatSocket());
      const socket = getSocket();

      result.current.sendMessage({ text: 'Hello' }, vi.fn());

      expect(socket.timeout).toHaveBeenCalledWith(5000);
      expect(socket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.SEND_MESSAGE, { text: 'Hello' }, expect.any(Function));
    });

    it('hands the answer of the server to the callback unchanged', () => {
      const { result } = renderHook(() => useChatSocket());
      const socket = getSocket();
      const cb = vi.fn();
      result.current.sendMessage({ text: 'Hello' }, cb);
      const acknowledge = socket.emit.mock.calls[0][2];

      acknowledge(null, { success: false, error: 'You are currently muted' });

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith({ success: false, error: 'You are currently muted' });
    });

    it('answers a success with the success of the server', () => {
      const { result } = renderHook(() => useChatSocket());
      const socket = getSocket();
      const cb = vi.fn();
      result.current.sendMessage({ text: 'Hello' }, cb);

      socket.emit.mock.calls[0][2](undefined, { success: true, new_awards: [] });

      expect(cb).toHaveBeenCalledWith({ success: true, new_awards: [] });
    });

    it('fails the send when the acknowledgement does not arrive in time', () => {
      const { result } = renderHook(() => useChatSocket());
      const socket = getSocket();
      const cb = vi.fn();
      result.current.sendMessage({ text: 'Hello' }, cb);

      // What socket.io does when the wait runs out
      socket.emit.mock.calls[0][2](new Error('operation has timed out'));

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith({ success: false, error: expect.stringContaining('did not confirm') });
    });

    it('fails the send when the connection drops before the answer', () => {
      const { result } = renderHook(() => useChatSocket());
      const socket = getSocket();
      const cb = vi.fn();
      result.current.sendMessage({ text: 'Hello' }, cb);

      socket.emit.mock.calls[0][2](new Error('socket has been disconnected'));

      expect(cb).toHaveBeenCalledWith({ success: false, error: expect.stringContaining('did not confirm') });
    });
  });

  describe('when nobody is signed in', () => {
    beforeEach(() => {
      signOut();
    });

    it('opens no socket and reports not connected', () => {
      const { result } = renderHook(() => useChatSocket());

      expect(socketIoClient.io).not.toHaveBeenCalled();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.socket).toBeNull();
    });

    it('still opens none when the page re-renders or several hooks mount', () => {
      const first = renderHook(() => useChatSocket());
      renderHook(() => useChatSocket());

      first.rerender();

      expect(socketIoClient.io).not.toHaveBeenCalled();
    });

    it('refuses to send, with the same answer as a socket that is down', () => {
      const { result } = renderHook(() => useChatSocket());
      const cb = vi.fn();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      result.current.sendMessage({ text: 'Hello' }, cb);

      expect(cb).toHaveBeenCalledWith({ success: false, error: 'Socket not connected.' });
      expect(socketIoClient.io).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('opens the socket once the user signs in', () => {
      const { result } = renderHook(() => useChatSocket());
      expect(socketIoClient.io).not.toHaveBeenCalled();

      act(() => signIn());
      act(() => getSocket().trigger('connect'));

      expect(socketIoClient.io).toHaveBeenCalledTimes(1);
      expect(result.current.socket).toBe(getSocket());
      expect(result.current.isConnected).toBe(true);
    });

    it('never reuses a socket that was open while nobody was signed in', () => {
      // Whoever opened it (any caller of getSocket()), the server refused its handshake
      const refused = getSocket();
      const { result } = renderHook(() => useChatSocket());

      act(() => signIn());
      act(() => getSocket().trigger('connect'));

      expect(refused.disconnect).toHaveBeenCalledTimes(1);
      expect(result.current.socket).not.toBe(refused);
      expect(result.current.socket).toBe(getSocket());
    });
  });

  describe('across sign-ins and sign-outs', () => {
    it('closes the socket on sign-out and drops its listeners', () => {
      const { result } = renderHook(() => useChatSocket());
      const socket = getSocket();
      act(() => socket.trigger('connect'));
      expect(result.current.isConnected).toBe(true);

      act(() => signOut());

      expect(socket.disconnect).toHaveBeenCalledTimes(1);
      expect(socket.removeAllListeners).toHaveBeenCalledTimes(1);
      expect(result.current.socket).toBeNull();
      expect(result.current.isConnected).toBe(false);
    });

    it('opens a fresh socket for the next user, never the one of the previous session', () => {
      const { result } = renderHook(() => useChatSocket());
      const previous = getSocket();

      act(() => signOut());
      act(() => signIn());
      act(() => getSocket().trigger('connect'));

      expect(socketIoClient.io).toHaveBeenCalledTimes(2);
      expect(result.current.socket).not.toBe(previous);
      expect(result.current.socket).toBe(getSocket());
      expect(result.current.isConnected).toBe(true);
    });

    it('hears events on the new socket and no longer on the old one', () => {
      const onMessageReceived = vi.fn();
      renderHook(() => useChatSocket(onMessageReceived));
      const previous = getSocket();

      act(() => signOut());
      act(() => signIn());
      previous.trigger('message_received', { id: 1 });
      getSocket().trigger('message_received', { id: 2 });

      expect(onMessageReceived).toHaveBeenCalledTimes(1);
      expect(onMessageReceived).toHaveBeenCalledWith({ id: 2 });
    });

    it('does not touch the socket when something else in the store changes', () => {
      renderHook(() => useChatSocket());
      const socket = getSocket();
      socketIoClient.io.mockClear();

      act(() => useAuthStore.setState({ unreadCount: 4, user: { id: 1, username: 'student', duck_balance: 9 } }));

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socketIoClient.io).not.toHaveBeenCalled();
      expect(getSocket()).toBe(socket);
    });
  });

  describe('resetSocket', () => {
    it('disconnects the socket, drops its listeners and forces a fresh one next time', () => {
      renderHook(() => useChatSocket());
      const socket = getSocket();
      socketIoClient.io.mockClear();

      resetSocket();

      expect(socket.removeAllListeners).toHaveBeenCalledTimes(1);
      expect(socket.disconnect).toHaveBeenCalledTimes(1);
      expect(socketIoClient.io).not.toHaveBeenCalled();
      const fresh = getSocket();
      expect(fresh).not.toBe(socket);
      expect(socketIoClient.io).toHaveBeenCalledTimes(1);
      getSocket();
      expect(socketIoClient.io).toHaveBeenCalledTimes(1);
    });

    it('does nothing when there is no socket', () => {
      const socket = getSocket();
      resetSocket();
      socket.disconnect.mockClear();

      resetSocket();

      expect(socket.disconnect).not.toHaveBeenCalled();
    });

    it('does not open a new socket when a still-mounted hook re-renders', () => {
      const { rerender, result } = renderHook(() => useChatSocket());
      resetSocket();
      socketIoClient.io.mockClear();

      rerender();

      expect(socketIoClient.io).not.toHaveBeenCalled();
      expect(result.current.socket).toBeNull();
    });
  });

  it('opens the socket with the session cookie and no CSRF header', () => {
    getSocket();

    const [, options] = socketIoClient.io.mock.calls[0];
    expect(options.withCredentials).toBe(true);
    expect(options).not.toHaveProperty('extraHeaders');
  });

  describe('server-initiated disconnect', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('reconnects after a pause, because socket.io does not retry on its own', () => {
      const { result } = renderHook(() => useChatSocket());
      const socket = getSocket();

      act(() => socket.trigger('disconnect', 'io server disconnect'));

      expect(result.current.isConnected).toBe(false);
      expect(socket.connect).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1000));
      expect(socket.connect).toHaveBeenCalledTimes(1);
    });

    it('leaves reconnecting to socket.io for every other reason', () => {
      renderHook(() => useChatSocket());
      const socket = getSocket();

      act(() => socket.trigger('disconnect', 'transport close'));
      act(() => vi.advanceTimersByTime(5000));

      expect(socket.connect).not.toHaveBeenCalled();
    });

    it('does not reconnect a socket that was reset in the meantime', () => {
      renderHook(() => useChatSocket());
      const socket = getSocket();

      act(() => socket.trigger('disconnect', 'io server disconnect'));
      resetSocket();
      act(() => vi.advanceTimersByTime(5000));

      expect(socket.connect).not.toHaveBeenCalled();
    });
  });
});

describe('useChatSocket server URL', () => {
  // The URL is resolved when the module loads, so each case imports a fresh copy.
  const connectedUrl = async (viteApiUrl) => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', viteApiUrl);
    const { io } = await import('socket.io-client');
    const { getSocket } = await import('./useChatSocket');
    io.mockClear();
    getSocket();
    return io.mock.calls[0][0];
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('connects to this page origin when VITE_API_URL is unset (the Vite proxy in dev)', async () => {
    expect(await connectedUrl('')).toBe(window.location.origin);
  });

  it('connects to VITE_API_URL when it is set', async () => {
    expect(await connectedUrl('https://api.example.com')).toBe('https://api.example.com');
  });

  it('drops a trailing slash from VITE_API_URL', async () => {
    expect(await connectedUrl('https://api.example.com/')).toBe('https://api.example.com');
  });
});
