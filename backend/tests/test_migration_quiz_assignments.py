"""
File: test_migration_quiz_assignments.py
Type: py
Summary: The 7d3e1f9a2c64 migration adds the quiz assignments table, can run twice and
         downgrades cleanly.
"""

import importlib.util
import pathlib

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

SCHEMA = """
CREATE TABLE users (id INTEGER NOT NULL, username VARCHAR(50) NOT NULL, PRIMARY KEY (id));
CREATE TABLE classrooms (id VARCHAR(64) NOT NULL, PRIMARY KEY (id));
CREATE TABLE quizzes (id INTEGER NOT NULL, slug VARCHAR(100) NOT NULL, PRIMARY KEY (id));
"""
BASE = {"users", "classrooms", "quizzes"}
INSERT = "INSERT INTO quiz_assignments (quiz_id, user_id, classroom_id, created_at) VALUES ({})"


@pytest.fixture
def migration():
    path = next(
        pathlib.Path(__file__).resolve().parents[1].glob("migrations/versions/7d3e1f9a2c64_*.py")
    )
    spec = importlib.util.spec_from_file_location("mig_7d3e1f9a2c64", path)
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
    return set(sa.inspect(conn).get_table_names()) - BASE


def _insert(conn, quiz_id, user_id, classroom_id):
    values = f"{quiz_id}, {user_id}, {classroom_id}, '2026-01-01'"
    conn.execute(sa.text(INSERT.format(values)))


@pytest.fixture
def upgraded(migration, conn):
    _run(conn, migration.upgrade)
    conn.execute(sa.text("INSERT INTO users VALUES (1, 'one'), (2, 'two')"))
    conn.execute(sa.text("INSERT INTO classrooms VALUES ('c1'), ('c2')"))
    conn.execute(sa.text("INSERT INTO quizzes VALUES (1, 'a'), (2, 'b')"))
    return conn


def test_it_follows_the_student_tests_migration(migration):
    assert migration.down_revision == "4c9a7e2b51d3"


def test_upgrade_creates_the_table_with_its_keys(migration, conn):
    _run(conn, migration.upgrade)

    inspector = sa.inspect(conn)
    assert _tables(conn) == {"quiz_assignments"}
    columns = {c["name"]: c for c in inspector.get_columns("quiz_assignments")}
    assert not columns["quiz_id"]["nullable"]
    assert columns["user_id"]["nullable"]
    assert columns["classroom_id"]["nullable"]
    assert not columns["created_at"]["nullable"]
    referred = {
        (fk["constrained_columns"][0], fk["referred_table"], fk["options"]["ondelete"])
        for fk in inspector.get_foreign_keys("quiz_assignments")
    }
    assert referred == {
        ("quiz_id", "quizzes", "CASCADE"),
        ("user_id", "users", "CASCADE"),
        ("classroom_id", "classrooms", "CASCADE"),
    }
    uniques = {u["name"] for u in inspector.get_unique_constraints("quiz_assignments")}
    assert uniques == {
        "uq_quiz_assignments_quiz_id_user_id",
        "uq_quiz_assignments_quiz_id_classroom_id",
    }
    indexes = {i["name"] for i in inspector.get_indexes("quiz_assignments")}
    assert indexes == {
        "ix_quiz_assignments_quiz_id",
        "ix_quiz_assignments_user_id",
        "ix_quiz_assignments_classroom_id",
    }


def test_a_row_names_a_user_or_a_classroom(upgraded):
    _insert(upgraded, 1, 1, "NULL")
    _insert(upgraded, 1, "NULL", "'c1'")

    assert upgraded.execute(sa.text("SELECT COUNT(*) FROM quiz_assignments")).scalar() == 2


@pytest.mark.parametrize("user_id", ["1", "NULL"])
def test_a_row_naming_both_or_neither_is_rejected(upgraded, user_id):
    classroom_id = "'c1'" if user_id == "1" else "NULL"

    with pytest.raises(sa.exc.IntegrityError):
        _insert(upgraded, 1, user_id, classroom_id)


def test_a_quiz_is_assigned_to_a_user_once(upgraded):
    _insert(upgraded, 1, 1, "NULL")
    _insert(upgraded, 2, 1, "NULL")
    _insert(upgraded, 1, 2, "NULL")

    with pytest.raises(sa.exc.IntegrityError):
        _insert(upgraded, 1, 1, "NULL")


def test_a_quiz_is_assigned_to_a_classroom_once(upgraded):
    _insert(upgraded, 1, "NULL", "'c1'")
    _insert(upgraded, 2, "NULL", "'c1'")
    _insert(upgraded, 1, "NULL", "'c2'")

    with pytest.raises(sa.exc.IntegrityError):
        _insert(upgraded, 1, "NULL", "'c1'")


def test_upgrade_is_a_no_op_the_second_time(migration, conn):
    _run(conn, migration.upgrade)
    before = dict(conn.execute(sa.text("SELECT name, sql FROM sqlite_master")).all())

    _run(conn, migration.upgrade)

    assert dict(conn.execute(sa.text("SELECT name, sql FROM sqlite_master")).all()) == before


def test_downgrade_drops_the_table_and_only_that(migration, conn):
    _run(conn, migration.upgrade)

    _run(conn, migration.downgrade)

    assert _tables(conn) == set()
    assert set(sa.inspect(conn).get_table_names()) >= BASE
    _run(conn, migration.downgrade)
