"""
DEPRECATED — do not use.

This file is no longer called by anything in the deploy pipeline.
Use the standard Alembic CLI instead:

    cd backend
    flask db upgrade        # apply all pending migrations (what deploy.sh runs)
    flask db migrate -m ""  # auto-generate a new migration from model changes
    flask db downgrade      # roll back one revision

See backend/migrations/versions/ for the full migration history.

This file will be removed in a future cleanup commit.
"""

raise RuntimeError(
    "run_migrations.py is deprecated and should not be executed directly. "
    "Run `flask db upgrade` instead."
)
