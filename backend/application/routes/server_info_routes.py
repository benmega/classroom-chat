"""
File: server_info_routes.py
Type: py
Summary: Health and liveness routes for deploy.sh, the Route 53 health check and nginx.

/server/health asks the database two questions and says which one failed:

* "database": SELECT 1 on a connection of its own.
* "migrations": the revision in alembic_version is the head of backend/migrations.
  A database with no alembic_version table is one create_all built from the models
  (development, the tests). That passes outside production and fails in production,
  where deploy.sh builds the schema with Alembic and always stamps it.

It answers 200 with the list of checks, or 503 naming the failing ones, so a boot with
a missing or half-applied schema fails the deploy gate in deploy.sh instead of passing it.
It does not probe the scheduler or the sockets, and each call costs two or three small
queries. /server/live is the variant with no database access at all.
"""

import logging
from pathlib import Path

from alembic.script import ScriptDirectory
from application.extensions import db, limiter
from flask import Blueprint, current_app, jsonify
from sqlalchemy import inspect, text

logger = logging.getLogger(__name__)

server_info = Blueprint("server_info", __name__, url_prefix="/server")

# backend/migrations, wherever the process was started from
MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "migrations"
VERSION_TABLE = "alembic_version"

_migration_heads = None


def migration_heads():
    """The head revisions of the migration scripts, read on the first call and kept:
    the scripts cannot change while the code runs, and reading them imports every one."""
    global _migration_heads
    if _migration_heads is None:
        _migration_heads = frozenset(ScriptDirectory(str(MIGRATIONS_DIR)).get_heads())
    return _migration_heads


def _check_migrations(connection):
    """The "migrations" check: is the database at the head of the migration scripts?"""
    try:
        heads = migration_heads()
        if not inspect(connection).has_table(VERSION_TABLE):
            if current_app.config.get("HEALTH_REQUIRES_MIGRATION_STAMP"):
                return {"ok": False, "detail": f"no {VERSION_TABLE} table: the schema was never stamped"}
            return {"ok": True, "detail": f"no {VERSION_TABLE} table: the schema was built from the models"}
        stamped = {row[0] for row in connection.execute(text(f"SELECT version_num FROM {VERSION_TABLE}"))}
    except Exception:
        logger.exception("Health check: could not read the migration state")
        return {"ok": False, "detail": "could not read the migration state"}

    if stamped == heads:
        return {"ok": True, "detail": "the database is at the migration head"}
    # The revisions are for the log; the response is public
    logger.error(
        "Health check: the database is at revision %s, the migration scripts end at %s",
        ", ".join(sorted(stamped)) or "(none)",
        ", ".join(sorted(heads)) or "(none)",
    )
    return {"ok": False, "detail": "the database is not at the migration head"}


@server_info.route("/health")
@limiter.exempt
def health_check():
    checks = {}
    try:
        with db.engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            checks["database"] = {"ok": True}
            checks["migrations"] = _check_migrations(connection)
    except Exception:
        # The message can hold the database path or SQL: it goes to the log, not the response
        logger.exception("Health check: the database did not answer")
        checks["database"] = {"ok": False, "detail": "the database did not answer"}

    failed = [name for name, result in checks.items() if not result["ok"]]
    if failed:
        return jsonify({"status": "unhealthy", "failed": failed, "checks": checks}), 503
    return jsonify({"status": "ok", "checks": checks}), 200


@server_info.route("/live")
@limiter.exempt
def liveness_check():
    """The process is up and serving requests. Touches nothing else, for frequent polling."""
    return "SystemHealthy", 200
