import logging

from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from application.extensions import db

logger = logging.getLogger(__name__)


def check_for_schema_drift(app):
    """
    Compares the database schema with the models and logs a loud warning
    if there is a mismatch (missing migrations).
    """
    try:
        with app.app_context():
            connection = db.engine.connect()
            context = MigrationContext.configure(connection)
            diff = compare_metadata(context, db.metadata)
            connection.close()

            if diff:
                banner = "!" * 80
                lines = [
                    "",
                    banner,
                    " " * 25 + "DATABASE SCHEMA DRIFT DETECTED",
                    banner,
                    "",
                    "Your models and database schema are out of sync!",
                    "Please run the following commands to update your migrations:",
                    "",
                    "    export FLASK_APP=main.py",
                    '    flask db migrate -m "Your description"',
                    "    flask db upgrade",
                    "",
                    "Differences detected:",
                    *(f"  - {d}" for d in diff),
                    "",
                    banner,
                ]
                logger.error("\n".join(lines))

                # We don't crash the app, just warn loudly
                logger.warning(
                    "Database schema drift detected. Run migrations to sync."
                )

    except Exception as e:
        # Don't let the check crash the app if something goes wrong with the check itself
        logger.exception(f"Failed to check for schema drift: {e}")
