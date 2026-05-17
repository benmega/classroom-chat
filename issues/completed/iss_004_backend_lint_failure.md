# ISSUE: Backend Linting Execution Failure

## Status
- **Priority**: Medium
- **Category**: Tooling
- **Assignee**: DevOps / Backend Lead

## Description
The backend linting tool `ruff` fails to execute on the Windows environment, returning an `OSError: [WinError 193] %1 is not a valid Win32 application`. This prevents automated code quality checks for the backend.

## Findings
- Command: `.\venv\Scripts\python.exe -m ruff check .`
- Error: `WinError 193`.
- This often happens when a 64-bit Python tries to execute a 32-bit binary (or vice versa) or when the wrapper script is corrupted/misconfigured for the OS.

## Suggested Resolution
1. Reinstall `ruff` in the virtual environment: `.\venv\Scripts\python.exe -m pip install --force-reinstall ruff`.
2. If the issue persists, check if `ruff` is being invoked correctly for Windows or try using `ruff.exe` directly if it exists in `venv/Scripts`.
3. Verify the system architecture and ensure Python and its packages are matching.

## Verification
- Run `.\venv\Scripts\python.exe -m ruff check .` and ensure it executes and returns linting results.

## Root Cause
The `ruff` binary in the virtual environment was either corrupted or built for a different architecture, leading to `WinError 193` (Not a valid Win32 application) on Windows. Force-reinstalling the package via pip resolved the binary mismatch.

## Changed Files
- `backend/application/__init__.py`
- `backend/application/routes/achievement_routes.py`
- `backend/application/routes/admin/project_routes.py`
- `backend/application/routes/admin_routes.py`
- `backend/application/routes/user_routes.py`
- `backend/application/utilities/session_cleanup.py`
- `backend/legacy_migrations/retroactive_enrollment.py`
