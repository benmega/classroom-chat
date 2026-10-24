"""
File: test_migration_student_tests.py
Type: py
Summary: The 4c9a7e2b51d3 migration adds the student tests tables, can run twice and
         downgrades cleanly.
"""

import importlib.util
import pathlib

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

SCHEMA = "CREATE TABLE users (id INTEGER NOT NULL, username VARCHAR(50) NOT NULL, PRIMARY KEY (id));"
TABLES = {"quizzes", "quiz_questions", "quiz_attempts", "quiz_rewards"}


@pytest.fixture
def migration():
    path = next(
        pathlib.Path(__file__).resolve().parents[1].glob("migrations/versions/4c9a7e2b51d3_*.py")
    )
    spec = importlib.util.spec_from_file_location("mig_4c9a7e2b51d3", path)
    mig = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig)
    return mig


@pytest.fixture
def conn():
    engine = sa.create_engine("sqlite://")
    with engine.begin() as connection:
        connection.connection.driver_connection.executescript(SCHEMA)
        yield connection
    engine.dispose()


def _run(conn, step):
    with Operations.context(MigrationContext.configure(conn)):
        step()


def _tables(conn):
    return set(sa.inspect(conn).get_table_names()) - {"users"}


def test_it_follows_the_previous_head(migration):
    assert migration.down_revision == "183122a091ad"


def test_upgrade_creates_the_tables_with_their_keys(migration, conn):
    _run(conn, migration.upgrade)

    inspector = sa.inspect(conn)
    assert _tables(conn) == TABLES
    attempts = {c["name"]: c for c in inspector.get_columns("quiz_attempts")}
    assert not attempts["ducks_awarded"]["nullable"]
    assert attempts["submitted_at"]["nullable"]
    # Fixed per attempt: the deadline at start, the graded snapshot at submit
    assert attempts["deadline"]["nullable"]
    assert isinstance(attempts["deadline"]["type"], sa.DateTime)
    assert attempts["graded"]["nullable"]
    assert isinstance(attempts["graded"]["type"], sa.JSON)
    referred = {
        (fk["constrained_columns"][0], fk["referred_table"], fk["options"]["ondelete"])
        for table in ("quiz_attempts", "quiz_rewards")
        for fk in inspector.get_foreign_keys(table)
    }
    assert referred == {
        ("quiz_id", "quizzes", "CASCADE"),
        ("user_id", "users", "CASCADE"),
    }
    names = {i["name"] for i in inspector.get_indexes("quiz_attempts")}
    assert "uq_quiz_attempts_one_open_per_user_quiz" in names


def test_one_attempt_in_progress_per_user_and_quiz(migration, conn):
    _run(conn, migration.upgrade)
    conn.execute(sa.text("INSERT INTO users VALUES (1, 'one')"))
    conn.execute(sa.text("INSERT INTO quizzes VALUES (1, 's', 't', NULL, NULL, 0, 1, 1, 1, NULL, NULL, NULL)"))
    insert = (
        "INSERT INTO quiz_attempts (quiz_id, user_id, answers, flagged, started_at, submitted_at,"
        " elapsed_seconds, ducks_awarded) VALUES (1, 1, '{}', '[]', '2026-01-01', SUBMITTED, 0, 0)"
    )
    conn.execute(sa.text(insert.replace('SUBMITTED', "'2026-01-02'")))
    conn.execute(sa.text(insert.replace('SUBMITTED', "'2026-01-02'")))
    conn.execute(sa.text(insert.replace('SUBMITTED', "NULL")))
    with pytest.raises(sa.exc.IntegrityError):
        conn.execute(sa.text(insert.replace('SUBMITTED', "NULL")))


def test_upgrade_is_a_no_op_the_second_time(migration, conn):
    _run(conn, migration.upgrade)
    before = dict(conn.execute(sa.text("SELECT name, sql FROM sqlite_master")).all())

    _run(conn, migration.upgrade)

    assert dict(conn.execute(sa.text("SELECT name, sql FROM sqlite_master")).all()) == before


def test_downgrade_drops_the_tables_and_only_those(migration, conn):
    _run(conn, migration.upgrade)

    _run(conn, migration.downgrade)

    assert _tables(conn) == set()
    assert "users" in sa.inspect(conn).get_table_names()
    _run(conn, migration.downgrade)
