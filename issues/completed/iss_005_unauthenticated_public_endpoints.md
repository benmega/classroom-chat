# ISS-005: Unauthenticated Public API Endpoints Expose User Data

**Type:** Security / Privacy  
**Severity:** High  
**Status:** Open  
**Reported:** 2026-04-23

---

## Summary

Several backend API endpoints are publicly accessible without any authentication check. Any anonymous visitor or external actor can query them and receive sensitive user information.

---

## Affected Endpoints

### 1. `/user/get_user_id` — `user_routes.py:560`
Returns the current session user's ID. While session-scoped, it is completely unauthenticated — no `@require_login` decorator. Any unauthenticated request will receive a 404 with a JSON body, which can be used to probe for session existence.

### 2. `/message/set_active_conversation` — `message_routes.py:103`
Accepts a POST with a `conversation_id` and sets it as active in the session without any authentication guard. An unauthenticated actor could manipulate another user's session conversation pointer.

### 3. `/message/get_current_conversation`, `/message/get_conversation`, `/message/get_historical_conversation`, `/message/view_conversation/<id>` — `message_routes.py`
None of these conversation-reading routes have an `@require_login` or session check guard before accessing message content. Any unauthenticated user can read all messages in any conversation by ID.

### 4. `/message/api/conversations/<user_id>` — `message_routes.py:243`
This route accepts a `user_id` in the URL path and returns the full conversation history (including messages) for that user — entirely without authentication. Any user ID can be queried by anyone.

### 5. `/message/end_conversation` — `message_routes.py:161`
Allows ending a conversation session without authentication.

---

## Steps to Reproduce

1. Log out (or use an incognito session).
2. `GET /message/api/conversations/1` — receives full message history for user ID 1.
3. `GET /message/get_current_conversation` — receives the latest conversation and all its messages.

---

## Impact

- **Message privacy breach**: Students' chat messages are readable by anyone with network access.
- **Session manipulation**: External actors can alter conversation state.
- **Data enumeration**: Iterating user IDs on `/api/conversations/<user_id>` exposes all users' activity.

---

## Recommended Fix

Add `@require_login` (or equivalent session guard) to all message retrieval and session-manipulation routes. The `/api/conversations/<user_id>` endpoint should also verify that the requesting user can only access their own data (or is an admin).

```python
# Example fix for get_current_conversation
@message.route("/get_current_conversation", methods=["GET"])
@limiter.limit("60 per minute")
@require_login  # ADD THIS
def get_current_conversation():
    ...
```
