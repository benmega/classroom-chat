import pytest
from alembic.config import Config
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from application.extensions import db

def test_schema_matches_models(app):
    """
    Test that the database schema matches the models.
    This catches cases where a developer adds a column to a model
    but forgets to create a migration script.
    """
    with app.app_context():
        # Get the current database connection
        connection = db.engine.connect()
        
        # Create an Alembic migration context
        context = MigrationContext.configure(connection)
        
        # Compare the database metadata with the model metadata
        # target_metadata is what the models define
        diff = compare_metadata(context, db.metadata)
        
        # If there are any differences, the test should fail
        # compare_metadata returns a list of differences (tuples)
        # We filter out 'removed' items if they are expected, but usually 
        # any diff here means a migration is missing.
        
        # Note: SQLite has some limitations with reflection (e.g. indexes, constraints)
        # so we might need to be selective or accept some known drift if using SQLite in tests.
        
        if diff:
            diff_str = "\n".join([str(d) for d in diff])
            pytest.fail(f"Database schema does not match models. Missing migrations?\nDifferences detected:\n{diff_str}")
        
        connection.close()
