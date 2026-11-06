"""
File: test_sqlite_runtime_settings.py
Type: py
Summary: Every SQLite connection create_app() opens runs in WAL mode with a short busy timeout.

Without these settings the production file runs on a rollback journal with pysqlite's
5 s busy wait, which blocks the whole gevent worker while one request waits for a lock
(issue #105). The tests start real apps on their own SQLite file.
"""

import sqlite3
from unittest.mock import MagicMock, patch

import pytest
import sqlalchemy as sa
from application import create_app
from application.config import TestingConfig
from application.extensions import SQLITE_PRAGMAS, apply_sqlite_pragmas, db, scheduler, socketio
from sqlalchemy import event
from sqlalchemy.engine import Engine


@pytest.fixture
def file_app(tmp_path):
    """An app whose database is a SQLite file in this test's folder."""
    uri = f"sqlite:///{(tmp_path / 'runtime.db').as_posix()}"
    config = type("FileDatabaseConfig", (TestingConfig,), {"SQLALCHEMY_DATABASE_URI": uri})
    with patch.object(scheduler, "start"), patch.object(socketio, "init_app"):
        app = create_app(config)
    yield app
    with app.app_context():
        db.session.remove()
        db.engine.dispose()  # release the file (and its -wal/-shm) so the folder can be deleted


def _pragma(name):
    return db.session.execute(sa.text(f"PRAGMA {name}")).scalar()


def test_a_file_database_runs_in_wal_mode(file_app):
    with file_app.app_context():
        assert _pragma("journal_mode") == "wal"


def test_a_file_database_has_the_short_busy_timeout_and_normal_sync(file_app):
    with file_app.app_context():
        assert _pragma("busy_timeout") == 2000
        assert _pragma("synchronous") == 1  # NORMAL


def test_wal_is_stored_in_the_database_file(file_app, tmp_path):
    with file_app.app_context():
        db.session.execute(sa.text("SELECT 1"))
        db.session.remove()
        db.engine.dispose()

    # A plain sqlite3 connection, which our listener never touched, still finds WAL
    plain = sqlite3.connect(tmp_path / "runtime.db")
    try:
        assert plain.execute("PRAGMA journal_mode").fetchone()[0] == "wal"
    finally:
        plain.close()


def test_every_new_connection_gets_the_settings(file_app):
    with file_app.app_context():
        db.session.remove()
        db.engine.dispose()  # the next connection is a new one
        with db.engine.connect() as connection:
            assert connection.execute(sa.text("PRAGMA journal_mode")).scalar() == "wal"
            assert connection.execute(sa.text("PRAGMA busy_timeout")).scalar() == 2000


def test_the_in_memory_test_database_answers_memory(app):
    # A database with no file has no write-ahead log; the pragma is accepted anyway
    with app.app_context():
        assert _pragma("journal_mode") == "memory"
        assert _pragma("busy_timeout") == 2000


def test_the_listener_is_registered_for_all_engines():
    assert event.contains(Engine, "connect", apply_sqlite_pragmas)


def test_the_pragma_list_leaves_foreign_keys_alone():
    # foreign_keys=ON is tracked in #61: it can change what the tests may write
    assert "foreign_keys" not in {name for name, _ in SQLITE_PRAGMAS}


def test_the_listener_ignores_other_databases():
    other_database = MagicMock()

    apply_sqlite_pragmas(other_database, None)

    other_database.cursor.assert_not_called()


def test_a_pragma_that_fails_does_not_stop_the_connection(caplog):
    class RefusesWal(sqlite3.Cursor):
        def execute(self, sql, *args):
            if "journal_mode" in sql:
                raise sqlite3.OperationalError("database is locked")
            return super().execute(sql, *args)

    class Connection(sqlite3.Connection):
        def cursor(self, factory=RefusesWal):
            return super().cursor(factory)

    connection = sqlite3.connect(":memory:", factory=Connection)
    try:
        with caplog.at_level("WARNING", logger="application.extensions"):
            apply_sqlite_pragmas(connection, None)

        assert "Could not set PRAGMA journal_mode=WAL" in caplog.text
        # The settings after the failed one were still applied
        assert connection.execute("PRAGMA synchronous").fetchone()[0] == 1
        assert connection.execute("PRAGMA busy_timeout").fetchone()[0] == 2000
    finally:
        connection.close()
