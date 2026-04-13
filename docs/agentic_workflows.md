# Agentic Workflows - Classroom Chat

This document documents the automation workflows designed for AI agents (like Antigravity) to assist with project maintenance, debugging, and feature development.

## 1. Overview
The project includes a suite of "Workflows" (located in `.agents/workflows/`) that define standardized procedures for common development tasks. These allow AI agents to work autonomously or in a pair-programming mode with high reliability.

---

## 2. Core Workflows

### 2.1 Issue Resolution (`solve-issue.md`)
A systematic process for handling bugs or feature requests documented in the `issues/` directory.
- **Path**: Locate issue -> Analyze code -> implement Fix -> Verify -> Archive.
- **Benefit**: Ensures every bug fix follows a standardized verification path.

### 2.2 UI Quality Assurance (`test-ui-desktop.md` & `test-ui-mobile.md`)
Automated procedures for auditing the user interface.
- **Coverage**: Navigation, responsive breakpoints, hover states, and premium visual elements.
- **Output**: Generates standardized Jira-style markdown issue reports for UI inconsistencies.

### 2.3 Code Health (`cleanup-code.md`)
A workflow dedicated to reducing technical debt and resolving linting warnings.
- **Operations**: Removes unused imports, standardizes CSS variable usage, and fixes common React anti-patterns (e.g., missing dependencies).

### 2.4 Authentication Maintenance (`login.md`)
Standardized procedure for logging into the application with different user roles (Student/Admin).
- **Utility**: Facilitates automated browser-based testing for protected routes.

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
