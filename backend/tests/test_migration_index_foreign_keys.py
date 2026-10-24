"""
File: test_migration_index_foreign_keys.py
Type: py
Summary: The dcfead18fb96 migration adds the missing indexes on foreign keys and
         session times, and nothing else.
"""

import importlib.util
import pathlib

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

# The indexed tables as a long-lived database has them, cut down to the columns
# that matter here. Each already has the indexes and constraints it had before.
SCHEMA = """
CREATE TABLE "projects" (
    id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    user_id INTEGER NOT NULL,
    template_id INTEGER,
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE INDEX ix_projects_template_id ON projects (template_id);
CREATE TABLE "skills" (
    id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_skill_name_user UNIQUE (name, user_id),
    FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE TABLE "notes" (
    id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    filename VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE TABLE "course_instances" (
    id VARCHAR(64) NOT NULL,
    classroom_id VARCHAR(64) NOT NULL,
    course_id VARCHAR(64),
    PRIMARY KEY (id),
    FOREIGN KEY(classroom_id) REFERENCES classrooms (id),
    FOREIGN KEY(course_id) REFERENCES courses (id)
);
CREATE TABLE "challenges" (
    id INTEGER NOT NULL,
    slug VARCHAR(255) NOT NULL,
    classroom_id VARCHAR(64),
    PRIMARY KEY (id),
    CONSTRAINT uq_challenges_slug UNIQUE (slug),
    CONSTRAINT fk_challenges_classroom_id_classrooms FOREIGN KEY(classroom_id) REFERENCES classrooms (id) ON DELETE SET NULL
);
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
"""

ROWS = """
INSERT INTO projects (id, name, user_id) VALUES (1, 'p', 1), (2, 'q', 2);
INSERT INTO skills (id, name, user_id) VALUES (1, 's', 1);
INSERT INTO notes (id, user_id, filename) VALUES (1, 1, 'n.png');
INSERT INTO course_instances (id, classroom_id, course_id) VALUES ('i1', 'c1', NULL);
INSERT INTO challenges (id, slug, classroom_id) VALUES (1, 'a', NULL), (2, 'b', 'c1');
INSERT INTO session_logs (id, user_id, start_time, end_time, last_seen) VALUES
    (1, 1, '2026-01-01 08:00:00', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
    (2, 1, '2026-01-02 08:00:00', NULL, '2026-01-02 08:30:00');
"""

TABLES = (
    "challenges",
    "course_instances",
    "notes",
    "projects",
    "session_logs",
    "skills",
)

BEFORE = {
    "challenges": {},
    "course_instances": {},
    "notes": {},
    "projects": {"ix_projects_template_id": ["template_id"]},
    "session_logs": {"ix_session_logs_user_id": ["user_id"]},
    "skills": {},
}

AFTER = {
    "challenges": {"ix_challenges_classroom_id": ["classroom_id"]},
    "course_instances": {
        "ix_course_instances_classroom_id": ["classroom_id"],
        "ix_course_instances_course_id": ["course_id"],
    },
    "notes": {"ix_notes_user_id": ["user_id"]},
    "projects": {
        "ix_projects_template_id": ["template_id"],
        "ix_projects_user_id": ["user_id"],
    },
    "session_logs": {
        "ix_session_logs_end_time": ["end_time"],
        "ix_session_logs_last_seen": ["last_seen"],
        "ix_session_logs_user_id": ["user_id"],
    },
    "skills": {"ix_skills_user_id": ["user_id"]},
}


@pytest.fixture
def migration():
    path = next(
        pathlib.Path(__file__).resolve().parents[1].glob(
            "migrations/versions/dcfead18fb96_*.py"
        )
    )
    spec = importlib.util.spec_from_file_location("mig_dcfead18fb96", path)
    mig = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig)
    return mig


@pytest.fixture
def conn():
    engine = sa.create_engine("sqlite://")
    with engine.begin() as connection:
        yield connection
    engine.dispose()


def _build(conn, script=SCHEMA + ROWS):
    conn.connection.driver_connection.executescript(script)


