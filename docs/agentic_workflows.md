# Agentic Workflows - Classroom Chat

This document documents the automation workflows designed for AI agents (like Antigravity) to assist with project maintenance, debugging, and feature development.

## 1. Overview
The project includes a suite of "Workflows" (agent skills, one `.agents/skills/<name>/SKILL.md` file per workflow) that define standardized procedures for common development tasks. These allow AI agents to work autonomously or in a pair-programming mode with high reliability.

---

## 2. Core Workflows

Current workflows live in `.agents/skills/<name>/SKILL.md` (the headings below name the skill directories):

### 2.1 Issue Resolution (`solve-issue`, `solve-all-issues`)
A systematic process for handling bugs or feature requests tracked as GitHub Issues (`gh issue list`, `gh issue view`).
- **Path**: Locate issue -> Analyze code -> implement Fix -> Verify -> Close (`Fixes #N` in the commit/PR closes the issue on merge).
- `solve-all-issues` drives this loop across every open issue rather than a single one.
- **Benefit**: Ensures every bug fix follows a standardized verification path.
- See [issue_resolver_guide.md](issue_resolver_guide.md) for labels and commands. Do not apply the `ai-plan` or `ai-draft` labels; they trigger automated AI workflows.

### 2.2 UI Quality Assurance (`test-ui-desktop` & `test-ui-mobile`)
Automated procedures for auditing the user interface at desktop and mobile breakpoints.
- **Coverage**: Navigation, responsive breakpoints, hover states, and premium visual elements.
- **Output**: Files GitHub Issues (`gh issue create`, via `extract-issues`) for UI inconsistencies.

### 2.3 Code Health (`cleanup-code`, `cleanup-comments`, `remove-dead-code`)
Workflows dedicated to reducing technical debt.
- `cleanup-code`: removes unused imports, standardizes CSS variable usage, and fixes common React anti-patterns (e.g., missing dependencies).
- `cleanup-comments`: prunes stale/redundant comments.
- `remove-dead-code`: finds and removes unreferenced code paths.

### 2.4 Authentication Maintenance (`login`, with `login_automation` holding the role map and form selectors)
Standardized procedure for logging into the application with different user roles (Student/Admin).
- **Utility**: Facilitates automated browser-based testing for protected routes.

### 2.5 Review & Polish (`git-review`, `polish-ui`, `preflight-check`, `request-assets`)
- `git-review`: reviews a diff/branch before it's committed or opened as a PR.
- `polish-ui`: passes over recently changed UI for visual refinement.
- `preflight-check`: pre-merge sanity checks (tests, lint, build).
- `request-assets`: standardized way to ask a human for missing design assets (images, icons) an agent can't generate itself.

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
