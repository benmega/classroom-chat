# ISSUE: Widespread Backend Test Failures

## Status
- **Priority**: High
- **Category**: Regression / Stability
- **Assignee**: Backend Developer

## Description
The backend test suite is experiencing widespread failures across models and routes. Out of 223 items, many are failing (F) or erroring (E).

## Findings
- **Model Failures**: `test_ai_settings.py`, `test_challenge.py`, `test_configuration.py`, `test_conversation.py`, `test_message.py`, `test_notes.py` all show failures or errors.
- **Route Failures**: `test_achievement_routes.py` has numerous errors.
- **Common Issues**:
    - `UnicodeDecodeError` during collection if `test_results.txt` is present.
    - `LegacyAPIWarning` for `Query.get()` (SQLAlchemy 2.0 migration issue).
    - Errors suggesting database schema mismatches or SQLite datetime storage issues.
    - Errors in `test_conversation.py` (FFEEEE) and `test_message.py` (EEE).

## Suggested Resolution
1. Fix the collection error by adding `test_results.txt` to `.gitignore` or `pytest.ini`'s `norecursedirs`.
2. Address the SQLAlchemy 2.0 `LegacyAPIWarning` by replacing `Model.query.get(id)` with `db.session.get(Model, id)`.
3. Investigate the specific failures in `test_conversation.py` and `test_message.py`. They seem to be core to the application.
4. Run tests with `-vv` to get full traceback details for each failure.

## Verification
- Run `.\venv\Scripts\python.exe -m pytest tests` and ensure all 223 tests pass.


## Root Cause
The test failure was due to an obsolete feature test (login auto-joins recent conversation) that had been removed but the test was not updated. A SQLAlchemy 2.0 deprecation warning was also emitted.

## Changed Files
- backend/tests/app/routes/test_user_routes.py
- backend/application/routes/message_routes.py
- backend/test_results.txt (deleted)