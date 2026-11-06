import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore';
import { SOCKET_EVENTS, SERVER_DISCONNECT_REASON } from '../constants/socketEvents';
import { getAbsoluteApiBaseUrl } from '../utils/apiUrl';

// VITE_API_URL when set, otherwise the origin of this page (the Vite proxy in dev,
// same-host serving in prod).
const SOCKET_URL = getAbsoluteApiBaseUrl();

let _socket = null;

// socket.io does not retry a disconnect the server initiated, so we do it after this pause. The
// pause lets the cookie a logout cleared reach the browser first, or the retry would reuse the old session.
const SERVER_DISCONNECT_RETRY_MS = 1000;

// How long a send waits for the acknowledgement of the server before it counts as lost. The server
// answers after saving the message, so a healthy connection is well inside this.
const SEND_ACK_TIMEOUT_MS = 5000;
const SEND_UNCONFIRMED_ERROR = 'The server did not confirm your message. Check your connection and try again.';

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
 * it had at handshake time, so it must not outlive its login: the auth store calls this whenever the
 * session starts or ends, and the next getSocket() handshakes again with the cookies of whoever is
 * signed in then. A socket the server refused (it answers an anonymous handshake with a namespace
 * error, which socket.io treats as final and never retries) is thrown away the same way.
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
 * prevent reconnect loops on every re-render. The socket is opened here, in an effect, and only while
 * the user is signed in: the server refuses anonymous handshakes, so a public page must not make one.
 *
 * @param {Function} onMessageReceived - Callback for 'message_received' events
 * @param {Function} onClassroomEnrolled - Callback for 'classroom_enrolled' events
 * @param {Object} lifecycleCallbacks - Optional callbacks; currently only onMessageDeleted
 * @param {Function} onActivityResolved - Callback for 'activity_resolved' events
 */
const useChatSocket = (onMessageReceived, onClassroomEnrolled, lifecycleCallbacks = {}, onActivityResolved) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const socketRef = useRef(null);
  // Starts from the socket another hook has already opened, if any. Never opens one here: that is the
  // job of the effect below, and only for a signed-in user.
  const [isConnected, setIsConnected] = useState(() => isAuthenticated && _socket !== null && _socket.connected);

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
    if (!isAuthenticated) return undefined;

    // The auth store resets the socket on every sign-in and sign-out, so this one handshakes with
    // the cookies of the session that is live now
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = (reason) => {
      setIsConnected(false);
      if (reason === SERVER_DISCONNECT_REASON) {
        // The server dropped us (for example another login of this user signed out): reconnect with the
        // cookies as they are now, which the server rejects if the session is gone.
        setTimeout(() => {
          if (_socket === socket) socket.connect();
        }, SERVER_DISCONNECT_RETRY_MS);
      }
    };
    const onConnectError = () => setIsConnected(false);

    const onMessage = (data) => messageCallbackRef.current?.(data);
    const onEnrolled = (data) => enrolledCallbackRef.current?.(data);

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

    const listeners = {
      [SOCKET_EVENTS.CONNECT]: onConnect,
      [SOCKET_EVENTS.DISCONNECT]: onDisconnect,
      [SOCKET_EVENTS.CONNECT_ERROR]: onConnectError,
      [SOCKET_EVENTS.MESSAGE_RECEIVED]: onMessage,
      [SOCKET_EVENTS.CLASSROOM_ENROLLED]: onEnrolled,
      [SOCKET_EVENTS.MESSAGE_DELETED]: onMsgDeleted,
      [SOCKET_EVENTS.ACTIVITY_RESOLVED]: onActivityResolvedEvent,
      [SOCKET_EVENTS.ACHIEVEMENT_UNLOCKED]: onAchievementUnlocked,
    };
    Object.entries(listeners).forEach(([event, handler]) => socket.on(event, handler));

    return () => {
      Object.entries(listeners).forEach(([event, handler]) => socket.off(event, handler));
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated]);

  /**
   * Emit 'send_message' event to the server
   * @param {Object} messageData - The message object containing content, conversation_id, etc.
   * @param {Function} callback - Optional callback for acknowledgment. It always gets exactly one
   *   answer: the one of the server, or { success: false, error } when the server could not be reached
   *   or did not answer within SEND_ACK_TIMEOUT_MS, so a lost acknowledgement never leaves the caller waiting.
   */
  const sendMessage = useCallback((messageData, callback) => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      if (callback) {
        socket.timeout(SEND_ACK_TIMEOUT_MS).emit(SOCKET_EVENTS.SEND_MESSAGE, messageData, (err, response) => {
          callback(err ? { success: false, error: SEND_UNCONFIRMED_ERROR } : response);
        });
      } else {
        socket.emit(SOCKET_EVENTS.SEND_MESSAGE, messageData);
      }
    } else {
      console.warn('Socket not connected. Message not sent:', messageData);
      if (callback) {
        callback({ success: false, error: 'Socket not connected.' });
      }
    }
  }, []);

  return {
    isConnected: isAuthenticated && isConnected,
    sendMessage,
    // Not getSocket(): re-rendering after resetSocket() must not open a socket for a session that just ended.
    // Read at render time, so it is current whenever the connection state changes.
    socket: isAuthenticated ? _socket : null,
  };
};

export default useChatSocket;
