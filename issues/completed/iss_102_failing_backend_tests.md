---
title: "Fix 47 failing backend pytest test cases"
status: "open"
priority: "high"
labels: ["backend", "unit-tests", "bug"]
---

# Issue: Multiple Backend Tests Failing

## Description
When running `pytest` in the backend directory, 47 tests fail and 37 error out. There are multiple issues causing these failures, ranging from `IntegrityError` in the database to bad assertions and assertion logic.

## Summary of Failing Areas
- `tests/app/models/test_configuration.py`
- `tests/app/models/test_conversation.py`
- `tests/app/models/test_message.py`
- `tests/app/routes/test_achievement_routes.py`
- `tests/app/routes/test_api_achievements.py`
- `tests/app/routes/test_challenge_routes.py`
- `tests/app/routes/test_message_routes.py`

## Example Error
One of the frequent errors is:
```
sqlalchemy.exc.IntegrityError: (sqlite3.IntegrityError) UNIQUE constraint failed
```
This is likely due to lack of proper database cleanup between tests or lack of test isolation.

## Proposed Fix
1. Investigate the database fixtures (such as `app_context` or `init_db`) to ensure the SQLite database is cleared between test executions.
2. Fix individual assertion errors in routing tests.
3. Fix test relation assumptions that raise `AttributeError` or `sqlalchemy` exceptions.
