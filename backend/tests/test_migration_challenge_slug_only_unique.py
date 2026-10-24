"""
File: test_migration_challenge_slug_only_unique.py
Type: py
Summary: The 1d9eb679a601 migration leaves the slug as the only unique key of a
         challenge and declares its value as a float, without changing a stored value.
"""

import importlib.util
import pathlib

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

# The challenges table as a long-lived database has it. {name_rule} and {table_rule}
# are where a unique rule on the name can sit.
CHALLENGES = """
CREATE TABLE classrooms (id VARCHAR(64) PRIMARY KEY);
CREATE TABLE "challenges" (
    id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL{name_rule},
    slug VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    course_id VARCHAR(100),
    description TEXT,
    difficulty VARCHAR(50) NOT NULL,
    value INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at DATETIME NOT NULL,
    classroom_id VARCHAR(64),
    sequence INTEGER,
    PRIMARY KEY (id),
    CONSTRAINT uq_challenges_slug UNIQUE (slug),
    CONSTRAINT fk_challenges_classroom_id_classrooms FOREIGN KEY(classroom_id) REFERENCES classrooms (id) ON DELETE SET NULL{table_rule}
);
CREATE INDEX ix_challenges_course_id ON challenges (course_id);
"""

# Every way a unique rule on the name can have been written.
NAME_RULES = {
    "named (name, domain)": {
        "table_rule": ", CONSTRAINT uq_challenges_name_domain UNIQUE (name, domain)"
    },
    "unnamed (name, domain)": {"table_rule": ", UNIQUE (name, domain)"},
    "named (name)": {"table_rule": ", CONSTRAINT uq_challenges_name UNIQUE (name)"},
    "inline (name)": {"name_rule": " UNIQUE"},
    "both": {
        "table_rule": ", CONSTRAINT uq_challenges_name UNIQUE (name), UNIQUE (name, domain)"
    },
    "unique index": {
        "index": "CREATE UNIQUE INDEX ix_challenges_name_domain ON challenges (name, domain);"
    },
}

ROWS = """
INSERT INTO classrooms VALUES ('c1');
INSERT INTO challenges
    (id, name, slug, domain, difficulty, value, is_active, created_at, classroom_id)
VALUES
    (1, 'Whole', 'whole', 'd', 'Easy', 1, 1, '2026-01-01', 'c1'),
    (2, 'Two', 'two', 'd', 'Medium', 2, 1, '2026-01-01', NULL),
    (3, 'Half', 'half', 'd', 'Medium', 1.5, 1, '2026-01-01', NULL),
    (4, 'Tenth', 'tenth', 'd', 'Hard', 0.1, 1, '2026-01-01', NULL),
    (5, 'Three tenths', 'three-tenths', 'd', 'Hard', 0.3, 0, '2026-01-01', NULL);
"""

SAME_NAME = (
    "INSERT INTO challenges (id, name, slug, domain, difficulty, value, is_active, created_at)"
    " VALUES (:id, 'Whole', :slug, 'd', 'Easy', 1, 1, '2026-01-01')"
)


@pytest.fixture
def migration():
    path = next(
        pathlib.Path(__file__).resolve().parents[1].glob(
            "migrations/versions/1d9eb679a601_*.py"
        )
    )
    spec = importlib.util.spec_from_file_location("mig_1d9eb679a601", path)
    mig = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig)
    return mig


@pytest.fixture
def conn():
    engine = sa.create_engine("sqlite://")
    with engine.begin() as connection:
        yield connection
    engine.dispose()


def _build(conn, name_rule="", table_rule="", index="", rows=ROWS):
    script = CHALLENGES.format(name_rule=name_rule, table_rule=table_rule) + index + rows
    conn.connection.driver_connection.executescript(script)


def _run(conn, step):
    """Run a migration's upgrade or downgrade the way Alembic does, with `op` bound."""
    with Operations.context(MigrationContext.configure(conn)):
        step()


def _rows(conn, sql):
    return sorted(tuple(r) for r in conn.execute(sa.text(sql)))


def _table_sql(conn):
    return conn.execute(
        sa.text("SELECT sql FROM sqlite_master WHERE name = 'challenges'")
    ).scalar()


def _unique_rules(conn):
    inspector = sa.inspect(conn)
    rules = inspector.get_unique_constraints("challenges") + [
        ix for ix in inspector.get_indexes("challenges") if ix["unique"]
    ]
    return sorted(tuple(rule["column_names"]) for rule in rules)


