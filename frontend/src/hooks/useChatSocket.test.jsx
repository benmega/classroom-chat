import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import useChatSocket from './useChatSocket';
import * as socketIoClient from 'socket.io-client';

vi.mock('socket.io-client', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
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
});