# ISS-006: 10-Minute Session Lifetime Causes Constant Logouts

**Type:** UX / Functionality  
**Severity:** High  
**Status:** Open  
**Reported:** 2026-04-23

---

## Summary

The application session lifetime is set to **10 minutes** (`timedelta(minutes=10)`) in `__init__.py` line 87. For a classroom chat application where students are expected to be in active sessions for 30–90+ minutes, this will repeatedly force logouts and interrupt the user experience.

---

## Affected File

`backend/application/__init__.py`, line 87:
```python
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(minutes=10)
```

---

## Steps to Reproduce

1. Log in as any user.
2. Stay idle (or even stay active) for 10 minutes without triggering a session renewal.
3. The next API call will fail with a 401, and the frontend will redirect to `/login`.

---

## Impact

- **Students are constantly logged out** during a class session, losing their active chat context.
- There is no client-side session renewal mechanism (heartbeat does not extend the session cookie itself in Flask's default filesystem session handler).
- When re-logged in, the user may be auto-joined to the wrong conversation, causing chat context loss.

---

## Recommended Fix

Increase the lifetime to something appropriate for a classroom session (e.g., 8–12 hours for a school day), and optionally implement sliding session renewal on activity:

```python
# __init__.py
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(hours=10)
```
