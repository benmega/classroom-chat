---
description: Automatically locate, solve, and archive open issues in the issues/ directory.
---

# Solve Issue Workflow

This workflow uses the global `Solve Issues` skill to systematically address pending issues.

1.  **Locate**: Use `list_dir` to find Markdown files in the `issues/` directory matching `iss_*.md`.
2.  **Select**: Identify the next open issue (lowest index, e.g., `iss_027_chat_sender_attribution_error.md`).
3.  **Analyze**: Read the issue file in the `issues/` directory.
4.  **Resolve**: 
    - Identify the relevant files in `frontend` or `backend`.
    - Apply the fix using `replace_file_content` or `multi_replace_file_content`.
    - Observe `npm run dev` or `python main.py` for any errors after changes.
5.  **Verify**: 
    - If the fix requires authentication, use the `Login Automation` skill or the `/login` workflow to log in (typically as an admin).
    - If a UI issue, use `browser_subagent` to confirm the fix at `http://localhost:5173`.
6.  **Archive**: 
    // turbo
    - Move the markdown file to `issues/completed/` using `mv`.
    - If `issues/completed/` doesn't exist, create it with `mkdir`.
7.  **Document Leftovers**: If any part of the original issue is left undone (e.g., long-term roadmap items), create a new Markdown issue file in the `issues/` directory documenting the remaining tasks.
8.  **Summary**: Report the fixed issue, the steps taken, and any newly created follow-up issues to the user.

