import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const getSocketUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  
  // Use same origin in both dev and prod to leverage Vite proxy/same-host serving.
  // Vite is configured to proxy /socket.io in vite.config.js
  return `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`;
};

const SOCKET_URL = getSocketUrl();

// Singleton socket instance
let _socket = null;

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
};

const getSocket = () => {
  if (!_socket) {
    _socket = io(SOCKET_URL, {
      withCredentials: true,
      extraHeaders: {
        'X-CSRFToken': getCookie('csrf_token')
      },
      // Polling first then upgrade is more reliable through proxies.
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
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
