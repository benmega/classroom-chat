---
description: Automatically test the UI for bugs, and document them as Jira-style markdown files in the issues/ directory.
---

# UI Bug Testing Workflow

This workflow provides the standardized procedure for finding and recording UI bugs.

1.  **Locate**: List the `issues/` directory to identify the last used issue ID (e.g., `iss_033`).
2.  **Explore**: Use `browser_subagent` to systematically navigate through the application.
    - Check typical desktop widths (e.g., 1280px).
    - Check mobile responsiveness at 500px and 375px.
3.  **Audit**:
    - **Functional**: Does every button, link, and form work?
    - **Visual**: Is anything overlapping, clipped, or unaligned?
    - **Aesthetics**: Does it feel premium, high-quality, and modern?
4.  **Record**:
    - For every bug found, create a new file in `issues/iss_NNN_description.md`.
    - Follow the Jira-style markdown structure specified in the `UI Bug Testing` global skill.
    - Capture screenshots and link them in the markdown.
5.  **Status Check**: If `npm run dev` or `python main.py` triggers an error or warning, record it in a relevant issue.
6.  **Summary**: Provide a bulleted summary of all newly created issues and their impact levels.
