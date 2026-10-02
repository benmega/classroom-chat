"""
File: test_schema.py
Type: py
Summary: The database built by the Alembic migrations must match the models.

The shared test app builds its tables with db.create_all(), and so does create_app(),
so comparing that database with the models can never fail. These tests build the
schema the way production does, by running the migrations into a fresh SQLite file
on a separate Flask app, and only then compare it with the models.

Running the migrations from an empty database does not work today (the first
migrations assume tables that already exist), so the two migration tests are marked
xfail until GitHub issue #60 is resolved. The drift check itself is exercised by the
other tests, against schemas built from the models.
"""

import logging
import logging.config
import sys
import tempfile
from contextlib import contextmanager
from pathlib import Path

import flask_migrate
import pytest
import sqlalchemy as sa
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from alembic.util.exc import CommandError
from application.extensions import db
from application.models import setup_models
from flask import Flask
from flask_migrate import Migrate
from sqlalchemy.exc import SQLAlchemyError

MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations"

# What xfail may swallow: the migrations failing on the database (or Alembic refusing
# to run them), never a typo in the test itself.
MIGRATION_ERRORS = (SQLAlchemyError, CommandError)


@pytest.fixture
def migration_app():
    """A throwaway Flask app on its own empty SQLite file, inside its app context.

    It is not create_app(), which would fill the file with db.create_all() before any
    migration ran. The file is removed afterwards, even when the test fails.
    """
    with tempfile.TemporaryDirectory(
        prefix="migration_test_", ignore_cleanup_errors=True
    ) as folder, _restored_logging():
        app = Flask("migration_test")
        app.config.update(
            SQLALCHEMY_DATABASE_URI=f"sqlite:///{(Path(folder) / 'mig.db').as_posix()}",
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
            # SQLite waits this long (seconds) for a lock, then raises: nothing can hang.
            SQLALCHEMY_ENGINE_OPTIONS={"connect_args": {"timeout": 5}},
        )
        db.init_app(app)
        Migrate(app, db, directory=str(MIGRATIONS_DIR), render_as_batch=True)
        with app.app_context():
            setup_models()
            try:
                yield app
            finally:
                db.session.remove()
                db.engine.dispose()  # release the file before the folder is deleted


@contextmanager
def _restored_logging():
    """migrations/env.py calls logging.config.fileConfig, which replaces the root
    handlers and disables every logger that already exists. Put it all back so the
    tests that run after the migrations still see their logs."""
    root = logging.getLogger()
    saved_root = (root.level, root.handlers[:])
    saved_loggers = {
        name: (lg.level, lg.handlers[:], lg.propagate, lg.disabled)
        for name, lg in logging.Logger.manager.loggerDict.items()
        if isinstance(lg, logging.Logger)
    }
    try:
        yield
    finally:
        root.setLevel(saved_root[0])
        root.handlers[:] = saved_root[1]
        for name, (level, handlers, propagate, disabled) in saved_loggers.items():
            lg = logging.getLogger(name)
            lg.setLevel(level)
            lg.handlers[:] = handlers
            lg.propagate = propagate
            lg.disabled = disabled


def _flatten(diff):
    """compare_metadata nests the column-level changes of one table in a list."""
    for entry in diff:
        if isinstance(entry, list):
            yield from _flatten(entry)
        else:
            yield entry


def _unique_columns(obj):
    return obj.table.name, tuple(column.name for column in obj.columns)


def _without_sqlite_noise(diff):
    """Drop the differences that are not drift on SQLite.

    A unique index and a unique constraint on the same columns enforce the same rule,
    but Alembic reports one as removed and the other as added. That is what a model
    column with unique=True looks like next to a migration that called
    create_index(..., unique=True). Everything else is kept: a missing column,
    table or index, a different nullability, a foreign key that differs.
    """
    entries = list(_flatten(diff))

    def is_unique_index(entry):
        return entry[0] in ("add_index", "remove_index") and entry[1].unique

    def is_unique_constraint(entry):
        return entry[0] in ("add_constraint", "remove_constraint") and isinstance(
            entry[1], sa.UniqueConstraint
        )

    unique_indexes = {_unique_columns(e[1]) for e in entries if is_unique_index(e)}
    unique_constraints = {
        _unique_columns(e[1]) for e in entries if is_unique_constraint(e)
    }
    equivalent = unique_indexes & unique_constraints

    return [
        entry
        for entry in entries
        if not (
            (is_unique_index(entry) or is_unique_constraint(entry))
            and _unique_columns(entry[1]) in equivalent
        )
    ]


def _schema_drift(engine, metadata):
    """What an Alembic autogenerate against `engine` would still want to change so the
    database matches `metadata`. An empty list means no migration is missing.

    Column types and server defaults are not compared: SQLite only keeps a type
    affinity and the text of a default, so they never reflect back faithfully.
    """
    connection = engine.connect()
    try:
        context = MigrationContext.configure(
            connection,
            opts={"compare_type": False, "compare_server_default": False},
        )
        return _without_sqlite_noise(compare_metadata(context, metadata))
    finally:
        connection.close()


