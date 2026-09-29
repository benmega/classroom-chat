---
description: Automatically test the Desktop UI for bugs, and file them as GitHub Issues (via the `gh` CLI).
---

# Desktop UI Bug Testing Workflow

This workflow provides the standardized procedure for finding and recording UI bugs specifically for desktop resolutions.

1.  **Locate**: Run `gh issue list --state open --limit 100` to see existing issues so you do not file duplicates.
2.  **Health Check**: Before starting deep exploration, perform a simple navigation to `http://localhost:5173/` using `browser_subagent`. 
    - If the browser fails to return a Page ID or throws a CDP error, stop and report "Browser Environment Unstable" to the user.
3.  **Authentication**: If testing a protected route or a user flow that requires being logged in, **YOU MUST** follow the `@[/login]` workflow. Summary:
    1. Navigate to `http://localhost:8000/dev-login?role=admin` — the backend returns JSON confirming the session.
    2. Then navigate to `http://localhost:5173/` and verify the dashboard/chat loads (not the login page).
    - **CRITICAL**: Port **8000** is the backend. Port **5173** is the React app. They share the same session cookie.
    - Do NOT use the standard `/login` form unless the task is explicitly about testing login behaviour.
    - If `/dev-login` returns an error, **stop and report the failure**. Do not attempt workarounds.
4.  **Explore**: Use `browser_subagent` to systematically navigate through the application focusing on **common user flows** (e.g., Login -> Dashboard -> Chat -> Profile).
    - **QA Standards**: Reference [testing_and_qa.md](../../docs/testing_and_qa.md) for the standardized audit criteria.
    - Prioritize desktop viewports (e.g., 1440px and 1280px).
    - Focus on desktop-specific interactions: hover states, sidebar navigation, and expanded layouts.
5.  **Audit**:
    - **Functional**: Does every button, link, and form work in the desktop view?
    - **User Flow**: Are the primary paths (e.g., sending a message, navigating between modules) intuitive and error-free?
    - **Visual**: Is the desktop layout balanced? Check for overlapping, clipping, or poor alignment on large screens.
    - **Aesthetics**: Does it feel premium, high-quality, and modern?
6.  **Record**:
    - For every bug found, write the report to a temporary markdown file (Description, Requirements, Repro Steps, Verification Results) and run `gh issue create --title "<short description>" --label bug --body-file <file>`. See [issue_resolver_guide.md](../../docs/issue_resolver_guide.md).
    - Use `enhancement` for UX improvements and optionally `priority:high|medium|low` if those labels exist. Never use the `ai-plan` or `ai-draft` labels (they trigger AI workflows).
    - Capture screenshots and reference their paths in the issue body (or attach them in the GitHub UI).
7.  **Status Check**: If `npm run dev` or `python main.py` triggers an error or warning, record it in a relevant issue.
8.  **Summary**: Provide a bulleted summary of all newly created issues (with their `#` numbers and URLs) and their impact levels.