@pytest.mark.parametrize("shape", NAME_RULES.values(), ids=NAME_RULES.keys())
def test_only_the_slug_stays_unique(migration, conn, shape):
    _build(conn, **shape)
    with pytest.raises(sa.exc.IntegrityError), conn.begin_nested():
        conn.execute(sa.text(SAME_NAME), {"id": 10, "slug": "whole-again"})

    _run(conn, migration.upgrade)

    assert _unique_rules(conn) == [("slug",)]
    conn.execute(sa.text(SAME_NAME), {"id": 10, "slug": "whole-again"})
    with pytest.raises(sa.exc.IntegrityError), conn.begin_nested():
        conn.execute(sa.text(SAME_NAME), {"id": 11, "slug": "whole"})

    # Everything else about the table is as it was
    inspector = sa.inspect(conn)
    (foreign_key,) = inspector.get_foreign_keys("challenges")
    assert foreign_key["name"] == "fk_challenges_classroom_id_classrooms"
    assert foreign_key["referred_table"] == "classrooms"
    assert foreign_key["options"] == {"ondelete": "SET NULL"}
    assert [ix["name"] for ix in inspector.get_indexes("challenges")] == [
        "ix_challenges_course_id"
    ]
    assert inspector.get_pk_constraint("challenges")["constrained_columns"] == ["id"]
    assert {c["name"]: c["nullable"] for c in inspector.get_columns("challenges")} == {
        "id": False,
        "name": False,
        "slug": False,
        "domain": False,
        "course_id": True,
        "description": True,
        "difficulty": False,
        "value": False,
        "is_active": False,
        "created_at": False,
        "classroom_id": True,
        "sequence": True,
    }


def test_value_becomes_a_float_and_no_stored_value_changes(migration, conn):
    _build(conn, **NAME_RULES["named (name, domain)"])
    everything = "SELECT * FROM challenges"
    before = _rows(conn, everything)
    assert _rows(conn, "SELECT DISTINCT typeof(value) FROM challenges") == [
        ("integer",),
        ("real",),
    ]

    _run(conn, migration.upgrade)

    assert _rows(conn, everything) == before
    assert _rows(conn, "SELECT id, value FROM challenges") == [
        (1, 1.0),
        (2, 2.0),
        (3, 1.5),
        (4, 0.1),
        (5, 0.3),
    ]
    assert _rows(conn, "SELECT DISTINCT typeof(value) FROM challenges") == [("real",)]
    value = next(
        c for c in sa.inspect(conn).get_columns("challenges") if c["name"] == "value"
    )
    assert isinstance(value["type"], sa.Float)


def test_upgrade_leaves_an_up_to_date_table_alone(migration, conn):
    _build(conn, **NAME_RULES["named (name, domain)"])
    _run(conn, migration.upgrade)
    migrated = _table_sql(conn)
    assert "FLOAT" in migrated and "name_domain" not in migrated
    rows = _rows(conn, "SELECT * FROM challenges")

    _run(conn, migration.upgrade)

    assert _table_sql(conn) == migrated
    assert _rows(conn, "SELECT * FROM challenges") == rows


def test_upgrade_clears_a_copy_left_by_an_interrupted_rebuild(migration, conn):
    _build(conn, **NAME_RULES["named (name, domain)"])
    conn.execute(sa.text("CREATE TABLE _alembic_tmp_challenges (id INTEGER PRIMARY KEY)"))

    _run(conn, migration.upgrade)

    assert sa.inspect(conn).get_table_names() == ["challenges", "classrooms"]
    assert _unique_rules(conn) == [("slug",)]
    assert len(_rows(conn, "SELECT id FROM challenges")) == 5


def test_upgrade_does_nothing_without_a_challenges_table(migration, conn):
    conn.execute(sa.text("CREATE TABLE _alembic_tmp_challenges (id INTEGER PRIMARY KEY)"))

    _run(conn, migration.upgrade)
    _run(conn, migration.downgrade)

    # With the real table missing, the copy may be all that is left of it
    assert sa.inspect(conn).get_table_names() == ["_alembic_tmp_challenges"]


def test_downgrade_restores_the_name_rule_and_keeps_fractions(migration, conn):
    _build(conn, **NAME_RULES["named (name, domain)"])
    _run(conn, migration.upgrade)
    rows = _rows(conn, "SELECT * FROM challenges")

    _run(conn, migration.downgrade)

    assert _unique_rules(conn) == [("name", "domain"), ("slug",)]
    assert "CONSTRAINT uq_challenges_name_domain UNIQUE (name, domain)" in _table_sql(conn)
    assert _rows(conn, "SELECT * FROM challenges") == rows
    assert _rows(conn, "SELECT value FROM challenges WHERE id IN (3, 4)") == [(0.1,), (1.5,)]

    # A second run finds the rule in place and changes nothing
    restored = _table_sql(conn)
    _run(conn, migration.downgrade)
    assert _table_sql(conn) == restored


def test_downgrade_keeps_rows_that_share_a_name(migration, conn, caplog):
    _build(conn, **NAME_RULES["named (name, domain)"])
    _run(conn, migration.upgrade)
    conn.execute(sa.text(SAME_NAME), {"id": 10, "slug": "whole-again"})
    migrated = _table_sql(conn)

    with caplog.at_level("WARNING", logger="alembic.runtime.migration"):
        _run(conn, migration.downgrade)

    assert _table_sql(conn) == migrated
    assert len(_rows(conn, "SELECT id FROM challenges")) == 6
    assert "uq_challenges_name_domain is not restored: 1 (name, domain) pairs" in caplog.text
