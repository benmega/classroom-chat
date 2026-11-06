import logging

from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from application.extensions import db
from sqlalchemy import inspect

logger = logging.getLogger(__name__)

# Differences the production start-up summary lists before it points to 'flask db check'
SUMMARY_MAX_DIFFS = 10

_NEW_MIGRATION = [
    '        flask db migrate -m "describe the change"',
    "        flask db upgrade",
]


def _remedy(revisions):
    """What brings a drifting database back in line with the models, as report lines.

    ``revisions`` is what Alembic has stamped the database with: empty for a
    database that create_all built, which the 'flask db' commands cannot be
    pointed at as it is.
    """
    if revisions:
        return [
            f"This database is at Alembic revision {', '.join(revisions)}.",
            "",
            "  * You pulled a model change. Its migration came with it; apply it:",
            "",
            "        flask db upgrade",
            "",
            "  * You changed a model yourself. Write its migration, review the file",
            "    and apply it:",
            "",
            *_NEW_MIGRATION,
        ]
    return [
        "This database has no Alembic revision: create_all built it from the models",
        "as they were then, and create_all never alters a table that already exists.",
        "Neither 'flask db upgrade' nor 'flask db migrate' works on it as it is.",
        "",
        "  * The models changed after it was built (you pulled a change that came",
        "    with its migration). Either delete the database file, and the next start",
        "    builds a new one, or keep its data: stamp it with the revision that was",
        "    head when it was built, then upgrade from there:",
        "",
        "        flask db stamp <revision>",
        "        flask db upgrade",
        "",
        "  * You changed a model yourself. Bring the database to head as above first",
        "    ('flask db stamp head' when it was built by the code you started from),",
        "    then write the migration for your change, review the file and apply it:",
        "",
        *_NEW_MIGRATION,
    ]


def _compare_with_models(connection):
    """What differs between the database and the models, and the Alembic revisions
    the database is stamped with (only looked up when something differs)."""
    context = MigrationContext.configure(connection)
    diff = compare_metadata(context, db.metadata)
    revisions = context.get_current_heads() if diff else ()
    return diff, revisions


def log_schema_drift_summary(app):
    """
    Logs, once, whether the database matches the models. For the production start-up,
    where the full report of check_for_schema_drift would be wrong: it tells a
    developer to delete the database or stamp it, and in production Alembic owns the
    schema. This says how many differences there are, shows the first few and names the
    command that lists them all.

    Read-only (it only reflects the schema), never raises and never blocks the start-up.
    A database with no tables yet (deploy.sh has not built it) is left to create_app's
    own warning.
    """
    try:
        with app.app_context():
            # Closed on exit, including when the comparison raises
            with db.engine.connect() as connection:
                if not inspect(connection).get_table_names():
                    return
                diff, revisions = _compare_with_models(connection)

        if not diff:
            logger.info("The database schema matches the models.")
            return

        stamp = ", ".join(revisions) if revisions else "none"
        shown = [str(d)[:200] for d in diff[:SUMMARY_MAX_DIFFS]]
        more = len(diff) - len(shown)
        logger.error(
            "Database schema drift: %d difference(s) between the database (Alembic revision: %s) "
            "and the models. Run 'flask db check' to list them and 'flask db upgrade' to apply "
            "the pending migrations. First differences: %s%s",
            len(diff),
            stamp,
            "; ".join(shown),
            f"; ... and {more} more" if more > 0 else "",
        )
    except Exception as e:
        # A broken check must never keep the app from starting
        logger.exception(f"Failed to check for schema drift: {e}")


def check_for_schema_drift(app):
    """
    Compares the database schema with the models and logs a loud warning
    if there is a mismatch (missing migrations).
    """
    try:
        with app.app_context():
            # Closed on exit, including when the comparison raises
            with db.engine.connect() as connection:
                diff, revisions = _compare_with_models(connection)

            if diff:
                banner = "!" * 80
                lines = [
                    "",
                    banner,
                    " " * 25 + "DATABASE SCHEMA DRIFT DETECTED",
                    banner,
                    "",
                    "Your models and database schema are out of sync!",
                    "",
                    *_remedy(revisions),
                    "",
                    "Run the commands from backend/ with FLASK_APP=main.py. More in",
                    "docs/infrastructure_and_devops.md, section 8.",
                    "",
                    "Differences detected:",
                    *(f"  - {d}" for d in diff),
                    "",
                    banner,
                ]
                logger.error("\n".join(lines))

                logger.warning(
                    "Database schema drift detected. The report above says how to sync."
                )

    except Exception as e:
        # Don't let the check crash the app if something goes wrong with the check itself
        logger.exception(f"Failed to check for schema drift: {e}")
