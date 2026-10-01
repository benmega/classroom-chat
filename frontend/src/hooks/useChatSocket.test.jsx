import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import useChatSocket, { getSocket, resetSocket } from './useChatSocket';
import * as socketIoClient from 'socket.io-client';

vi.mock('socket.io-client', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
    connected: true
  };
  return {
    io: vi.fn(() => mockSocket)
  };
});

describe('useChatSocket Hook', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize socket connection', () => {
    const { result } = renderHook(() => useChatSocket());
    expect(socketIoClient.io).toHaveBeenCalled();
    expect(result.current.isConnected).toBe(true);
  });

  it('should attach and detach event listeners', () => {
    const { unmount } = renderHook(() => useChatSocket());
    const mockSocket = socketIoClient.io();
    expect(mockSocket.on).toHaveBeenCalledWith('message_received', expect.any(Function));
    
    unmount();
    expect(mockSocket.off).toHaveBeenCalledWith('message_received', expect.any(Function));
  });

  it('should call sendMessage properly', () => {
    const { result } = renderHook(() => useChatSocket());
    const mockSocket = socketIoClient.io();
    
    result.current.sendMessage({ text: 'Hello' });
    expect(mockSocket.emit).toHaveBeenCalledWith('send_message', { text: 'Hello' });
  });

  it('should call sendMessage with callback', () => {
    const { result } = renderHook(() => useChatSocket());
    const mockSocket = socketIoClient.io();
    const cb = vi.fn();
    
    result.current.sendMessage({ text: 'Hello' }, cb);
    expect(mockSocket.emit).toHaveBeenCalledWith('send_message', { text: 'Hello' }, cb);
  });

  it('should handle sendMessage when not connected', () => {
    const mockSocket = socketIoClient.io();
    mockSocket.connected = false;
    const { result } = renderHook(() => useChatSocket());
    const cb = vi.fn();
    
    result.current.sendMessage({ text: 'Hello' }, cb);
    expect(cb).toHaveBeenCalledWith({ success: false, error: 'Socket not connected.' });

    // without callback
    result.current.sendMessage({ text: 'Hello2' });
    expect(mockSocket.emit).not.toHaveBeenCalledWith('send_message', { text: 'Hello2' });
    mockSocket.connected = true; // reset for other tests
  });

  it('should handle socket events and call passed callbacks', () => {
    const onMessageReceived = vi.fn();
    const onClassroomEnrolled = vi.fn();
    const lifecycleCallbacks = {
      onConversationCreated: vi.fn(),
      onConversationUpdated: vi.fn(),
      onConversationDeleted: vi.fn(),
      onMessageDeleted: vi.fn()
    };
    const onActivityResolved = vi.fn();

    const { result } = renderHook(() => useChatSocket(
      onMessageReceived,
      onClassroomEnrolled,
      lifecycleCallbacks,
      onActivityResolved
    ));

    const mockSocket = socketIoClient.io();
    
    // Extract the event handlers
    const handlers = {};
    mockSocket.on.mock.calls.forEach(([event, handler]) => {
      handlers[event] = handler;
    });

    act(() => handlers['connect']());
    expect(result.current.isConnected).toBe(true);
    
    act(() => handlers['disconnect']());
    expect(result.current.isConnected).toBe(false);
    
    act(() => handlers['connect_error']());
    expect(result.current.isConnected).toBe(false);

    handlers['message_received']({ id: 1 });
    expect(onMessageReceived).toHaveBeenCalledWith({ id: 1 });

    handlers['classroom_enrolled']({ id: 2 });
    expect(onClassroomEnrolled).toHaveBeenCalledWith({ id: 2 });

    handlers['conversation_created']({ id: 3 });
    expect(lifecycleCallbacks.onConversationCreated).toHaveBeenCalledWith({ id: 3 });

    handlers['conversation_updated']({ id: 4 });
    expect(lifecycleCallbacks.onConversationUpdated).toHaveBeenCalledWith({ id: 4 });

    handlers['conversation_deleted']({ id: 5 });
    expect(lifecycleCallbacks.onConversationDeleted).toHaveBeenCalledWith({ id: 5 });

    handlers['message_deleted']({ id: 6 });
    expect(lifecycleCallbacks.onMessageDeleted).toHaveBeenCalledWith({ id: 6 });

    handlers['activity_resolved']({ id: 7 });
    expect(onActivityResolved).toHaveBeenCalledWith({ id: 7 });
  });

  describe('resetSocket', () => {
    it('disconnects the socket, drops its listeners and forces a fresh one next time', () => {
      renderHook(() => useChatSocket());
      const mockSocket = socketIoClient.io();
      socketIoClient.io.mockClear();

      resetSocket();

      expect(mockSocket.removeAllListeners).toHaveBeenCalledTimes(1);
      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
      expect(socketIoClient.io).not.toHaveBeenCalled();
      getSocket();
      expect(socketIoClient.io).toHaveBeenCalledTimes(1);
      getSocket();
      expect(socketIoClient.io).toHaveBeenCalledTimes(1);
    });

    it('does nothing when there is no socket', () => {
      resetSocket();
      const mockSocket = socketIoClient.io();
      mockSocket.disconnect.mockClear();

      resetSocket();

      expect(mockSocket.disconnect).not.toHaveBeenCalled();
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
    resetSocket();
    socketIoClient.io.mockClear();

    getSocket();

    const [, options] = socketIoClient.io.mock.calls[0];
    expect(options.withCredentials).toBe(true);
    expect(options).not.toHaveProperty('extraHeaders');
  });

  describe('server-initiated disconnect', () => {
    const disconnectHandler = () => {
      const call = socketIoClient.io().on.mock.calls.find(([event]) => event === 'disconnect');
      return call[1];
    };

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('reconnects after a pause, because socket.io does not retry on its own', () => {
      const { result } = renderHook(() => useChatSocket());
      const mockSocket = socketIoClient.io();

      act(() => disconnectHandler()('io server disconnect'));

      expect(result.current.isConnected).toBe(false);
      expect(mockSocket.connect).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1000));
      expect(mockSocket.connect).toHaveBeenCalledTimes(1);
    });

    it('leaves reconnecting to socket.io for every other reason', () => {
      renderHook(() => useChatSocket());
      const mockSocket = socketIoClient.io();

      act(() => disconnectHandler()('transport close'));
      act(() => vi.advanceTimersByTime(5000));

      expect(mockSocket.connect).not.toHaveBeenCalled();
    });

    it('does not reconnect a socket that was reset in the meantime', () => {
      renderHook(() => useChatSocket());
      const mockSocket = socketIoClient.io();

      act(() => disconnectHandler()('io server disconnect'));
      resetSocket();
      act(() => vi.advanceTimersByTime(5000));

      expect(mockSocket.connect).not.toHaveBeenCalled();
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
