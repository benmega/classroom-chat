---
description: Audit and refine codebase comments to improve readability and maintainability without altering logic.
---

# Workflow: Cleanup Comments

This workflow provides a systematic approach to auditing and refining codebase comments to improve readability and maintainability without altering functional logic. Use this as a recurring task to keep the developer environment clean.

## Phase 1: Preparation
1. **Identify Target Files**: Use `grep` or `list_dir` to find source files (.py, .js, .jsx, .ts, .tsx, .css).
2. **Verify Baseline**: Ensure the application is in a stable state (tests pass/build succeeds).

## Phase 2: Analysis & Review
Iterate through the identified files and evaluate comments based on these criteria:
- **Outdated**: Check if the comment refers to variables, functions, or logic that have since changed or been removed.
- **Unhelpful**: Identify comments that state the obvious (redundant descriptions of self-documenting code).
- **Superfluous**: Look for legacy TODOs, commented-out dead code blocks, or excessively verbose "storytelling" that doesn't aid technical understanding.

## Phase 3: Implementation
1. **Draft Changes**: Prepare precise code edits using `replace_file_content` or `multi_replace_file_content`.
2. **Safeguard Logic**: Ensure that the removal of comments does not accidentally remove functional code or affect syntax (e.g., maintain proper indentation and closing symbols).
3. **Approval**: Present a summary of the count and nature of removals before applying.

## Phase 4: Verification
1. **Static Analysis**: Run linting tools (`eslint`, `flake8`, etc.) to catch syntax errors.
2. **Functional Testing**: Verify that the application logic remains identical.
3. **Report**: Document the number of files cleaned and the type of improvements made.

---

## Agent Configuration
- **Single Agent**: Recommended for this repository. A single agent can maintain context of the entire project's naming conventions and logic, ensuring consistent comment quality.
- **Multiple Agents**: Only necessary if the codebase exceeds thousands of files, where parallelization would outweigh the overhead of cross-agent coordination.
