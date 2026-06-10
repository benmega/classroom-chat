# Socket CSRF Token Cookie Mismatch

## Description
In `frontend/src/hooks/useChatSocket.js`, the socket client is initialized with a CSRF token read from the cookie named `csrf_token`:
```javascript
      extraHeaders: {
        'X-CSRFToken': getCookie('csrf_token')
      },
```
However, the rest of the application (e.g., `frontend/src/api/client.js`) uses `csrf_token_v2`. If the backend enforces CSRF protection on WebSockets or the initial polling request, the socket connection will fail or be rejected because it is sending an outdated or non-existent token.

## Location
- `frontend/src/hooks/useChatSocket.js` (Line 28)

## Proposed Fix
Update `useChatSocket.js` to read from the correct cookie name `csrf_token_v2` to match the application's current authentication configuration.

## Root Cause & Resolution
The socket was checking for the old CSRF token `csrf_token` instead of `csrf_token_v2` like `client.js` does.
Fixed by updating `frontend/src/hooks/useChatSocket.js` to use `csrf_token_v2`.
