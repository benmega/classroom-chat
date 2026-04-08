# Project Issue Cycle Workflows

I've designed two core workflows to help an agent systematically **find**, **document**, **resolve**, and **archive** project issues.

---

## 🛠 1. UI Bug Testing (Discovery)
The **Upstream Workflow** used to find, test, and document issues. 

- **Skill**: `C:\Users\Ben\.gemini\antigravity\skills\ui_bug_testing\SKILL.md`
- **Workflow**: `c:\Users\Ben\AntiGravity\classroom-chat\.agents\workflows\test-ui.md`
- **Hook**:
> **/test-ui**: "Manually test the UI for bugs, and organize findings into Jira-ticket-style markdown files."

### Discovery Workflow Details
1.  **Exploration**: The agent uses the `browser_subagent` to explore all application routes in various viewports (Desktop & Mobile).
2.  **Audit**: Checks for functional bugs (e.g., broken forms) and visual flaws (e.g., element overlap).
3.  **Documentation**: Finds the next available ID (e.g., `iss_035`) and records the bug in a standardized Markdown format with screenshots.

---

## 🛠 2. Solve Issues (Resolution)
The **Downstream Workflow** used to locate an existing issue and fix it.

- **Skill**: `C:\Users\Ben\.gemini\antigravity\skills\solve_issues\SKILL.md`
- **Workflow**: `c:\Users\Ben\AntiGravity\classroom-chat\.agents\workflows\solve-issue.md`
- **Hook**:
> **/solve-issue**: "Locate and resolve the next pending bug in the issues list."

### Resolution Workflow Details
1.  **Priority Selection**: Automatically picks the lowest ID (oldest) issue.
2.  **Implementation**: Targeted code fixes in `frontend` or `backend`, followed by verification.
3.  **Archiving**: Moves the resolved issue to `issues/completed/`.

---

> [!TIP]
> You can also tell the agent: **"Run /test-ui for the admin panel"** if you want to focus testing on a specific area of the application.

