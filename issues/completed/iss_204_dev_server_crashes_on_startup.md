# Dev Server Crashes on Startup

## Description
Both the frontend and backend servers crashed shortly after starting (`exit code: 1`), preventing the `browser_subagent` from performing the automated UI/UX testing workflow.

## Steps to Reproduce
1. Run `python main.py` in the `backend/` directory.
2. Run `npm run dev` in the `frontend/` directory.
3. Observe that both processes terminate unexpectedly with `exit code: 1` after approximately 6-7 minutes.

## Expected Result
Both servers should remain active in the background, allowing QA tests to access `http://localhost:5173` and `http://localhost:8000/dev-login`.

## Actual Result
The servers unexpectedly crashed without emitting clear error logs in standard output, blocking all automated testing tools from proceeding. The `browser_subagent` reported `Browser Environment Unstable` due to this issue.

## Impact
Critical - The development environment is unstable and crashes abruptly, blocking testing and general development.

## Screenshots
N/A
