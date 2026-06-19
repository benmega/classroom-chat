---
description: Automatically test the Desktop UI for bugs, and document them as Jira-style markdown files in the issues/ directory.
---

# Desktop UI Bug Testing Workflow

This workflow provides the standardized procedure for finding and recording UI bugs specifically for desktop resolutions.

1.  **Locate**: List the `issues/` directory to identify the last used issue ID (e.g., `iss_033`).
2.  **Health Check**: Before starting deep exploration, ensure the `browser` subagent is available (ask the user to run the `@[/browser]` slash command if it is not). Then, perform a simple navigation to `http://localhost:5173/` using the `browser` subagent. 
    - If the browser fails to return a Page ID or throws a CDP error, stop and report "Browser Environment Unstable" to the user.
3.  **Authentication**: If testing a protected route or a user flow that requires being logged in, **YOU MUST** follow the `@[/login]` workflow. Summary:
    1. Navigate to `http://localhost:8000/dev-login?role=admin` — the backend returns JSON confirming the session.
    2. Then navigate to `http://localhost:5173/` and verify the dashboard/chat loads (not the login page).
    - **CRITICAL**: Port **8000** is the backend. Port **5173** is the React app. They share the same session cookie.
    - Do NOT use the standard `/login` form unless the task is explicitly about testing login behaviour.
    - If `/dev-login` returns an error, **stop and report the failure**. Do not attempt workarounds.
4.  **Explore**: Use the `browser` subagent to systematically navigate through the application focusing on **common user flows** (e.g., Login -> Dashboard -> Chat -> Profile).
    - **QA Standards**: Reference [testing_and_qa.md](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/testing_and_qa.md) for the standardized audit criteria.
    - Prioritize desktop viewports (e.g., 1440px and 1280px).
    - Focus on desktop-specific interactions: hover states, sidebar navigation, and expanded layouts.
5.  **Audit**:
    - **Functional**: Does every button, link, and form work in the desktop view?
    - **User Flow**: Are the primary paths (e.g., sending a message, navigating between modules) intuitive and error-free?
    - **Visual**: Is the desktop layout balanced? Check for overlapping, clipping, or poor alignment on large screens.
    - **Aesthetics**: Does it feel premium, high-quality, and modern?
6.  **Record**:
    - For every bug found, create a new file in `issues/iss_NNN_description.md`.
    - Follow the Jira-style markdown structure specified in the `UI Bug Testing` global skill.
    - Capture screenshots and link them in the markdown.
7.  **Status Check**: If `npm run dev` or `python main.py` triggers an error or warning, record it in a relevant issue.
8.  **Summary**: Provide a bulleted summary of all newly created issues and their impact levels.