def _run(conn, step):
    """Run a migration's upgrade or downgrade the way Alembic does, with `op` bound."""
    with Operations.context(MigrationContext.configure(conn)):
        step()


def _indexes(conn):
    """Every plain index per table. sa.inspect() is asked each time: it caches."""
    inspector = sa.inspect(conn)
    return {
        table: {
            ix["name"]: ix["column_names"]
            for ix in inspector.get_indexes(table)
            if not ix["unique"]
        }
        for table in inspector.get_table_names()
    }


def _tables_sql(conn):
    return sorted(
        tuple(r)
        for r in conn.execute(
            sa.text("SELECT name, sql FROM sqlite_master WHERE type = 'table'")
        )
    )


def _all_rows(conn):
    return {
        table: sorted(tuple(r) for r in conn.execute(sa.text(f"SELECT * FROM {table}")))
        for table in TABLES
    }


def test_upgrade_adds_each_missing_index(migration, conn):
    _build(conn)
    assert _indexes(conn) == BEFORE
    tables, rows = _tables_sql(conn), _all_rows(conn)

    _run(conn, migration.upgrade)

    assert _indexes(conn) == AFTER
    # Only indexes were created: no table was rebuilt and no row was touched
    assert _tables_sql(conn) == tables
    assert _all_rows(conn) == rows


def test_the_new_indexes_are_used_by_the_lookups_they_are_for(migration, conn):
    _build(conn)
    _run(conn, migration.upgrade)

    def plan(sql):
        return " ".join(
            row[3] for row in conn.execute(sa.text(f"EXPLAIN QUERY PLAN {sql}"))
        )

    assert "ix_projects_user_id" in plan("SELECT * FROM projects WHERE user_id = 1")
    assert "ix_skills_user_id" in plan("SELECT * FROM skills WHERE user_id = 1")
    assert "ix_notes_user_id" in plan("SELECT * FROM notes WHERE user_id = 1")
    assert "ix_course_instances_classroom_id" in plan(
        "SELECT * FROM course_instances WHERE classroom_id = 'c1'"
    )
    assert "ix_course_instances_course_id" in plan(
        "SELECT * FROM course_instances WHERE course_id = 'x'"
    )
    assert "ix_challenges_classroom_id" in plan(
        "SELECT * FROM challenges WHERE classroom_id = 'c1'"
    )
    stale = plan(
        "SELECT * FROM session_logs WHERE end_time IS NULL AND last_seen < '2026-01-03'"
    )
    assert "ix_session_logs_end_time" in stale or "ix_session_logs_last_seen" in stale


def test_upgrade_is_a_no_op_the_second_time(migration, conn):
    _build(conn)
    _run(conn, migration.upgrade)

    _run(conn, migration.upgrade)

    assert _indexes(conn) == AFTER


def test_upgrade_keeps_an_index_that_is_already_there(migration, conn):
    _build(conn)
    conn.execute(sa.text("CREATE INDEX ix_notes_user_id ON notes (user_id)"))
    conn.execute(
        sa.text("CREATE INDEX ix_session_logs_end_time ON session_logs (end_time)")
    )

    _run(conn, migration.upgrade)

    assert _indexes(conn) == AFTER


def test_upgrade_skips_a_table_or_column_that_is_missing(migration, conn):
    _build(
        conn,
        "CREATE TABLE notes (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL);"
        "CREATE TABLE session_logs (id INTEGER PRIMARY KEY, end_time DATETIME);",
    )

    _run(conn, migration.upgrade)

    assert _indexes(conn) == {
        "notes": {"ix_notes_user_id": ["user_id"]},
        "session_logs": {"ix_session_logs_end_time": ["end_time"]},
    }


def test_downgrade_drops_only_the_indexes_the_upgrade_added(migration, conn):
    _build(conn)
    _run(conn, migration.upgrade)
    rows = _all_rows(conn)

    _run(conn, migration.downgrade)

    assert _indexes(conn) == BEFORE
    assert _all_rows(conn) == rows

    # A second run finds nothing left to drop
    _run(conn, migration.downgrade)
    assert _indexes(conn) == BEFORE
