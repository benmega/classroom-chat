"""
File: test_migration_configuration_singleton.py
Type: py
Summary: The 1785a35c3f5a migration leaves one configuration row, with id 1, and
         makes the database refuse any other.
"""

import importlib.util
import pathlib

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from application.extensions import convention

# The configuration table as a long-lived database has it
SCHEMA = """
CREATE TABLE "configuration" (
    id INTEGER NOT NULL,
    message_sending_enabled BOOLEAN,
    duck_multiplier FLOAT DEFAULT 1,
    PRIMARY KEY (id)
);
"""

INSERT = (
    "INSERT INTO configuration (id, message_sending_enabled, duck_multiplier) "
    "VALUES (:id, :enabled, :multiplier)"
)
EVERYTHING = "SELECT id, message_sending_enabled, duck_multiplier FROM configuration"
CHECK = "CONSTRAINT ck_configuration_singleton CHECK (id = 1)"


@pytest.fixture
def migration():
    path = next(
        pathlib.Path(__file__).resolve().parents[1].glob(
            "migrations/versions/1785a35c3f5a_*.py"
        )
    )
    spec = importlib.util.spec_from_file_location("mig_1785a35c3f5a", path)
    mig = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig)
    return mig


@pytest.fixture
def conn():
    engine = sa.create_engine("sqlite://")
    with engine.begin() as connection:
        yield connection
    engine.dispose()


def _build(conn, *rows):
    conn.connection.driver_connection.executescript(SCHEMA)
    for row in rows:
        _insert(conn, row)


def _insert(conn, row):
    keys = ("id", "enabled", "multiplier")
    conn.execute(sa.text(INSERT), dict(zip(keys, row, strict=True)))


def _run(conn, step, target_metadata=None):
    """Run a migration's upgrade or downgrade the way Alembic does, with `op` bound."""
    opts = {"target_metadata": target_metadata} if target_metadata is not None else {}
    with Operations.context(MigrationContext.configure(conn, opts=opts)):
        step()


def _rows(conn, sql=EVERYTHING):
    return sorted(tuple(r) for r in conn.execute(sa.text(sql)))


def _table_sql(conn):
    return conn.execute(
        sa.text("SELECT sql FROM sqlite_master WHERE name = 'configuration'")
    ).scalar()


def _refused(conn, sql, **params):
    try:
        with conn.begin_nested():
            conn.execute(sa.text(sql), params)
    except sa.exc.IntegrityError:
        return True
    return False


@pytest.mark.parametrize(
    "rows, kept",
    [
        ([(1, 0, 2.5)], (1, 0, 2.5)),
        ([(1, 1, 1.0), (2, 0, 3.0)], (1, 1, 1.0)),
        # The oldest row is the one the app has been reading: it becomes row 1
        ([(3, 0, 2.0), (5, 1, 1.0), (9, 1, 4.0)], (1, 0, 2.0)),
        ([(7, 1, 0.5)], (1, 1, 0.5)),
        ([(0, 1, 1.5), (1, 0, 9.0)], (1, 1, 1.5)),
    ],
    ids=["one row", "two rows", "three rows, none with id 1", "one row, id 7", "id 0"],
)
def test_upgrade_keeps_the_oldest_row_as_row_one(migration, conn, rows, kept):
    _build(conn, *rows)

    assert migration.keep_the_oldest_row(conn) == len(rows) - 1
    _run(conn, migration.upgrade)

    assert _rows(conn) == [kept]


def test_upgrade_leaves_an_empty_table_empty(migration, conn):
    _build(conn)

    assert migration.keep_the_oldest_row(conn) == 0
    _run(conn, migration.upgrade)

    assert _rows(conn) == []
    assert CHECK in _table_sql(conn)


