"""
File: test_app_schema_startup.py
Type: py
Summary: create_app() builds the schema from the models everywhere but in production.

Production leaves the schema to Alembic (deploy.sh creates a new database and runs
`flask db upgrade`), development also compares the database with the models. Each
test starts real apps on its own empty SQLite file.
"""

import sys
from unittest.mock import patch

import pytest
import sqlalchemy as sa
from application import create_app
from application.config import DevelopmentConfig, ProductionConfig, TestingConfig
from application.constants import GLOBAL_CLASSROOM_ID
from application.extensions import db, scheduler, socketio
from application.models.classroom import Classroom
from application.models.configuration import Configuration


@pytest.fixture
def start_app(tmp_path):
    """Start an app with the given config class on this test's SQLite file."""
    uri = f"sqlite:///{(tmp_path / 'startup.db').as_posix()}"
    apps = []

    def start(config_class):
        config = type("StartupConfig", (config_class,), {"SQLALCHEMY_DATABASE_URI": uri})
        with patch.object(scheduler, "start"), patch.object(socketio, "init_app"):
            app = create_app(config)
        apps.append(app)
        return app

    yield start
    for app in apps:
        with app.app_context():
            db.session.remove()
            db.engine.dispose()  # release the file so the folder can be deleted


def _tables(app):
    with app.app_context():
        return set(sa.inspect(db.engine).get_table_names())


def test_production_start_leaves_an_empty_database_empty(start_app, caplog):
    with caplog.at_level("WARNING", logger="application"):
        app = start_app(ProductionConfig)

    assert _tables(app) == set()
    assert "The database has no schema yet" in caplog.text


def test_production_start_does_not_add_a_missing_table(start_app):
    start_app(TestingConfig)  # builds every table
    with start_app(TestingConfig).app_context():
        db.session.execute(sa.text("DROP TABLE skills"))
        db.session.commit()

    app = start_app(ProductionConfig)

    assert "skills" not in _tables(app)
    assert "users" in _tables(app)


def test_production_start_fills_in_the_defaults_once_the_schema_exists(start_app):
    # deploy.sh on a new database: load the app, build the schema, load the app again
    with start_app(ProductionConfig).app_context():
        db.create_all()

    app = start_app(ProductionConfig)

    with app.app_context():
        assert Configuration.query.count() == 1
        assert db.session.get(Classroom, GLOBAL_CLASSROOM_ID) is not None
        assert db.session.get(Classroom, "archive") is not None
    assert app.test_client().get("/server/health").status_code == 200


@pytest.mark.parametrize("config_class", [DevelopmentConfig, TestingConfig])
def test_start_outside_production_builds_the_schema(start_app, config_class):
    app = start_app(config_class)

    assert set(db.metadata.tables) <= _tables(app)
    with app.app_context():
        assert Configuration.query.count() == 1


def test_a_flask_db_command_builds_nothing(start_app):
    with patch.object(sys, "argv", ["flask", "db", "upgrade"]):
        app = start_app(DevelopmentConfig)

    assert _tables(app) == set()


def test_development_start_checks_the_schema_for_drift(start_app):
    with patch("application.check_for_schema_drift") as check:
        app = start_app(DevelopmentConfig)

    check.assert_called_once_with(app)


@pytest.mark.parametrize("config_class", [TestingConfig, ProductionConfig])
def test_only_development_checks_the_schema_for_drift(start_app, config_class):
    with patch("application.check_for_schema_drift") as check:
        start_app(config_class)

    check.assert_not_called()


def test_development_start_reports_a_column_the_database_lacks(start_app, caplog):
    start_app(DevelopmentConfig)
    with start_app(DevelopmentConfig).app_context():
        db.session.execute(sa.text("ALTER TABLE skills DROP COLUMN proficiency"))
        db.session.commit()

    with caplog.at_level("ERROR", logger="application"):
        start_app(DevelopmentConfig)

    assert "DATABASE SCHEMA DRIFT DETECTED" in caplog.text
    assert "proficiency" in caplog.text


def test_development_start_reports_nothing_for_a_schema_built_from_the_models(
    start_app, caplog
):
    with caplog.at_level("WARNING", logger="application"):
        start_app(DevelopmentConfig)
        start_app(DevelopmentConfig)

    assert "SCHEMA DRIFT" not in caplog.text
    assert "schema drift" not in caplog.text
