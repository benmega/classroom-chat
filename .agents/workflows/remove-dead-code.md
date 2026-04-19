---
description: Find potentially unused and unneeded code, get user approval, remove it, verify success, and rollback on failure.
---

# Remove Dead Code Workflow

This workflow systematically identifies code that appears unused or unnecessary, presents evidence for user approval, safely removes it, and rolls back if anything breaks.

1.  **Snapshot**:
    // turbo
    - Create a git stash or commit of the current state so there is always a clean rollback point.
    - Run: `git stash push -m "dead-code-checkpoint"` (or `git add -A && git commit -m "checkpoint: before dead code removal"` if the working tree should be preserved).
    - Record which method was used so the rollback step knows how to undo it.

2.  **Discovery**:
    - Use `grep_search` and `list_dir` to scan the codebase for candidates:
        -   **Unused exports**: Functions, components, or constants that are exported but never imported elsewhere.
        -   **Unused files**: Modules with zero inbound imports.
        -   **Dead CSS**: Class names or CSS selectors with no matching usage in templates/JSX.
        -   **Commented-out code**: Large blocks of commented code that have persisted (not recent TODOs).
        -   **Unreachable logic**: Code behind always-false conditions, after unconditional returns, or in unused branches.
        -   **Deprecated helpers**: Utility functions superseded by newer implementations.
    - **Architecture Context**: Reference [frontend_design.md](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/frontend_design.md) and [backend_design.md](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/backend_design.md) to understand which modules are expected entry points, plug-ins, or dynamically loaded — these may appear unused but are intentional.

3.  **Evidence Gathering**:
    - For each candidate, search the **entire** project to confirm zero references:
        -   `grep_search` for the symbol name, class name, or file basename.
        -   Check for **dynamic usage** patterns: string-based imports, `getattr`, bracket-notation access (`obj[varName]`), template literals, or reflection.
        -   Check for **test-only usage**: If the symbol is used only in tests, flag it separately — removing it may require removing corresponding tests too.
        -   Check for **public API / external consumers**: If the project exposes an API or is used as a library, the symbol might be consumed externally.
    - **Confidence rating**: For each candidate classify as `HIGH` (zero references, no dynamic risk), `MEDIUM` (zero static references but dynamic use is plausible), or `LOW` (some indirect references, unclear if live).

4.  **Approval**:
    - Present a summary to the user listing each candidate with:
        -   File path and symbol/block name.
        -   Confidence rating and reasoning.
        -   Number of lines to be removed.
    - **STOP and wait for explicit user approval** before making any deletions. The user may approve all, approve selectively, or reject.

5.  **Removal**:
    - Only remove user-approved candidates.
    - Use `replace_file_content` or `multi_replace_file_content` for surgical removals within files.
    - For entire unused files, delete them using `run_command` (e.g., `Remove-Item`).
    - Remove any now-orphaned imports or references that pointed to the deleted code.
    - **Cascading cleanup**: After each removal, re-check whether anything else became unused as a result (e.g., a helper only used by the now-deleted function). Flag any cascading candidates but do not remove them without mentioning them to the user.

6.  **Verification**:
    - **Build check**: Run `npm run dev` (frontend) and/or `python main.py` (backend) and monitor for errors or new warnings.
    - **Lint check**: Run any configured linters or type checkers and verify no new errors were introduced.
    - **UI smoke test**: If frontend code was removed, use `browser_subagent` to navigate the affected pages at `http://localhost:5173` and confirm nothing is visibly broken.
    - **Backend smoke test**: If backend code was removed, hit the relevant API endpoints via `read_url_content` or `browser_subagent` and confirm correct responses.

7.  **Rollback** (if verification fails):
    - If any verification step fails and the fix is not immediately obvious:
        // turbo
        -   Restore the snapshot: `git stash pop` or `git reset --hard HEAD~1` (matching the method from Step 1).
        -   Confirm the rollback succeeded by re-running the failed verification step.
    - Report to the user exactly what failed, which removal likely caused it, and why.

8.  **Finalize** (if verification passes):
    // turbo
    - If a stash-based checkpoint was used, drop it: `git stash drop`.
    - If a commit-based checkpoint was used, squash or amend as appropriate.

9.  **Summary**:
    - Report what was removed, total lines eliminated, and verification results.
    - If any `MEDIUM`-confidence candidates were skipped or deferred, mention them as candidates for a future pass.

## Edge Cases & Guardrails

- **Dynamic imports / reflection**: Never rate something `HIGH` confidence if the codebase uses patterns like `import()`, `require(variable)`, `getattr()`, or string-based component resolution that could reference the symbol at runtime.
- **Config-driven code**: Check config files, environment variables, and feature flags — a function might be toggled off but still needed.
- **CSS-in-JS / scoped styles**: Class names generated at build time (CSS Modules, styled-components) won't grep cleanly. Trace usage through the component tree, not just raw string search.
- **Backend route handlers**: A route handler may have zero in-code callers but is invoked by HTTP requests. Always cross-reference with API documentation or route registrations.
- **Migration / seed files**: Database migrations and seed scripts are run outside normal app flow. Never flag these as dead code unless they are clearly superseded.
- **Monorepo / multi-package**: If the project has multiple packages, search across all of them before concluding a symbol is unused.
