import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const getSocketUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return window.location.origin;
};

const SOCKET_URL = getSocketUrl();

// Singleton socket instance — lives for the lifetime of the app,
// not re-created on every component mount.
let _socket = null;

const getSocket = () => {
  if (!_socket || _socket.disconnected) {
    _socket = io(SOCKET_URL, {
      withCredentials: true,
      // Prefer WebSocket from the start to avoid the polling→upgrade
      // handshake that can produce "Invalid frame header" errors when
      // the connection is torn down mid-upgrade.
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
  }
  return _socket;
};

/**
 * Custom hook to manage Socket.io chat connectivity and events.
 * Uses a singleton socket and a stable ref for the callback to
 * prevent reconnect loops on every re-render.
 *
 * @param {Function} onMessageReceived - Callback for 'message_received' events
 */
const useChatSocket = (onMessageReceived) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  // Keep the callback in a ref so we never need to re-subscribe
  // (which would force the socket to reconnect).
  const callbackRef = useRef(onMessageReceived);
  useEffect(() => {
    callbackRef.current = onMessageReceived;
  }, [onMessageReceived]);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // Sync initial state
    if (socket.connected !== isConnected) {
      setIsConnected(socket.connected);
    }

    const onConnect = () => {
      setIsConnected(true);
      console.log('Socket.io connected:', socket.id);
    };

    const onDisconnect = (reason) => {
      setIsConnected(false);
      console.log('Socket.io disconnected:', reason);
    };

    const onConnectError = (error) => {
      console.error('Socket.io connection error:', error.message);
      setIsConnected(false);
    };

    const onMessage = (data) => {
      if (callbackRef.current) {
        callbackRef.current(data);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('message_received', onMessage);

    // Cleanup: remove only our listeners, don't disconnect the socket
    // (it's shared and should persist across page navigations).
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('message_received', onMessage);
    };
  }, []); // Empty deps — socket is set up once, callback is accessed via ref

  /**
   * Emit 'send_message' event to the server
   * @param {Object} messageData - The message object containing content, etc.
   */
  const sendMessage = useCallback((messageData) => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit('send_message', messageData);
    } else {
      console.warn('Socket not connected. Message not sent:', messageData);
    }
  }, []);

  return {
    isConnected,
    sendMessage,
    socket: getSocket(),
  };
};

export default useChatSocket;
