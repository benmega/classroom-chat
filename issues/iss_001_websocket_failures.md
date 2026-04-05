# ISSUE-001: WebSocket Connection Failures

## Status: Open
## Priority: Critical
## Category: Infrastructure / Real-time

### Description
The application experiences persistent WebSocket connection failures. In the Chat page, it often reports `WebSocket is closed before the connection is established`. In the Admin page, it fails with `Invalid frame header`. This prevents real-time messaging and live updates from functioning correctly.

### Steps to Reproduce
1. Log in to the application.
2. Navigate to the Chat page.
3. Open the browser console.
4. Observe WebSocket error messages.
5. Navigate to the Admin page and observe additional `Invalid frame header` errors.

### Expected Behavior
The WebSocket should connect reliably on page load and maintain a stable connection for real-time events.

### Actual Behavior
The connection fails or terminates prematurely with protocol errors.

### Potential Root Cause
- Hardcoded or incorrect Socket.io URL (detected `192.168.1.136:7000` in some configs).
- Reverse proxy (if any) or Flask-SocketIO configuration mismatch (e.g., async_mode).
- Transports mismatch between client (`websocket`, `polling`) and server.
