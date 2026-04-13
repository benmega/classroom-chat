# API Reference - Classroom Chat

This document provides a high-level catalog of the primary API endpoints and their functionalities.

## 1. Authentication (`/user`)
- **`POST /user/login`**: Authenticates a user and starts a session. Returns user data and any awarded daily currency.
- **`GET /user/logout`**: Terminates the current session.
- **`GET /user/api/auth/status`**: Returns the current authenticated user's profile and roles.
- **`POST /user/signup`**: Handles new user registration (requires admin approval by default).

## 2. Admin API (`/api/admin`)
- **`GET /api/admin/dashboard`**: Aggregated system stats (total ducks, online users, pending approvals).
- **`POST /api/admin/create_user`**: Direct account creation by administrators.
- **`POST /api/admin/adjust_ducks`**: Modifies a specific user's currency balance.
- **`POST /api/admin/toggle-ai`**: Global switch for AI teacher functionality.
- **`POST /api/admin/add-banned-word`**: Updates the content moderation filter.

## 3. Messaging (`/message`)
- **`GET /message/api/conversations/<user_id>`**: Retrieves all chat threads associated with the user.
- **`POST /message/start_conversation`**: Initializing a new chat thread (Blueprints).
- **WebSocket (`socket.io`)**: 
    - Event `message`: Broadcasts new messages within a conversation room.
    - Event `typing`: Signals user activity in a thread.

## 4. User Content (`/user`, `/notes`, `/duck_trade`)
- **`GET /user/profile/<slug>`**: Public profile data fetching.
- **`POST /user/update_pfp`**: Multipart form handling for profile image uploads.
- **`POST /duck_trade/trade`**: Logic for peer-to-peer currency transfers.
- **`GET /notes/view/<id>`**: Fetches content for educational or administrative notes.

---

## 5. Standard JSON Response Format
The API consistently uses a standard wrapper (provided by the `api_response` decorator):
```json
{
  "status": "success | error",
  "data": { ... },
  "message": "Optional human-readable message",
  "error": "Optional error detail code"
}
```

---

## 6. Access Control
Endpoints are protected by:
- **`login_required`**: Requires a valid session cookie.
- **`admin_required`**: Requires the authenticated user to have `is_admin=True`.
- **Ownership Checks**: For user-specific content like projects or notes.
