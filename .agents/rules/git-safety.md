---
name: Git Safety Rules
description: Rules to prevent accidental data loss from destructive git checkout commands.
---

# Git Checkout Safety

**CRITICAL:** NEVER run `git checkout <path>`, `git restore <path>`, or `git clean` if there are unstaged or uncommitted changes in the repository unless explicitly authorized by the user.

Destructive git commands will permanently wipe the user's uncommitted work and cause severe data loss.

Before reverting files:
1. Always run `git status` to see what is modified.
2. If there are uncommitted changes, **DO NOT** use `git checkout`.
3. If you must revert a specific mistake, manually undo the change or use a script.
4. Warn the user if you think their working directory is dirty and needs to be committed.
