# ISS-015: `to_dict_summary()` Runs N+1 Database Queries on Every User List Request

**Type:** Performance  
**Severity:** Medium  
**Status:** Open  
**Reported:** 2026-04-23

---

## Summary

`User.to_dict_summary()` calls `self.get_progress()` and `self.get_progress_percent()` which each execute **separate database queries per user**. When the admin `/users` endpoint serializes a list of 50 users, this results in **4 × 50 = 200 additional queries** per request.

The same problem affects the profile page, achievements page, and any route that calls `to_dict_summary()` on multiple users.

---

## Affected Files

`backend/application/models/user.py`, lines 113–117:
```python
"total_levels": self.get_progress("codecombat.com") + self.get_progress("www.ozaria.com"),
"cc_levels": self.get_progress("codecombat.com"),
"oz_levels": self.get_progress("www.ozaria.com"),
"cc_percent": self.get_progress_percent("codecombat.com"),
"oz_percent": self.get_progress_percent("www.ozaria.com"),
```

Each `get_progress()` and `get_progress_percent()` call executes a `COUNT` query:
```python
def get_progress(self, domain):
    total_challenges = ChallengeLog.query.filter_by(username=self._username, domain=domain).count()
```

---

## Impact

- Admin user list page is noticeably slow with more than ~20 students.
- The profile page's `/api/conversations/<user_id>` also loads full message content for all conversations, compounding the issue.
- As the user base grows, these pages will time out or cause significant DB load during class time.

---

## Recommended Fix

Use a single aggregated query to preload progress counts for all users when building list responses:

```python
# In the admin route, precompute counts in bulk before serializing
from sqlalchemy import func
counts = db.session.query(
    ChallengeLog.username, ChallengeLog.domain, func.count(ChallengeLog.id)
).group_by(ChallengeLog.username, ChallengeLog.domain).all()
```

Or add `SQLALCHEMY_ECHO = True` temporarily during development to make the N+1 visible, then add appropriate eager loading or subquery annotations.
