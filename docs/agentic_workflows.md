# Agentic Workflows - Classroom Chat

This document documents the automation workflows designed for AI agents (like Antigravity) to assist with project maintenance, debugging, and feature development.

## 1. Overview
The project includes a suite of "Workflows" (located in `.agents/workflows/`) that define standardized procedures for common development tasks. These allow AI agents to work autonomously or in a pair-programming mode with high reliability.

---

## 2. Core Workflows

Current workflow files live in `.agents/workflows/`:

### 2.1 Issue Resolution (`solve-issue.md`, `solve-all-issues.md`)
A systematic process for handling bugs or feature requests documented in the `issues/` directory.
- **Path**: Locate issue -> Analyze code -> implement Fix -> Verify -> Archive.
- `solve-all-issues.md` drives this loop across every pending issue rather than a single one.
- **Benefit**: Ensures every bug fix follows a standardized verification path.

### 2.2 UI Quality Assurance (`test-ui-desktop.md` & `test-ui-mobile.md`)
Automated procedures for auditing the user interface at desktop and mobile breakpoints.
- **Coverage**: Navigation, responsive breakpoints, hover states, and premium visual elements.
- **Output**: Generates standardized Jira-style markdown issue reports (via `extract-issues.md`) for UI inconsistencies.

### 2.3 Code Health (`cleanup-code.md`, `cleanup-comments.md`, `remove-dead-code.md`)
Workflows dedicated to reducing technical debt.
- `cleanup-code.md`: removes unused imports, standardizes CSS variable usage, and fixes common React anti-patterns (e.g., missing dependencies).
- `cleanup-comments.md`: prunes stale/redundant comments.
- `remove-dead-code.md`: finds and removes unreferenced code paths.

### 2.4 Authentication Maintenance (`login.md`)
Standardized procedure for logging into the application with different user roles (Student/Admin).
- **Utility**: Facilitates automated browser-based testing for protected routes.

### 2.5 Review & Polish (`git-review.md`, `polish-ui.md`, `preflight-check.md`, `request-assets.md`)
- `git-review.md`: reviews a diff/branch before it's committed or opened as a PR.
- `polish-ui.md`: passes over recently changed UI for visual refinement.
- `preflight-check.md`: pre-merge sanity checks (tests, lint, build).
- `request-assets.md`: standardized way to ask a human for missing design assets (images, icons) an agent can't generate itself.

---

## 3. Integration with Development
These workflows are not just documents; they are **Executable Instructions** for the AI assistant. They define:
- **Success Criteria**: What constitutes a "resolved" task.
- **Safety Checks**: Mandatory steps (like running tests) before committing changes.
- **Communication Standards**: How to provide feedback and updates to the developer.

---

## 4. Maintenance of Workflows
- Workflows are treated as code and are kept under version control.
- They are periodically refined based on actual agent execution performance.
