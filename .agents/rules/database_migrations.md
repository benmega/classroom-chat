---
name: Alembic Migrations
description: Rules for generating and managing database migrations
always_on: false
---

# Database Migrations (Alembic)

When working with database migrations in this repository, you must enforce a strictly linear migration history.

1. **Check for Multiple Heads**: Before pushing new database migrations, or if investigating a deployment failure involving `flask db upgrade`, verify there is only a single head by running `flask db heads`.
2. **Resolve Forks**: If you encounter multiple head revisions, you MUST resolve the fork by running `flask db merge heads -m "merge multiple heads"`.
3. **Commit the Merge**: Always commit the resulting merge migration file alongside your changes before deploying or pushing to the repository.
4. **No One-Off Database Scripts**: Alembic is the only supported way to change the schema. Do not write raw-SQL or one-off scripts (ad hoc `sqlite3` files, `ALTER TABLE` snippets, helpers under `backend/instance/`). Schema changes go through `flask db migrate`; data fixes go in an Alembic data migration or an idempotent step in `backend/tools/migrate_classroom.py`, which must never contain DDL. The production sequence (backup, `flask db upgrade`, `python -m tools.migrate_classroom`, `flask seed`) is documented in `docs/infrastructure_and_devops.md`.