@pytest.mark.parametrize(
    "target_metadata",
    [None, sa.MetaData(naming_convention=convention)],
    ids=["no naming convention", "the app's naming convention"],
)
def test_upgrade_adds_the_check_and_keeps_the_rest_of_the_table(
    migration, conn, target_metadata
):
    _build(conn, (1, 1, 2.0))

    _run(conn, migration.upgrade, target_metadata)

    # The name is the same whether or not Alembic knows the naming convention
    inspector = sa.inspect(conn)
    assert inspector.get_check_constraints("configuration") == [
        {"name": "ck_configuration_singleton", "sqltext": "id = 1"}
    ]
    assert inspector.get_pk_constraint("configuration")["constrained_columns"] == ["id"]
    columns = {c["name"]: c for c in inspector.get_columns("configuration")}
    assert list(columns) == ["id", "message_sending_enabled", "duck_multiplier"]
    assert columns["id"]["nullable"] is False
    assert columns["message_sending_enabled"]["nullable"] is True
    assert columns["duck_multiplier"]["default"] == "1"
    assert isinstance(columns["duck_multiplier"]["type"], sa.Float)
    assert inspector.get_table_names() == ["configuration"]
    assert _rows(conn) == [(1, 1, 2.0)]


def test_after_the_upgrade_a_second_row_is_refused(migration, conn):
    _build(conn, (1, 1, 1.0))
    assert not _refused(conn, INSERT, id=2, enabled=1, multiplier=1.0)
    conn.execute(sa.text("DELETE FROM configuration WHERE id = 2"))

    _run(conn, migration.upgrade)

    assert _refused(conn, INSERT, id=2, enabled=1, multiplier=1.0)
    assert _refused(conn, INSERT, id=1, enabled=1, multiplier=1.0)
    assert _refused(conn, INSERT, id=None, enabled=1, multiplier=1.0)
    assert _refused(conn, "UPDATE configuration SET id = 2")
    assert _rows(conn) == [(1, 1, 1.0)]

    # The one row can still be changed, and replaced once it is gone
    conn.execute(sa.text("UPDATE configuration SET duck_multiplier = 3.0"))
    conn.execute(sa.text("DELETE FROM configuration"))
    assert not _refused(conn, INSERT, id=None, enabled=0, multiplier=2.0)
    assert _rows(conn) == [(1, 0, 2.0)]


def test_upgrade_is_a_no_op_the_second_time(migration, conn):
    _build(conn, (1, 1, 2.0))
    _run(conn, migration.upgrade)
    table = _table_sql(conn)

    _run(conn, migration.upgrade)

    assert _table_sql(conn) == table
    assert table.count("CHECK") == 1
    assert _rows(conn) == [(1, 1, 2.0)]


def test_upgrade_clears_a_copy_left_by_an_interrupted_rebuild(migration, conn):
    _build(conn, (1, 1, 2.0), (2, 0, 5.0))
    conn.execute(
        sa.text("CREATE TABLE _alembic_tmp_configuration (id INTEGER PRIMARY KEY)")
    )

    _run(conn, migration.upgrade)

    assert sa.inspect(conn).get_table_names() == ["configuration"]
    assert CHECK in _table_sql(conn)
    assert _rows(conn) == [(1, 1, 2.0)]


def test_upgrade_and_downgrade_do_nothing_without_the_table(migration, conn):
    conn.execute(
        sa.text("CREATE TABLE _alembic_tmp_configuration (id INTEGER PRIMARY KEY)")
    )

    _run(conn, migration.upgrade)
    _run(conn, migration.downgrade)

    # With the real table missing, the copy may be all that is left of it
    assert sa.inspect(conn).get_table_names() == ["_alembic_tmp_configuration"]


@pytest.mark.parametrize(
    "target_metadata",
    [None, sa.MetaData(naming_convention=convention)],
    ids=["no naming convention", "the app's naming convention"],
)
def test_downgrade_drops_the_check_and_keeps_the_row(migration, conn, target_metadata):
    _build(conn, (4, 0, 2.0), (6, 1, 1.0))
    _run(conn, migration.upgrade, target_metadata)

    _run(conn, migration.downgrade, target_metadata)

    assert sa.inspect(conn).get_check_constraints("configuration") == []
    assert "CHECK" not in _table_sql(conn)
    # The row the upgrade deleted is gone, and the kept one stays row 1
    assert _rows(conn) == [(1, 0, 2.0)]
    assert not _refused(conn, INSERT, id=2, enabled=1, multiplier=1.0)

    # A second run finds nothing left to drop
    table = _table_sql(conn)
    _run(conn, migration.downgrade, target_metadata)
    assert _table_sql(conn) == table
