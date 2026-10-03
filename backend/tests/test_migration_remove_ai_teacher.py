"""
File: test_migration_remove_ai_teacher.py
Type: py
Summary: The remove_ai_teacher migration deletes the AI Teacher user and only its rows.
"""

import importlib.util
import pathlib

import pytest
import sqlalchemy as sa

SCHEMA = """
CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(50) NOT NULL);
CREATE TABLE classrooms (id VARCHAR(64) PRIMARY KEY);
CREATE TABLE messages (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, is_global BOOLEAN);
CREATE TABLE message_users (message_id INTEGER, user_id INTEGER, PRIMARY KEY (message_id, user_id));
CREATE TABLE message_classrooms (message_id INTEGER, classroom_id VARCHAR(64), PRIMARY KEY (message_id, classroom_id));
CREATE TABLE session_logs (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL);
CREATE TABLE parent_students (parent_id INTEGER, student_id INTEGER, PRIMARY KEY (parent_id, student_id));
"""

ROWS = """
INSERT INTO users VALUES (0, 'AI Teacher'), (1, 'alice'), (2, 'bob'), (5, 'pat');
INSERT INTO classrooms VALUES ('c1');
INSERT INTO messages VALUES
  (1, 0, 0),  -- written by the AI, posted to a classroom
  (2, 0, 0),  -- written by the AI, sent to alice
  (3, 1, 0),  -- alice to the AI only
  (4, 1, 0),  -- alice to the AI and bob
  (5, 1, 1),  -- alice, global
  (6, 1, 0),  -- alice to the classroom
  (7, 2, 0);  -- bob to alice
INSERT INTO message_classrooms VALUES (1, 'c1'), (6, 'c1');
INSERT INTO message_users VALUES (2, 1), (3, 0), (4, 0), (4, 2), (5, 0), (7, 1);
INSERT INTO session_logs VALUES (1, 0), (2, 1);
INSERT INTO parent_students VALUES (5, 1);
"""


@pytest.fixture
def migration():
    path = next(
        pathlib.Path(__file__).resolve().parents[1].glob(
            "migrations/versions/f3c9a1d07e52_*.py"
        )
    )
    spec = importlib.util.spec_from_file_location("mig_f3c9a1d07e52", path)
    mig = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig)
    return mig


@pytest.fixture
def conn():
    engine = sa.create_engine("sqlite://")
    with engine.begin() as connection:
        raw = connection.connection.driver_connection
        raw.executescript(SCHEMA)
        yield connection
    engine.dispose()


def _rows(conn, sql):
    return sorted(tuple(r) for r in conn.execute(sa.text(sql)))


def test_deletes_ai_teacher_and_only_its_rows(migration, conn):
    conn.connection.driver_connection.executescript(ROWS)

    migration.delete_ai_teacher(conn, sa.inspect(conn))

    assert _rows(conn, "SELECT id FROM users") == [(1,), (2,), (5,)]
    assert _rows(conn, "SELECT id FROM messages") == [(4,), (5,), (6,), (7,)]
    assert _rows(conn, "SELECT * FROM message_users") == [(4, 2), (7, 1)]
    assert _rows(conn, "SELECT * FROM message_classrooms") == [(6, "c1")]
    assert _rows(conn, "SELECT id FROM session_logs") == [(2,)]
    assert _rows(conn, "SELECT * FROM parent_students") == [(5, 1)]


def test_leaves_user_zero_alone_when_it_is_not_the_ai_teacher(migration, conn):
    conn.connection.driver_connection.executescript(
        "INSERT INTO users VALUES (0, 'someone'), (1, 'alice');"
        "INSERT INTO messages VALUES (1, 0, 0);"
        "INSERT INTO session_logs VALUES (1, 0);"
    )

    migration.delete_ai_teacher(conn, sa.inspect(conn))

    assert _rows(conn, "SELECT id FROM users") == [(0,), (1,)]
    assert _rows(conn, "SELECT id FROM messages") == [(1,)]
    assert _rows(conn, "SELECT id FROM session_logs") == [(1,)]
