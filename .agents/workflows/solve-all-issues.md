---
description: Systematically manage and resolve all pending issues by orchestrating the solve-issue workflow.
---

# Solve All Issues Workflow

This workflow orchestrates the systematic resolution of multiple issues by prioritizing, spawning sub-tasks, and providing a unified confirmation of stability.

1.  **Inventory**:
    - Run `gh issue list --state open --limit 200` to identify all open issues.
    - Skip long-lived plans or issues that need owner decisions (for example tracking/epic issues); list them in the final report instead.

2.  **Prioritization & Planning**:
    - Analyze the identified issues to determine dependencies (e.g., fix the backend bug before the UI bug that depends on it).
    - Plan an optimal execution order to minimize redundant testing and environment restarts.
    - **Grouping**: Group small, related issues (e.g., CSS fixes) to be handled together if possible.

3.  **Orchestration (Subagent Driven)**:
    - **MANDATORY**: For each identified issue, invoke the `@[/solve-issue]` workflow via a specialized subagent. 
    - **Clear ALL Issues**: The objective is to resolve every actionable issue. Work through every actionable open issue; anything you cannot resolve gets a comment explaining why and stays open.
    - **Delegation**: The primary agent (you) acts as the Orchestrator/PM. Do NOT personally modify code to fix issue tickets. Delegate EVERY issue to a subagent.
    - **Parallel Execution**: Spawn multiple subagents to handle independent issues concurrently. Minimize sequential processing unless strictly required by environment constraints.

4.  **Continuous Monitoring**:
    - Track the progress of each issue resolution.
    - **Regression Check**: After each major fix, verify that the dev server (`npm run dev` / `python main.py`) is still healthy.
    - **Dynamic Issue Logging**: If a resolution reveals a new, separate bug, create a new GitHub Issue (`gh issue create --title ... --body-file ...`) immediately. Do not use the `ai-plan` or `ai-draft` labels.

5.  **Final Quality Sweep**:
    - Once all target issues are resolved, run the full relevant test suite (e.g., `pytest` for backend, UI audit for frontend).
    - Perform a "sanity check" on the main application flows (Login -> Dashboard -> Feature).

6.  **Closing & Documentation**:
    - Ensure every resolved issue is referenced by `Fixes #N` in a commit or PR (or closed with `gh issue close`).
    - Verify that each resolved issue has a comment with a **Root Cause** analysis and a list of changed files.
    - If a Knowledge Item (KI) was updated or created during the process, mention it in the final report.

7.  **Unified Reporting**:
    - Provide the user with a consolidated summary of all resolved issues.
    - Highlight any new issues discovered or any roadblocks that prevented a 100% completion rate.
