---
description: Automatically locate, solve, and archive open issues in the issues/ directory.
---

# Solve Issue Workflow

This workflow uses the global `Solve Issues` skill to systematically address pending issues.

1.  **Locate**: Use `list_dir` to find Markdown files in the `issues/` directory matching `iss_*.md`.
2.  **Select**: Identify the next open issue (lowest index, e.g., `iss_027_chat_sender_attribution_error.md`).
3.  **Analyze & Reproduce**: 
    - Read the issue file in the `issues/` directory.
    - **Architecture Review**: Reference [frontend_design.md](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/frontend_design.md), [backend_design.md](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/backend_design.md), and [database_schema.md](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/database_schema.md) to ensure the solution aligns with the project's technical standards.
    - **CRITICAL**: Verify the bug. Use `browser_subagent` or `run_command` (for backend) to see the failure at `http://localhost:5173` before applying changes.
4.  **Resolve**: 
    - Identify the relevant files in `frontend` or `backend`.
    - Apply the fix using `replace_file_content` or `multi_replace_file_content`.
    - **Linting**: Check the terminal output of `npm run dev` or `python main.py`. Fix any new warnings or lint errors introduced by your change.
5.  **Verify**: 
    - Use the `Login Automation` skill or the `/login` workflow if authentication is required. 
    - **UI Verification**: Use `browser_subagent` to confirm the fix at `http://localhost:5173`.
    - **Visual Regression**: If shared styles or core components were modified, check at least one "neighboring" page to ensure no new regressions were introduced.
    - **Evidence**: Capture a screenshot of the fix and mention its path in the summary.
6.  **Archive**: 
    // turbo
    - Move the markdown file to `issues/completed/` using `mv`.
    - Update the archived file with a **Root Cause** section (Why did it happen?) and a list of changed files.
7.  **Knowledge Sync**: 
    - If the resolution established a new reusable pattern or revealed an architectural constraint, update or create a Knowledge Item (KI) in the `knowledge/` directory.
8.  **Partial Completion and Roadblocks**: If you cannot complete all parts of the task or hit an unresolvable roadblock:
    - Create a NEW Markdown issue file in the `issues/` directory (e.g., `iss_XXX_REMAINING_TASK.md`).
    - Document exactly what was achieved, what blocked you, and provide clear "Next Steps" for the next agent.
    - Move the *current* issue to `issues/completed/` ONLY if the remaining work is truly a follow-up; otherwise, leave it open and record your progress.
9.  **Summary**: Report the fixed issue, the steps taken, and any newly created follow-up issues to the user.

## Handling Roadblocks
- **Credential Failures**: If the credentials in `Login Automation` don't work, do not try random passwords. Report the failure to the user and stop.
- **Scope Creep**: If solving one issue reveals a much larger architectural flaw, fix the immediate bug and log the architectural concern as a new issue.
- **Tool Failures**: 
    - **Selector Change**: If a browser subagent fails repeatedly on a selector, check the current DOM one last time, then log the issue as "UI Test Blocked: Selector Change" for human review.
    - **CDP/Browser Failure**: If you encounter "CDP connection failure" or "new_page did not provide a valid ID," the browser process has likely crashed or the dev server is unresponsive. Do not retry more than twice. Report the "Browser/Server Unresponsiveness" to the user and request a restart of the dev environment.

