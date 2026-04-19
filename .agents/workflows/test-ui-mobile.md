---
description: Automatically test the Mobile UI for bugs, and document them as Jira-style markdown files in the issues/ directory.
---

# Mobile UI Bug Testing Workflow

This workflow provides the standardized procedure for finding and recording UI bugs specifically for mobile resolutions and touch-based interactions.

1.  **Locate**: List the `issues/` directory to identify the last used issue ID (e.g., `iss_033`).
2.  **Health Check**: Before starting deep exploration, perform a simple navigation to `http://localhost:5173/` using `browser_subagent`. 
    - If the browser fails to return a Page ID or throws a CDP error, stop and report "Browser Environment Unstable" to the user.
3.  **Authentication**: If testing a protected route or a user flow that requires being logged in, **YOU MUST** follow the `@[/login]` workflow. Summary:
    1. Navigate to `http://localhost:8000/dev-login?role=admin` — the backend returns JSON confirming the session.
    2. Then navigate to `http://localhost:5173/` and verify the dashboard/chat loads (not the login page).
    - **CRITICAL**: Port **8000** is the backend. Port **5173** is the React app. They share the same session cookie.
    - Do NOT use the standard `/login` form unless the task is explicitly about testing login behaviour.
    - If `/dev-login` returns an error, **stop and report the failure**. Do not attempt workarounds.
4.  **Explore**: Use `browser_subagent` to systematically navigate through the application focusing on **common user flows** (e.g., Login -> Dashboard -> Chat -> Profile).
    - **QA Standards**: Reference [testing_and_qa.md](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/testing_and_qa.md) for the standardized audit criteria.
    - Prioritize mobile viewports (e.g., 390px width for iPhone 13/14).
    - Focus on mobile-specific interactions: hamburger menus, touch targets, bottom navigation, and condensed layouts.
5.  **Audit**:
    - **Functional**: Does every button and link have a legitimate touch target size? Do mobile-specific features like the hamburger menu work correctly?
    - **User Flow**: Are the primary paths intuitive for a mobile user? Is the navigation straightforward on a small screen?
    - **Visual**: Is the mobile layout responsive? Check for horizontal overflow, overlapping elements, or text that is too small to read.
    - **Aesthetics**: Does the mobile experience feel as premium and polished as the desktop version?
6.  **Record**:
    - For every bug found, create a new file in `issues/iss_NNN_description.md`.
    - Follow the Jira-style markdown structure specified in the `UI Bug Testing` global skill.
    - Capture screenshots and link them in the markdown.
7.  **Status Check**: If `npm run dev` or `python main.py` triggers an error or warning, record it in a relevant issue.
8.  **Summary**: Provide a bulleted summary of all newly created issues and their impact levels.
