import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Custom hook to manage Socket.io chat connectivity and events
 * @param {Function} onMessageReceived - Callback for when 'message_received' is emitted from the backend
 */
const useChatSocket = (onMessageReceived) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection with credentials for session/cookie support
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket.io connected');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('Socket.io disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
      setIsConnected(false);
    });

    // Listen for incoming messages
    if (onMessageReceived) {
      socket.on('message_received', (data) => {
        onMessageReceived(data);
      });
    }

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [onMessageReceived]);

  /**
   * Emit 'send_message' event to the server
   * @param {Object} messageData - The message object containing content, etc.
   */
  const sendMessage = useCallback((messageData) => {
    if (socketRef.current && isConnected) {
      // Ensure we hit the 'send_message' event defined on the backend
      socketRef.current.emit('send_message', messageData);
    } else {
      console.warn('Socket not connected. Message not sent:', messageData);
    }
  }, [isConnected]);

  return { 
    isConnected, 
    sendMessage,
    socket: socketRef.current 
  };
};

export default useChatSocket;
