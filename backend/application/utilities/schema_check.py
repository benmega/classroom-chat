import logging
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from application.extensions import db

logger = logging.getLogger(__name__)

def check_for_schema_drift(app):
    """
    Compares the database schema with the models and prints a loud warning
    if there is a mismatch (missing migrations).
    """
    try:
        with app.app_context():
            connection = db.engine.connect()
            context = MigrationContext.configure(connection)
            diff = compare_metadata(context, db.metadata)
            connection.close()

            if diff:
                print("\n" + "!" * 80)
                print(" " * 25 + "DATABASE SCHEMA DRIFT DETECTED")
                print("!" * 80)
                print("\nYour models and database schema are out of sync!")
                print("Please run the following commands to update your migrations:")
                print("\n    export FLASK_APP=main.py")
                print("    flask db migrate -m \"Your description\"")
                print("    flask db upgrade")
                print("\nDifferences detected:")
                for d in diff:
                    print(f"  - {d}")
                print("\n" + "!" * 80 + "\n")
                
                # We don't crash the app, just warn loudly
                logger.warning("Database schema drift detected. Run migrations to sync.")
                
    except Exception as e:
        # Don't let the check crash the app if something goes wrong with the check itself
        logger.error(f"Failed to check for schema drift: {e}")
