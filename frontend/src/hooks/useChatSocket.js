import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const getSocketUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  
  // Use same origin in both dev and prod to leverage Vite proxy/same-host serving.
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
        'X-CSRFToken': getCookie('csrf_token_v2')
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
 * @param {Function} onClassroomEnrolled - Callback for 'classroom_enrolled' events
 * @param {Object} lifecycleCallbacks - Optional callbacks for conversation lifecycle events
 */
const useChatSocket = (onMessageReceived, onClassroomEnrolled, lifecycleCallbacks = {}) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(() => getSocket().connected);

  // Keep callbacks in refs so we never need to re-subscribe
  const messageCallbackRef = useRef(onMessageReceived);
  const enrolledCallbackRef = useRef(onClassroomEnrolled);
  const lifecycleRefs = useRef(lifecycleCallbacks);

  useEffect(() => { messageCallbackRef.current = onMessageReceived; }, [onMessageReceived]);
  useEffect(() => { enrolledCallbackRef.current = onClassroomEnrolled; }, [onClassroomEnrolled]);
  useEffect(() => { lifecycleRefs.current = lifecycleCallbacks; }, [lifecycleCallbacks]);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onConnectError = () => setIsConnected(false);

    const onMessage = (data) => messageCallbackRef.current?.(data);
    const onEnrolled = (data) => enrolledCallbackRef.current?.(data);
    
    const onCreated = (data) => lifecycleRefs.current?.onConversationCreated?.(data);
    const onUpdated = (data) => lifecycleRefs.current?.onConversationUpdated?.(data);
    const onDeleted = (data) => lifecycleRefs.current?.onConversationDeleted?.(data);
    const onMsgDeleted = (data) => lifecycleRefs.current?.onMessageDeleted?.(data);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('message_received', onMessage);
    socket.on('classroom_enrolled', onEnrolled);
    socket.on('conversation_created', onCreated);
    socket.on('conversation_updated', onUpdated);
    socket.on('conversation_deleted', onDeleted);
    socket.on('message_deleted', onMsgDeleted);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('message_received', onMessage);
      socket.off('classroom_enrolled', onEnrolled);
      socket.off('conversation_created', onCreated);
      socket.off('conversation_updated', onUpdated);
      socket.off('conversation_deleted', onDeleted);
      socket.off('message_deleted', onMsgDeleted);
    };
  }, []);

  /**
   * Emit 'send_message' event to the server
   * @param {Object} messageData - The message object containing content, conversation_id, etc.
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
