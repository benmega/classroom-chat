"""
File: test_migration_one_open_session.py
Type: py
Summary: The 6f71766c6b8f migration leaves each user at most one open session and
         makes the database refuse a second one.
"""

import importlib.util
import pathlib

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

# session_logs as a long-lived database has it
SCHEMA = """
CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(50) NOT NULL);
CREATE TABLE session_logs (
    id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    last_seen DATETIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE INDEX ix_session_logs_user_id ON session_logs (user_id);
CREATE INDEX ix_session_logs_end_time ON session_logs (end_time);
CREATE INDEX ix_session_logs_last_seen ON session_logs (last_seen);
"""

# (id, user_id, start_time, end_time, last_seen)
ROWS = [
    # User 1: an ended session, an older open one and the current one
    (1, 1, "2026-01-01 08:00:00", "2026-01-01 08:20:00", "2026-01-01 08:15:00"),
    (2, 1, "2026-01-02 08:00:00", None, "2026-01-02 08:30:00"),
    (3, 1, "2026-01-03 09:00:00", None, "2026-01-03 09:10:00"),
    # User 2: one open session
    (4, 2, "2026-01-03 10:00:00", None, "2026-01-03 10:05:00"),
    # User 3: nothing open
    (5, 3, "2026-01-01 11:00:00", "2026-01-01 11:30:00", "2026-01-01 11:30:00"),
    # User 4: three open sessions. Two began at the same moment, and the one that
    # began earliest has the highest id.
    (6, 4, "2026-01-04 10:00:00", None, "2026-01-04 10:40:00"),
    (7, 4, "2026-01-04 10:00:00", None, "2026-01-04 10:20:00"),
    (8, 4, "2026-01-04 09:00:00", None, "2026-01-04 09:45:00"),
]

# The older open sessions, with the time each was last seen
CLOSED_BY_THE_UPGRADE = {
    2: "2026-01-02 08:30:00",
    6: "2026-01-04 10:40:00",
    8: "2026-01-04 09:45:00",
}
STILL_OPEN = [(3, 1), (4, 2), (7, 4)]

INSERT = (
    "INSERT INTO session_logs (id, user_id, start_time, end_time, last_seen) "
    "VALUES (:id, :user_id, :start_time, :end_time, :last_seen)"
)
EVERYTHING = "SELECT id, user_id, start_time, end_time, last_seen FROM session_logs"
INDEX_SQL = (
    "CREATE UNIQUE INDEX uq_session_logs_one_open_per_user "
    "ON session_logs (user_id) WHERE end_time IS NULL"
)


@pytest.fixture
def migration():
    path = next(
        pathlib.Path(__file__).resolve().parents[1].glob(
            "migrations/versions/6f71766c6b8f_*.py"
        )
    )
    spec = importlib.util.spec_from_file_location("mig_6f71766c6b8f", path)
    mig = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig)
    return mig


@pytest.fixture
def conn():
    engine = sa.create_engine("sqlite://")
    with engine.begin() as connection:
        yield connection
    engine.dispose()


def _build(conn, rows=ROWS):
    conn.connection.driver_connection.executescript(SCHEMA)
    conn.execute(
        sa.text("INSERT INTO users VALUES (1, 'one'), (2, 'two'), (3, 'three'), (4, 'four')")
    )
    _insert(conn, *rows)


def _insert(conn, *rows):
    keys = ("id", "user_id", "start_time", "end_time", "last_seen")
    for row in rows:
        conn.execute(sa.text(INSERT), dict(zip(keys, row, strict=True)))


def _run(conn, step):
    """Run a migration's upgrade or downgrade the way Alembic does, with `op` bound."""
    with Operations.context(MigrationContext.configure(conn)):
        step()


def _rows(conn, sql=EVERYTHING):
    return sorted(tuple(r) for r in conn.execute(sa.text(sql)))


def _schema(conn):
    return dict(_rows(conn, "SELECT name, sql FROM sqlite_master"))


def _refused(conn, row):
    try:
        with conn.begin_nested():
            _insert(conn, row)
    except sa.exc.IntegrityError:
        return True
    return False


