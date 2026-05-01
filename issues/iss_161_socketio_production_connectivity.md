# Issue: Production Socket.IO Connectivity Failure (400 Bad Request)

## Status
- **Priority**: High
- **Status**: Resolved (Pending Verification)
- **Assigned to**: Antigravity

## Problem Description
Users on the production site (`https://blossom.benmega.com`) were experiencing persistent `400 Bad Request` errors during the Socket.IO handshake and polling phases. This prevented the chat interface from connecting, leading to a "Socket disconnected" state.

### Symptoms
- Browser console logs showing `POST https://blossom.benmega.com/socket.io/?... 400 (BAD REQUEST)`.
- Socket.IO connection errors: `xhr post error`, `transport error`.
- WebSocket upgrades failing with `WebSocket is closed before the connection is established`.
- Gunicorn logs showing successful background tasks, but Nginx access logs recording the 400 status codes for `/socket.io/` requests.

## Root Cause Analysis
The root cause was a **CORS Origin Mismatch** in the backend configuration.

1. **Subdomain Change**: The application was recently moved to the `blossom.benmega.com` subdomain.
2. **CORS Whitelist**: The `ProductionConfig` in `backend/application/config.py` had a hardcoded `CORS_ORIGINS` list that included `https://benmega.com` and `https://www.benmega.com`, but **missing** the new `https://blossom.benmega.com` subdomain.
3. **Socket.IO Security**: `python-socketio` (via `Flask-SocketIO`) strictly validates the `Origin` header sent by the browser. If the origin is not in the `cors_allowed_origins` list, Engine.IO rejects the request with a `400 Bad Request` ("Invalid session" or similar refusal).
4. **Bypass Behavior**: Manual testing via `curl` or Python scripts often succeeded because they do not send an `Origin` header by default, which bypasses the Socket.IO CORS check. Browsers, however, always send the `Origin` header for Socket.IO requests, triggering the failure.

## Resolution Steps Taken
1. **Updated Configuration**: Modified `backend/application/config.py` to add `https://blossom.benmega.com` to the `CORS_ORIGINS` list in `ProductionConfig`.
2. **Deployed to Server**: SCP'd the updated `config.py` to the EC2 instance at `/home/ubuntu/classroom-chat/backend/application/config.py`.
3. **Restarted Services**: Ran `sudo systemctl restart gunicorn-benmega` to apply the changes.
4. **Verified Fix**: Performed a simulated browser handshake using a Python script that explicitly sends the `Origin: https://blossom.benmega.com` header. The server now returns `200 OK` and a valid `sid`.

## Verification Instructions
1. Open `https://blossom.benmega.com` in a browser.
2. Open Developer Tools (F12) and check the Console/Network tabs.
3. Verify that the `/socket.io/` requests return `200 OK`.
4. Verify that the chat connects successfully (green status or "Connected" log).

## Next Steps
- [ ] Monitor Nginx access logs for any remaining 400 errors from other users.
- [ ] Ensure that `CORS_ORIGINS` is properly managed via environment variables in the future to avoid hardcoding subdomains.
