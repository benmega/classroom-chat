import logging

from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from application.extensions import db

logger = logging.getLogger(__name__)

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


def check_for_schema_drift(app):
    """
    Compares the database schema with the models and logs a loud warning
    if there is a mismatch (missing migrations).
    """
    try:
        with app.app_context():
            # Closed on exit, including when the comparison raises
            with db.engine.connect() as connection:
                context = MigrationContext.configure(connection)
                diff = compare_metadata(context, db.metadata)
                revisions = context.get_current_heads() if diff else ()

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

                # We don't crash the app, just warn loudly
                logger.warning(
                    "Database schema drift detected. The report above says how to sync."
                )

    except Exception as e:
        # Don't let the check crash the app if something goes wrong with the check itself
        logger.exception(f"Failed to check for schema drift: {e}")