def _expected_after_upgrade():
    return sorted(
        (id_, user_id, start, CLOSED_BY_THE_UPGRADE.get(id_, end), seen)
        for id_, user_id, start, end, seen in ROWS
    )


def test_upgrade_closes_every_open_session_but_the_newest_of_each_user(
    migration, conn
):
    _build(conn)

    _run(conn, migration.upgrade)

    # The older open sessions end when they were last seen; nothing else changes
    assert _rows(conn) == _expected_after_upgrade()
    assert (
        _rows(conn, "SELECT id, user_id FROM session_logs WHERE end_time IS NULL")
        == STILL_OPEN
    )


def test_upgrade_adds_the_partial_unique_index_and_nothing_else(migration, conn):
    _build(conn)
    before = _schema(conn)

    _run(conn, migration.upgrade)

    assert _schema(conn) == {**before, "uq_session_logs_one_open_per_user": INDEX_SQL}


def test_after_the_upgrade_a_second_open_session_is_refused(migration, conn):
    _build(conn)
    assert not _refused(conn, (20, 2, "2026-02-01 10:00:00", None, "2026-02-01 10:00:00"))
    conn.execute(sa.text("DELETE FROM session_logs WHERE id = 20"))

    _run(conn, migration.upgrade)

    assert _refused(conn, (20, 2, "2026-02-01 10:00:00", None, "2026-02-01 10:00:00"))
    # Ended sessions are not limited, and a user without an open one can open one
    assert not _refused(
        conn, (21, 2, "2026-02-01 10:00:00", "2026-02-01 11:00:00", "2026-02-01 11:00:00")
    )
    assert not _refused(conn, (22, 3, "2026-02-01 10:00:00", None, "2026-02-01 10:00:00"))
    # Once the open session has ended, the next one can begin
    conn.execute(
        sa.text("UPDATE session_logs SET end_time = last_seen WHERE id = 4")
    )
    assert not _refused(conn, (23, 2, "2026-02-02 10:00:00", None, "2026-02-02 10:00:00"))


def test_upgrade_closes_nothing_when_no_user_has_two_open_sessions(migration, conn):
    rows = [row for row in ROWS if row[0] not in CLOSED_BY_THE_UPGRADE]
    _build(conn, rows=rows)

    assert migration.close_older_open_sessions(conn) == 0
    _run(conn, migration.upgrade)

    assert _rows(conn) == sorted(rows)
    assert _schema(conn)["uq_session_logs_one_open_per_user"] == INDEX_SQL


def test_close_older_open_sessions_reports_how_many_it_closed(migration, conn):
    _build(conn)

    assert migration.close_older_open_sessions(conn) == len(CLOSED_BY_THE_UPGRADE)
    assert migration.close_older_open_sessions(conn) == 0


def test_upgrade_is_a_no_op_the_second_time(migration, conn):
    _build(conn)
    _run(conn, migration.upgrade)
    schema, rows = _schema(conn), _rows(conn)

    _run(conn, migration.upgrade)

    assert _schema(conn) == schema
    assert _rows(conn) == rows


@pytest.mark.parametrize(
    "schema",
    [
        "CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(50) NOT NULL);",
        "CREATE TABLE session_logs (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL);"
        "INSERT INTO session_logs VALUES (1, 1), (2, 1);",
    ],
    ids=["no table", "no time columns"],
)
def test_upgrade_and_downgrade_leave_an_unexpected_schema_alone(
    migration, conn, schema
):
    conn.connection.driver_connection.executescript(schema)
    before = _schema(conn)

    _run(conn, migration.upgrade)
    _run(conn, migration.downgrade)

    assert _schema(conn) == before


def test_downgrade_drops_the_index_and_reopens_nothing(migration, conn):
    _build(conn)
    before = _schema(conn)
    _run(conn, migration.upgrade)

    _run(conn, migration.downgrade)

    assert _schema(conn) == before
    assert _rows(conn) == _expected_after_upgrade()
    assert not _refused(conn, (20, 2, "2026-02-01 10:00:00", None, "2026-02-01 10:00:00"))

    # A second run finds nothing left to drop
    _run(conn, migration.downgrade)
    assert _schema(conn) == before
