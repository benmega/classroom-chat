"""
File: test_schema.py
Type: py
Summary: The database the migrations produce must match the models.

The shared test app builds its tables with db.create_all(), and so does create_app()
outside production, so comparing that database with the models can never fail. These
tests build the schema the two ways a real database gets one, each time in a fresh
SQLite file on a separate Flask app, and only then compare it with the models.

A new database: the migrations cannot build a schema from nothing (the root revision
is an empty placeholder and the next ones alter tables that must already exist), so
the supported path is db.create_all() followed by a stamp to head. deploy.sh does
that when it finds no alembic_version table.

An existing database: schemas/legacy_b2fd06ed54ab.sql is the schema of a long-lived
database. `flask db upgrade` runs every later revision on it and the result must
match the models. This is the test that fails when a model gains a table, column,
index or constraint without a migration, or when a new migration cannot cope with
DDL that differs from what the models generate.
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
from alembic.script import ScriptDirectory
from application.extensions import db
from application.models import setup_models
from flask import Flask
from flask_migrate import Migrate

MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations"

# Schema only, no rows. The revision is the one that database was stamped with.
LEGACY_SCHEMA = Path(__file__).resolve().parent / "schemas" / "legacy_b2fd06ed54ab.sql"
LEGACY_REVISION = "b2fd06ed54ab"


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


def _head_revisions():
    return set(ScriptDirectory(str(MIGRATIONS_DIR)).get_heads())


def _stamped_revisions(engine):
    with engine.connect() as connection:
        return set(MigrationContext.configure(connection).get_current_heads())


def _schema_sql(engine):
    """Every table and index with the SQL that defines it, except Alembic's own table."""
    with engine.connect() as connection:
        rows = connection.execute(
            sa.text("SELECT name, sql FROM sqlite_master WHERE name != 'alembic_version'")
        )
        return {name: sql for name, sql in rows}


def _load_schema(engine, path):
    connection = engine.raw_connection()
    try:
        connection.driver_connection.executescript(path.read_text(encoding="utf-8"))
    finally:
        connection.close()


def test_the_migrations_have_exactly_one_head():
    heads = _head_revisions()

    assert len(heads) == 1, (
        f"The migration history has {len(heads)} heads: {sorted(heads)}. A new "
        "revision's down_revision must be the current head (`flask db heads`)."
    )


def test_a_new_database_is_built_from_the_models_and_stamped_to_head(migration_app):
    """The supported way to create a database. Once it is stamped, the migrations
    have nothing left to run on it and must leave it alone."""
    db.create_all()
    flask_migrate.stamp(directory=str(MIGRATIONS_DIR), revision="head")
    schema_before = _schema_sql(db.engine)

    flask_migrate.upgrade(directory=str(MIGRATIONS_DIR))

    assert _stamped_revisions(db.engine) == _head_revisions()
    assert _schema_sql(db.engine) == schema_before
    assert _schema_drift(db.engine, db.metadata) == []


def test_upgrading_a_legacy_database_gives_the_schema_of_the_models(migration_app):
    """The schema the migrations build must match the models.

    This catches a developer who changes a model but forgets the migration, and a
    migration that only works on a schema built from the models.
    """
    _load_schema(db.engine, LEGACY_SCHEMA)
    flask_migrate.stamp(directory=str(MIGRATIONS_DIR), revision=LEGACY_REVISION)
    # The legacy schema is behind the models, or the comparison below proves nothing
    assert _schema_drift(db.engine, db.metadata)

    flask_migrate.upgrade(directory=str(MIGRATIONS_DIR))

    assert _stamped_revisions(db.engine) == _head_revisions()
    drift = _schema_drift(db.engine, db.metadata)
    assert not drift, (
        "Database schema built by the migrations does not match the models. "
        "Missing migrations?\nDifferences detected:\n"
        + "\n".join(str(entry) for entry in drift)
    )


# The drift check itself, against schemas built from the models and by hand: a check
# that reports nothing would make the two tests above pass whatever the migrations do.


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
