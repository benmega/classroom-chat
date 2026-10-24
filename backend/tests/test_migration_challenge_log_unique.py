"""
File: test_migration_challenge_log_unique.py
Type: py
Summary: The 1dbcb322d37d migration leaves one challenge log per user, challenge and
         course instance, and makes the database refuse a second one.
"""

import importlib.util
import pathlib

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

# challenge_logs as a long-lived database has it
SCHEMA = """
CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(50) NOT NULL);
CREATE TABLE "challenge_logs" (
    id INTEGER NOT NULL,
    domain VARCHAR(100) NOT NULL,
    challenge_slug VARCHAR(255) NOT NULL,
    course_id VARCHAR(100),
    course_instance VARCHAR(100),
    timestamp DATETIME NOT NULL,
    helper VARCHAR(100) DEFAULT (NULL),
    user_id INTEGER NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_challenge_logs_user_id_users FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE INDEX ix_challenge_log_user_slug_instance ON challenge_logs (user_id, challenge_slug, course_instance);
CREATE INDEX ix_challenge_logs_timestamp ON challenge_logs (timestamp);
CREATE INDEX ix_challenge_logs_user_id ON challenge_logs (user_id);
"""

# (id, slug, instance, timestamp, helper, user_id)
KEPT = [
    (1, "a", "i1", "2026-01-01 10:00:00", None, 1),
    (3, "a", "i2", "2026-01-03 10:00:00", None, 1),  # another instance
    (4, "a", None, "2026-01-04 10:00:00", None, 1),  # no instance
    (6, "a", "i1", "2026-01-06 10:00:00", None, 2),  # another user
    (7, "a", None, "2026-01-07 10:00:00", None, 2),
    (8, "b", "i1", "2026-01-08 10:00:00", "helper", 1),  # another challenge
    (9, "A", "i1", "2026-01-09 10:00:00", None, 1),  # slugs are case-sensitive
    (11, "a", "", "2026-01-11 10:00:00", None, 1),  # '' is a value, not a missing one
]
COPIES = [
    (2, "a", "i1", "2026-01-02 10:00:00", None, 1),
    (5, "a", None, "2026-01-05 10:00:00", None, 1),
    (10, "a", "i1", "2026-01-10 10:00:00", "helper", 1),  # a third copy of row 1
    (12, "a", None, "2026-01-01 09:00:00", None, 2),  # older timestamp, higher id
]

INSERT = (
    "INSERT INTO challenge_logs "
    "(id, domain, challenge_slug, course_instance, timestamp, helper, user_id) "
    "VALUES (:id, 'codecombat.com', :slug, :instance, :timestamp, :helper, :user_id)"
)
EVERYTHING = "SELECT id, challenge_slug, course_instance, timestamp, helper, user_id FROM challenge_logs"

UNIQUE_SQL = {
    "uq_challenge_logs_user_slug_instance": (
        "CREATE UNIQUE INDEX uq_challenge_logs_user_slug_instance "
        "ON challenge_logs (user_id, challenge_slug, course_instance)"
    ),
    "uq_challenge_logs_user_slug_no_instance": (
        "CREATE UNIQUE INDEX uq_challenge_logs_user_slug_no_instance "
        "ON challenge_logs (user_id, challenge_slug) WHERE course_instance IS NULL"
    ),
}


@pytest.fixture
def migration():
    path = next(
        pathlib.Path(__file__).resolve().parents[1].glob(
            "migrations/versions/1dbcb322d37d_*.py"
        )
    )
    spec = importlib.util.spec_from_file_location("mig_1dbcb322d37d", path)
    mig = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig)
    return mig


@pytest.fixture
def conn():
    engine = sa.create_engine("sqlite://")
    with engine.begin() as connection:
        yield connection
    engine.dispose()


def _build(conn, rows=KEPT + COPIES, schema=SCHEMA):
    conn.connection.driver_connection.executescript(schema)
    conn.execute(sa.text("INSERT INTO users VALUES (1, 'one'), (2, 'two')"))
    _insert(conn, *rows)


def _insert(conn, *rows):
    keys = ("id", "slug", "instance", "timestamp", "helper", "user_id")
    for row in rows:
        conn.execute(sa.text(INSERT), dict(zip(keys, row, strict=True)))


def _run(conn, step):
    """Run a migration's upgrade or downgrade the way Alembic does, with `op` bound."""
    with Operations.context(MigrationContext.configure(conn)):
        step()


def _rows(conn, sql=EVERYTHING):
    return sorted(tuple(r) for r in conn.execute(sa.text(sql)))


def _index_sql(conn):
    return {
        name: sql
        for name, sql in conn.execute(
            sa.text(
                "SELECT name, sql FROM sqlite_master "
                "WHERE type = 'index' AND tbl_name = 'challenge_logs'"
            )
        )
    }


def _table_sql(conn):
    return conn.execute(
        sa.text("SELECT sql FROM sqlite_master WHERE name = 'challenge_logs'")
    ).scalar()


def _refused(conn, row):
    try:
        with conn.begin_nested():
            _insert(conn, row)
    except sa.exc.IntegrityError:
        return True
    return False


def test_upgrade_keeps_the_first_log_of_each_user_challenge_and_instance(
    migration, conn
):
    _build(conn)
    table = _table_sql(conn)

    _run(conn, migration.upgrade)

    # The survivors are the rows with the lowest id, exactly as they were written
    assert _rows(conn) == sorted(KEPT)
    # The table itself was not rebuilt
    assert _table_sql(conn) == table
    assert _rows(conn, "SELECT id FROM users") == [(1,), (2,)]


