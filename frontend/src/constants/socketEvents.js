// Every socket.io event name the frontend listens for or emits, in one place. The server-side names
// live in backend/application/socket_events.py and the routes that emit; they must not change
// without changing this file too.
export const SOCKET_EVENTS = Object.freeze({
  // Raised by socket.io itself, not by the server
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',

  // Client to server
  SEND_MESSAGE: 'send_message',

  // Server to client
  MESSAGE_RECEIVED: 'message_received',
  MESSAGE_DELETED: 'message_deleted',
  CLASSROOM_ENROLLED: 'classroom_enrolled',
  ACTIVITY_RESOLVED: 'activity_resolved',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  SANDBOX_STATUS_CHANGED: 'sandbox_status_changed',
});

// The reason socket.io gives for a disconnect the server started. It does not retry those on its own.
export const SERVER_DISCONNECT_REASON = 'io server disconnect';
