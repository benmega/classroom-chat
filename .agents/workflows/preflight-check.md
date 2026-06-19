---
description: Automatically run all tests, linters, and checks before merging into the deploy branch.
---

# Preflight Check Workflow

This workflow automates running the preflight script and proactively fixing any issues discovered during the process.

1.  **Execute Preflight**: Use `run_command` to execute the preflight script at `scripts/preflight.ps1`.
    - Command: `powershell.exe -ExecutionPolicy Bypass -File scripts/preflight.ps1`
2.  **Analyze Results**:
    - If the script outputs `ALL CHECKS PASSED! SAFE TO MERGE.`, then the workflow is complete. Report success to the user and note the test coverage percentages.
    - If the script fails, identify the failing stage (e.g., Ruff linting, Pytest, Frontend Vitest, ESLint, Database Migrations, or Playwright E2E).
3.  **Resolve Issues**:
    - **Linting/Formatting (Ruff/ESLint)**: Locate the problematic files and fix the syntax or formatting errors.
    - **Unit Tests (Pytest/Vitest)**: Read the test outputs to understand the failure. Modify the source code or the test code (whichever is appropriate) to resolve the bug.
    - **Database Migrations (`flask db check`)**: If migrations are out of sync, generate a new migration using `flask db migrate -m "Auto migration"` and apply it using `flask db upgrade head`.
    - **End-to-End Tests (Playwright)**: Debug the UI/integration failure. You may need to review the frontend source code or backend API endpoints to fix the bug.
4.  **Re-run Preflight**: After applying a fix, return to Step 1 and re-run the `scripts/preflight.ps1` script. Repeat this loop until the script passes completely.
5.  **Summary**: Present the user with a summary of the issues you fixed and confirm that the codebase is ready to merge. Note the final frontend and backend test coverage percentages.
