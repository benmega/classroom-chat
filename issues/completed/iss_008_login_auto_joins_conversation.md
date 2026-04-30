# ISS-008: Login Silently Auto-Joins User to the Most Recent Conversation

**Type:** UX / Data Integrity  
**Severity:** Medium  
**Status:** Open  
**Reported:** 2026-04-23

---

## Summary

Every login — regardless of which conversation the user was previously in — silently appends the user to the **most recently created** conversation and sets `session["conversation_id"]` to it. This means:

1. Students are added to conversations they did not intend to join.
2. A student logging in during a different classroom period will be automatically added to whatever the last admin created.
3. There is no way to opt out of this auto-join.

---

## Affected Files

`backend/application/routes/user_routes.py`, lines 100–111:
```python
recent_conversation = Conversation.query.order_by(
    Conversation.created_at.desc()
).first()

if recent_conversation:
    if user_obj not in recent_conversation.users:
        recent_conversation.users.append(user_obj)
        db.session.commit()
    session["conversation_id"] = recent_conversation.id
```

The same logic is duplicated in `dev_login_routes.py:64–73`.

---

## Steps to Reproduce

1. Admin creates a "History Class" conversation.
2. A student in an unrelated "Math Class" logs in later.
3. The student is now automatically enrolled in "History Class" and sees its messages.

---

## Impact

- Students see conversations they should not be participating in.
- User list in conversations grows uncontrollably every time any user logs in.
- Conversation membership loses its purpose as a meaningful access control mechanism.

---

## Recommended Fix

Remove the auto-join logic from the login flow. Let users choose their conversations explicitly, or have admins add members. The `session["conversation_id"]` should be restored from a user preference or last-known-active field, not forced to the newest conversation.
