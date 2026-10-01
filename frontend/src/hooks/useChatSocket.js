import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { getAbsoluteApiBaseUrl } from '../utils/apiUrl';

// VITE_API_URL when set, otherwise this page's own origin (the Vite proxy in dev,
// same-host serving in prod).
const SOCKET_URL = getAbsoluteApiBaseUrl();

// Singleton socket instance
let _socket = null;

// socket.io does not retry a disconnect the server initiated, so we do it after this pause. The
// pause lets a logout's cleared cookie reach the browser first, or the retry would reuse the old session.
const SERVER_DISCONNECT_RETRY_MS = 1000;

export const getSocket = () => {
  if (!_socket) {
    _socket = io(SOCKET_URL, {
      withCredentials: true,
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
 * Disconnect and discard the singleton socket. The server ties a socket to the session and rooms
 * it had at handshake time, so it must not outlive its login: call this when the session ends and
 * the next getSocket() handshakes again with the cookies of whoever is signed in then.
 * Listeners are removed too, so nothing still holding the old socket keeps receiving events.
 */
export const resetSocket = () => {
  if (!_socket) return;
  _socket.removeAllListeners();
  _socket.disconnect();
  _socket = null;
};

/**
 * Custom hook to manage Socket.io chat connectivity and events.
 * Uses a singleton socket and a stable ref for the callback to
 * prevent reconnect loops on every re-render.
 *
 * @param {Function} onMessageReceived - Callback for 'message_received' events
 * @param {Function} onClassroomEnrolled - Callback for 'classroom_enrolled' events
 * @param {Object} lifecycleCallbacks - Optional callbacks for conversation lifecycle events
 * @param {Function} onActivityResolved - Callback for 'activity_resolved' events
 */
const useChatSocket = (onMessageReceived, onClassroomEnrolled, lifecycleCallbacks = {}, onActivityResolved) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(() => getSocket().connected);

  // Keep callbacks in refs so we never need to re-subscribe
  const messageCallbackRef = useRef(onMessageReceived);
  const enrolledCallbackRef = useRef(onClassroomEnrolled);
  const lifecycleRefs = useRef(lifecycleCallbacks);
  const activityResolvedCallbackRef = useRef(onActivityResolved);

  useEffect(() => { messageCallbackRef.current = onMessageReceived; }, [onMessageReceived]);
  useEffect(() => { enrolledCallbackRef.current = onClassroomEnrolled; }, [onClassroomEnrolled]);
  useEffect(() => { lifecycleRefs.current = lifecycleCallbacks; }, [lifecycleCallbacks]);
  useEffect(() => { activityResolvedCallbackRef.current = onActivityResolved; }, [onActivityResolved]);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // The server dropped us (e.g. another login of this user signed out): reconnect with the
        // cookies as they are now, which the server rejects if the session is gone.
        setTimeout(() => {
          if (_socket === socket) socket.connect();
        }, SERVER_DISCONNECT_RETRY_MS);
      }
    };
    const onConnectError = () => setIsConnected(false);

    const onMessage = (data) => messageCallbackRef.current?.(data);
    const onEnrolled = (data) => enrolledCallbackRef.current?.(data);

    const onCreated = (data) => lifecycleRefs.current?.onConversationCreated?.(data);
    const onUpdated = (data) => lifecycleRefs.current?.onConversationUpdated?.(data);
    const onDeleted = (data) => lifecycleRefs.current?.onConversationDeleted?.(data);
    const onMsgDeleted = (data) => lifecycleRefs.current?.onMessageDeleted?.(data);
    const onActivityResolvedEvent = (data) => activityResolvedCallbackRef.current?.(data);
    const onAchievementUnlocked = (data) => {
      if (data?.new_awards?.length) {
        data.new_awards.forEach((award) => {
          toast.success(`Achievement Unlocked: ${award.name}!`, {
            icon: '🏆',
            duration: 6000,
          });
        });
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('message_received', onMessage);
    socket.on('classroom_enrolled', onEnrolled);
    socket.on('conversation_created', onCreated);
    socket.on('conversation_updated', onUpdated);
    socket.on('conversation_deleted', onDeleted);
    socket.on('message_deleted', onMsgDeleted);
    socket.on('activity_resolved', onActivityResolvedEvent);
    socket.on('achievement_unlocked', onAchievementUnlocked);

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
      socket.off('activity_resolved', onActivityResolvedEvent);
      socket.off('achievement_unlocked', onAchievementUnlocked);
    };
  }, []);

  /**
   * Emit 'send_message' event to the server
   * @param {Object} messageData - The message object containing content, conversation_id, etc.
   * @param {Function} callback - Optional callback for acknowledgment
   */
  const sendMessage = useCallback((messageData, callback) => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      if (callback) {
        socket.emit('send_message', messageData, callback);
      } else {
        socket.emit('send_message', messageData);
      }
    } else {
      console.warn('Socket not connected. Message not sent:', messageData);
      if (callback) {
        callback({ success: false, error: 'Socket not connected.' });
      }
    }
  }, []);

  return {
    isConnected,
    sendMessage,
    // Not getSocket(): re-rendering after resetSocket() must not open a socket for a session that just ended
    socket: _socket,
  };
};

export default useChatSocket;
