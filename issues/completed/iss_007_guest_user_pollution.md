# ISS-007: Anonymous Socket Connections Create Ghost User Accounts in the Database

**Type:** Data Integrity / UX  
**Severity:** High  
**Status:** Open  
**Reported:** 2026-04-23

---

## Summary

When an unauthenticated WebSocket connection is received, `socket_events.py` creates a new `User` record in the database with `password_hash="temp"`. This happens for every anonymous browser or bot that opens a socket connection, polluting the `users` table with ghost accounts.

---

## Affected File

`backend/application/socket_events.py`, lines 36–44:
```python
if not user:
    user = User(
        username=f"guest_{datetime.utcnow().strftime('%H%M%S')}",
        ip_address=user_ip,
        is_online=True,
        password_hash="temp",
    )
    db.session.add(user)
    db.session.commit()
```

---

## Steps to Reproduce

1. Open any browser that loads the frontend without being logged in.
2. The frontend's Socket.io client connects to the backend.
3. A new row is inserted into the `users` table with `password_hash="temp"`.

---

## Impact

- **Database fills with junk records** for every unique IP or browser session.
- Guest accounts are visible in admin panels, skewing user counts and analytics.
- The IP-based deduplication check (`password_hash="temp"`) is fragile — if the same IP legitimately has many users (e.g., a school's NAT), existing guest accounts are falsely reused.
- These "temp" accounts could interfere with the admin approval flow or duck-balance systems.
- Guest accounts appear as legitimate users in the `get_users` endpoint.

---

## Recommended Fix

**Option A (Preferred):** Reject unauthenticated socket connections immediately without creating DB records:
```python
@socketio.on("connect")
def handle_connect(auth=None):
    user_userid = session.get("user")
    if not user_userid:
        return False  # Disconnect unauthenticated sockets
    ...
```

**Option B:** Use an in-memory guest tracking structure (e.g., a dict keyed by socket SID) instead of persisting to the DB.