def test_upgrade_replaces_the_lookup_index_with_the_two_unique_ones(migration, conn):
    _build(conn)
    other = {
        name: sql
        for name, sql in _index_sql(conn).items()
        if name != "ix_challenge_log_user_slug_instance"
    }
    assert set(other) == {"ix_challenge_logs_timestamp", "ix_challenge_logs_user_id"}

    _run(conn, migration.upgrade)

    assert _index_sql(conn) == {**other, **UNIQUE_SQL}


def test_after_the_upgrade_a_second_log_is_refused(migration, conn):
    _build(conn)
    assert not _refused(conn, (20, "a", "i1", "2026-02-01 10:00:00", None, 1))
    conn.execute(sa.text("DELETE FROM challenge_logs WHERE id = 20"))

    _run(conn, migration.upgrade)

    assert _refused(conn, (20, "a", "i1", "2026-02-01 10:00:00", None, 1))
    assert _refused(conn, (21, "a", None, "2026-02-01 10:00:00", None, 1))
    assert _refused(conn, (22, "a", "", "2026-02-01 10:00:00", "helper", 1))
    # Another instance, another challenge or another user is a different log
    assert not _refused(conn, (23, "a", "i3", "2026-02-01 10:00:00", None, 1))
    assert not _refused(conn, (24, "c", "i1", "2026-02-01 10:00:00", None, 1))
    assert not _refused(conn, (25, "c", None, "2026-02-01 10:00:00", None, 1))
    assert not _refused(conn, (26, "c", None, "2026-02-01 10:00:00", None, 2))


def test_upgrade_deletes_nothing_when_no_log_is_repeated(migration, conn):
    _build(conn, rows=KEPT)

    assert migration.delete_duplicate_logs(conn) == 0
    _run(conn, migration.upgrade)

    assert _rows(conn) == sorted(KEPT)
    assert UNIQUE_SQL.items() <= _index_sql(conn).items()


def test_delete_duplicate_logs_reports_how_many_rows_it_removed(migration, conn):
    _build(conn)

    assert migration.delete_duplicate_logs(conn) == len(COPIES)
    assert migration.delete_duplicate_logs(conn) == 0


def test_upgrade_is_a_no_op_the_second_time(migration, conn):
    _build(conn)
    _run(conn, migration.upgrade)
    indexes, rows = _index_sql(conn), _rows(conn)

    _run(conn, migration.upgrade)

    assert _index_sql(conn) == indexes
    assert _rows(conn) == rows


def test_upgrade_finishes_a_run_that_stopped_half_way(migration, conn):
    _build(conn, rows=KEPT)
    conn.execute(sa.text(UNIQUE_SQL["uq_challenge_logs_user_slug_instance"]))
    # A copy that only the partial index would have stopped
    _insert(conn, COPIES[1])

    _run(conn, migration.upgrade)

    assert _rows(conn) == sorted(KEPT)
    assert UNIQUE_SQL.items() <= _index_sql(conn).items()
    assert "ix_challenge_log_user_slug_instance" not in _index_sql(conn)


def test_upgrade_works_without_the_old_lookup_index(migration, conn):
    _build(conn)
    conn.execute(sa.text("DROP INDEX ix_challenge_log_user_slug_instance"))

    _run(conn, migration.upgrade)

    assert _rows(conn) == sorted(KEPT)
    assert UNIQUE_SQL.items() <= _index_sql(conn).items()


@pytest.mark.parametrize(
    "schema",
    [
        "CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(50) NOT NULL);",
        # A table that predates user_id is not this migration's to change
        "CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(50) NOT NULL);"
        "CREATE TABLE challenge_logs (id INTEGER PRIMARY KEY, username VARCHAR(50),"
        " challenge_slug VARCHAR(255), course_instance VARCHAR(100));"
        "INSERT INTO challenge_logs VALUES (1, 'one', 'a', 'i1'), (2, 'one', 'a', 'i1');",
    ],
    ids=["no table", "no user_id column"],
)
def test_upgrade_and_downgrade_leave_an_unexpected_schema_alone(
    migration, conn, schema
):
    conn.connection.driver_connection.executescript(schema)
    before = _rows(conn, "SELECT name, sql FROM sqlite_master")

    _run(conn, migration.upgrade)
    _run(conn, migration.downgrade)

    assert _rows(conn, "SELECT name, sql FROM sqlite_master") == before
    if "challenge_logs" in sa.inspect(conn).get_table_names():
        assert _rows(conn, "SELECT id FROM challenge_logs") == [(1,), (2,)]


def test_downgrade_restores_the_lookup_index_and_keeps_the_rows(migration, conn):
    _build(conn)
    before = _index_sql(conn)
    _run(conn, migration.upgrade)

    _run(conn, migration.downgrade)

    assert _index_sql(conn) == before
    # The copies the upgrade deleted are not brought back
    assert _rows(conn) == sorted(KEPT)
    # ... and nothing stops a new one
    assert not _refused(conn, (20, "a", "i1", "2026-02-01 10:00:00", None, 1))
    assert not _refused(conn, (21, "a", None, "2026-02-01 10:00:00", None, 1))

    # A second run changes nothing
    _run(conn, migration.downgrade)
    assert _index_sql(conn) == before


def test_upgrade_after_a_downgrade_cleans_up_again(migration, conn):
    _build(conn)
    _run(conn, migration.upgrade)
    _run(conn, migration.downgrade)
    _insert(conn, (20, "a", "i1", "2026-02-01 10:00:00", None, 1))

    _run(conn, migration.upgrade)

    assert _rows(conn) == sorted(KEPT)
    assert UNIQUE_SQL.items() <= _index_sql(conn).items()
