import { renderHook } from '@testing-library/react';
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
});
