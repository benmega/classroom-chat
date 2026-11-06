---
name: remove-dead-code
description: Find potentially unused and unneeded code, get user approval, remove it, verify success, and roll back on failure.
---

# Remove Dead Code Workflow

Identify code that appears unused, present evidence for user approval, remove it safely, and roll back if anything breaks. Follow [git-safety.md](../../rules/git-safety.md): never stash, never `git reset --hard`.

1.  **Snapshot**:
    - Require a clean `git status`. If the tree is dirty, stop and ask the user; do not stash.
    - Record `git rev-parse HEAD` as the checkpoint. It is the rollback point.

2.  **Discovery**: search the codebase for candidates:
    -   **Unused exports**: functions, components or constants exported but never imported.
    -   **Unused files**: modules with zero inbound imports.
    -   **Dead CSS**: classes or selectors with no matching usage in JSX.
    -   **Commented-out code**: large blocks that have persisted (not recent TODOs).
    -   **Unreachable logic**: code behind always-false conditions, after unconditional returns, or in unused branches.
    -   **Deprecated helpers**: utilities superseded by newer ones.
    -   **Architecture context**: check [frontend_design.md](../../../docs/frontend_design.md) and [backend_design.md](../../../docs/backend_design.md) for expected entry points, plug-ins and dynamically loaded modules. They may look unused but are intentional.
    -   **Personality**: never flag Easter eggs or the quack sound as dead code ([PERSONALITY_GUIDE.md](../../../PERSONALITY_GUIDE.md)).

3.  **Evidence**: for each candidate, search the **entire** project for the symbol name, class name or file basename, and check:
    -   **Dynamic usage**: string-based imports, `getattr`, bracket access (`obj[varName]`), template literals, reflection.
    -   **Test-only usage**: flag it separately; removing it may mean removing its tests too.
    -   **External consumers**: HTTP routes and any public API.
    -   Rate each candidate `HIGH` (zero references, no dynamic risk), `MEDIUM` (zero static references but dynamic use is plausible) or `LOW` (some indirect references, unclear if live).

4.  **Approval**: show the user each candidate with its file path and symbol or block, its confidence and reasoning, and the lines to be removed. **STOP and wait for explicit approval** (all, some or none) before deleting anything.

5.  **Removal**:
    -   Remove only approved candidates: edit surgically within files, delete whole unused files, and remove the imports and references they leave orphaned.
    -   Re-check after each removal for cascading candidates (a helper used only by the deleted function). Mention them to the user; do not remove them unasked.
    -   Commit the removal on its own (stage only the files you touched), so it can be reverted as one unit.

6.  **Verification**:
    -   **Lint and tests**: run `ruff check .` and `pytest` (from `backend/`) and `npm run lint` and `npm run test` (from `frontend/`).
    -   **Frontend smoke test**: if frontend code was removed, start the dev servers (see the login skill), open the affected pages at `http://localhost:5173` and confirm nothing is visibly broken.
    -   **Backend smoke test**: if backend code was removed, call the relevant API endpoints and confirm correct responses.

7.  **Rollback** (if verification fails and the fix is not obvious): `git revert --no-edit <removal-sha>`, or re-create a deleted file from the checkpoint with `git show <checkpoint>:<path>`. Never `git reset --hard`, never stash. Re-run the failed check to confirm the rollback, then tell the user what failed, which removal likely caused it, and why.

8.  **Finalize** (if verification passes): leave the commit; squash it only if the user asks.

9.  **Summary**: report what was removed, the lines eliminated and the verification results. Mention any `MEDIUM` candidates you skipped as material for a later pass.

## Edge cases

- **Dynamic imports and reflection**: never rate something `HIGH` if the codebase uses `import()`, `require(variable)`, `getattr()` or string-based component resolution that could reach the symbol at runtime.
- **Config-driven code**: check config files, environment variables and feature flags; a function toggled off may still be needed.
- **Generated class names** (CSS Modules, styled-components) do not grep cleanly: trace usage through the component tree.
- **Backend route handlers** may have no in-code callers yet be called over HTTP: cross-check route registrations and [api_reference.md](../../../docs/api_reference.md).
- **Migrations and seed scripts** run outside the normal app flow: never flag them unless clearly superseded.
- **Multiple packages**: search all of them before concluding a symbol is unused.
