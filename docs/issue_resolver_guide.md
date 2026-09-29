# Project Issue Cycle Workflows

Issues are tracked in **GitHub Issues** for `benmega/classroom-chat`, driven with the `gh` CLI. (The old
`issues/` markdown directory is retired.) Two workflows help an agent **find**, **document**, **resolve**
and **close** issues. Their definitions live in `.agents/workflows/`.

## Labels

Use `bug`, `enhancement`, `documentation`, plus optional `priority:critical|high|medium|low` and `type:*`
labels. Only `bug`, `enhancement` and `documentation` exist by default; create others once with
`gh label create "priority:high"` (or omit them). **Never add the `ai-plan` or `ai-draft` labels**: they
trigger automated AI workflows (`.github/workflows/ai-planner.yml`, `ai-coder.yml`).

---

## 1. UI Bug Testing (Discovery)

- **Workflows**: `.agents/workflows/test-ui-desktop.md` and `.agents/workflows/test-ui-mobile.md`
- **Extraction from a review transcript**: `.agents/workflows/extract-issues.md`

### Discovery details
1. **Exploration**: The agent uses a browser tool to explore the application routes in desktop and mobile viewports (log in via `.agents/workflows/login.md`).
2. **Audit**: Checks for functional bugs (broken forms) and visual flaws (element overlap).
3. **Documentation**: Checks for duplicates with `gh issue list --state open --search "<keywords>"`, then files each bug:

```bash
gh issue create --title "Short description" --label bug --body-file issue.md
```

The body should have Description, Requirements, Repro Steps and Verification Results (see `extract-issues.md`).

---

## 2. Solve Issues (Resolution)

- **Workflows**: `.agents/workflows/solve-issue.md` (one issue) and `.agents/workflows/solve-all-issues.md` (all open issues).

### Resolution details
1. **Selection**: `gh issue list --state open` (pick the oldest or highest priority); read it with `gh issue view <number>`.
2. **Implementation**: Targeted fix in `frontend` or `backend`, then verification (pytest / vitest / UI check).
3. **Closing**: Commit and open a PR whose body contains `Fixes #<number>`; the issue closes on merge. Add a comment with the root cause and changed files (`gh issue comment <number> --body-file notes.md`).
4. **Follow-ups**: If part of the work remains, file a new issue for it and link it from the original.

---

> [!TIP]
> You can tell the agent: "Run the desktop UI test workflow for the admin panel" to focus on one area.
