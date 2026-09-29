---
description: Automatically locate, solve, and close open GitHub Issues.
---

# Solve Issue Workflow

This workflow systematically addresses open GitHub Issues for this repository using the `gh` CLI.

1.  **Locate**: Run `gh issue list --state open` (add `--label bug` or `--search` to narrow down).
2.  **Select**: Identify the next open issue (oldest, or highest `priority:*` label if used), or use the number the user gave.
3.  **Analyze & Reproduce**: 
    - Read the issue with `gh issue view <number> --comments`.
    - **Architecture Review**: Reference [frontend_design.md](../../docs/frontend_design.md), [backend_design.md](../../docs/backend_design.md), and [database_schema.md](../../docs/database_schema.md) to ensure the solution aligns with the project's technical standards.
    - **CRITICAL**: Verify the bug. Use `browser_subagent` or `run_command` (for backend) to see the failure at `http://localhost:5173` before applying changes.
4.  **Resolve**: 
    - Identify the relevant files in `frontend` or `backend`.
    - Apply the fix using `replace_file_content` or `multi_replace_file_content`.
    - **Linting**: Check the terminal output of `npm run dev` or `python main.py`. Fix any new warnings or lint errors introduced by your change.
5.  **Verify**: 
    - **Authentication**: Use the `@[/login]` workflow (default: navigate to `http://localhost:8000/dev-login?role=admin`, then go to `http://localhost:5173/` to confirm access).
    - **CAUTION**: Port **8000** is the backend shortcut. Port **5173** is the React app. Do NOT use the standard `/login` form unless the task explicitly tests that feature. Do NOT guess passwords.
    - **UI Verification**: Use `browser_subagent` to confirm the fix at `http://localhost:5173`.
    - **Visual Regression**: If shared styles or core components were modified, check at least one "neighbouring" page to ensure no new regressions were introduced.
    - **Evidence**: Capture a screenshot of the fix and mention its path in the summary.
6.  **Close**: 
    - Commit the fix (on a branch) with `Fixes #<number>` in the commit message or PR description so the issue closes when it merges.
    - Post a comment on the issue with a **Root Cause** section (Why did it happen?) and the list of changed files: `gh issue comment <number> --body-file <file>`.
    - Only close manually (`gh issue close <number> --comment "..."`) if the fix needs no PR.
7.  **Knowledge Sync**: 
    - If the resolution established a new reusable pattern or revealed an architectural constraint, update or create a Knowledge Item (KI) in the `knowledge/` directory.
8.  **Partial Completion and Roadblocks**: If you cannot complete all parts of the task or hit an unresolvable roadblock:
    - Create a NEW issue for the remaining work: `gh issue create --title "..." --body-file <file>` (do not use the `ai-plan` or `ai-draft` labels; they trigger AI workflows).
    - Document exactly what was achieved, what blocked you, and provide clear "Next Steps" for the next agent.
    - Close the *current* issue only if the remaining work is truly a follow-up; otherwise leave it open and comment with your progress.
9.  **Summary**: Report the fixed issue (`#<number>`), the steps taken, and any newly created follow-up issues to the user.

## Handling Roadblocks
- **Dev-Login Failures**: The default authentication path is `http://localhost:8000/dev-login?role=admin` (backend, port 8000). If it fails (e.g. 403, 404, server error), do NOT try random passwords or the standard login form. Report the failure and stop.
- **Scope Creep**: If solving one issue reveals a much larger architectural flaw, fix the immediate bug and log the architectural concern as a new issue.
- **Tool Failures**: 
    - **Selector Change**: If a browser subagent fails repeatedly on a selector, check the current DOM one last time, then log the issue as "UI Test Blocked: Selector Change" for human review.
    - **CDP/Browser Failure**: If you encounter "CDP connection failure" or "new_page did not provide a valid ID," the browser process has likely crashed or the dev server is unresponsive. Do not retry more than twice. Report the "Browser/Server Unresponsiveness" to the user and request a restart of the dev environment.