@pytest.mark.xfail(
    strict=False,
    raises=MIGRATION_ERRORS,
    reason="flask db upgrade fails on an empty database: the first migrations assume "
    "existing tables. Tracked in GitHub issue #60",
)
def test_migrations_run_on_an_empty_database(migration_app):
    """`flask db upgrade` must build the whole schema from nothing."""
    flask_migrate.upgrade(directory=str(MIGRATIONS_DIR))

    tables = sa.inspect(db.engine).get_table_names()
    assert "users" in tables
    assert "alembic_version" in tables


@pytest.mark.xfail(
    strict=False,
    raises=(*MIGRATION_ERRORS, AssertionError),
    reason="needs a database the migrations can build, and any drift it reveals still "
    "has to be triaged. Tracked in GitHub issue #60",
)
def test_migrated_schema_matches_models(migration_app):
    """The schema the migrations build must match the models.

    This catches a developer who adds a column to a model but forgets the migration.
    """
    flask_migrate.upgrade(directory=str(MIGRATIONS_DIR))

    drift = _schema_drift(db.engine, db.metadata)

    assert not drift, (
        "Database schema built by the migrations does not match the models. "
        "Missing migrations?\nDifferences detected:\n"
        + "\n".join(str(entry) for entry in drift)
    )


# The drift check itself. These run against schemas that exist today, so a broken
# check shows up now and not on the day the migrations can be run from scratch.


def test_drift_check_is_clean_for_a_schema_built_from_the_models(migration_app):
    db.create_all()

    assert _schema_drift(db.engine, db.metadata) == []


def test_drift_check_reports_a_missing_table(migration_app):
    db.create_all()
    with db.engine.begin() as connection:
        connection.execute(sa.text("DROP TABLE skills"))

    drift = _schema_drift(db.engine, db.metadata)

    assert [(kind, table.name) for kind, table in drift] == [("add_table", "skills")]


def test_drift_check_reports_a_missing_column(migration_app):
    db.create_all()
    with db.engine.begin() as connection:
        connection.execute(sa.text("ALTER TABLE skills DROP COLUMN proficiency"))

    drift = _schema_drift(db.engine, db.metadata)

    assert [(e[0], e[2], e[3].name) for e in drift] == [("add_column", "skills", "proficiency")]


def test_drift_check_closes_its_connection_when_the_comparison_fails(
    migration_app, monkeypatch
):
    def fail(context, metadata):
        raise RuntimeError("comparison failed")

    monkeypatch.setattr(sys.modules[__name__], "compare_metadata", fail)
    engine = db.engine
    real_connect = engine.connect
    opened = []

    def connect():
        connection = real_connect()
        opened.append(connection)
        return connection

    monkeypatch.setattr(engine, "connect", connect)

    with pytest.raises(RuntimeError, match="comparison failed"):
        _schema_drift(engine, db.metadata)

    # The list keeps the connection alive, so garbage collection cannot hide a leak
    assert len(opened) == 1
    assert opened[0].closed


def _engine_with(ddl):
    engine = sa.create_engine("sqlite://", poolclass=sa.pool.StaticPool)
    with engine.begin() as connection:
        for statement in ddl:
            connection.execute(sa.text(statement))
    return engine


def _items_with_unique_name():
    metadata = sa.MetaData()
    sa.Table(
        "items",
        metadata,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(10), unique=True),
    )
    return metadata


def test_a_unique_index_is_not_drift_when_the_model_declares_a_unique_column():
    engine = _engine_with(
        [
            "CREATE TABLE items (id INTEGER NOT NULL PRIMARY KEY, name VARCHAR(10))",
            "CREATE UNIQUE INDEX ix_items_name ON items (name)",
        ]
    )
    metadata = _items_with_unique_name()

    with engine.connect() as connection:
        context = MigrationContext.configure(connection)
        unfiltered = list(_flatten(compare_metadata(context, metadata)))

    # Alembic does report the index and the constraint as two differences ...
    assert {entry[0] for entry in unfiltered} == {"remove_index", "add_constraint"}
    # ... and they cancel out.
    assert _schema_drift(engine, metadata) == []


def test_a_plain_index_is_still_drift_when_the_model_declares_a_unique_column():
    engine = _engine_with(
        [
            "CREATE TABLE items (id INTEGER NOT NULL PRIMARY KEY, name VARCHAR(10))",
            "CREATE INDEX ix_items_name ON items (name)",
        ]
    )

    drift = _schema_drift(engine, _items_with_unique_name())

    assert {entry[0] for entry in drift} == {"remove_index", "add_constraint"}


def test_a_missing_unique_rule_is_still_drift():
    engine = _engine_with(
        ["CREATE TABLE items (id INTEGER NOT NULL PRIMARY KEY, name VARCHAR(10))"]
    )

    drift = _schema_drift(engine, _items_with_unique_name())

    assert [entry[0] for entry in drift] == ["add_constraint"]


def test_running_the_migrations_leaves_logging_as_it_was():
    root = logging.getLogger()
    probe = logging.getLogger("migration_test.probe")
    handlers_before = root.handlers[:]
    probe_disabled_before = probe.disabled

    with _restored_logging():
        logging.config.fileConfig(MIGRATIONS_DIR / "alembic.ini")
        assert probe.disabled  # fileConfig disables loggers that already exist

    assert root.handlers == handlers_before
    assert probe.disabled == probe_disabled_before
