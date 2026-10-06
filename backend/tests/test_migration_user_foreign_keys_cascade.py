"""
File: test_migration_user_foreign_keys_cascade.py
Type: py
Summary: The 28a685819194 migration gives ON DELETE CASCADE to every foreign key to
         users.id that had no ON DELETE rule, and changes nothing else.
"""

import importlib.util
import pathlib

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from application.extensions import convention

# The tables as a long-lived database has them, cut down to the columns that matter
# here: foreign keys with and without a name, next to the indexes, defaults and
# other constraints a rebuild has to carry over.
SCHEMA = """
CREATE TABLE users (id INTEGER NOT NULL, username VARCHAR(50) NOT NULL, PRIMARY KEY (id));
CREATE TABLE achievement (id INTEGER NOT NULL, PRIMARY KEY (id));
CREATE TABLE classrooms (id VARCHAR(64) NOT NULL, PRIMARY KEY (id));
CREATE TABLE project_templates (id INTEGER NOT NULL, PRIMARY KEY (id));
CREATE TABLE "challenge_logs" (
    id INTEGER NOT NULL,
    challenge_slug VARCHAR(255) NOT NULL,
    course_instance VARCHAR(100),
    helper VARCHAR(100) DEFAULT (NULL),
    user_id INTEGER NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_challenge_logs_user_id_users FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE INDEX ix_challenge_logs_user_id ON challenge_logs (user_id);
CREATE UNIQUE INDEX uq_challenge_logs_user_slug_instance
    ON challenge_logs (user_id, challenge_slug, course_instance);
CREATE UNIQUE INDEX uq_challenge_logs_user_slug_no_instance
    ON challenge_logs (user_id, challenge_slug) WHERE course_instance IS NULL;
CREATE TABLE connection_attempts (
    id INTEGER NOT NULL,
    parent_id INTEGER NOT NULL,
    code_attempted VARCHAR(10) NOT NULL,
    success BOOLEAN,
    CONSTRAINT pk_connection_attempts PRIMARY KEY (id),
    CONSTRAINT fk_connection_attempts_parent_id_users FOREIGN KEY(parent_id) REFERENCES users (id)
);
CREATE INDEX ix_connection_attempts_parent_id ON connection_attempts (parent_id);
CREATE TABLE course_instance_requests (
    id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    CONSTRAINT pk_course_instance_requests PRIMARY KEY (id),
    CONSTRAINT fk_course_instance_requests_student_id_users
        FOREIGN KEY(student_id) REFERENCES users (id)
);
CREATE TABLE "duck_trade_log" (
    id INTEGER NOT NULL,
    digital_ducks INTEGER NOT NULL,
    bit_ducks JSON NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_duck_trade_log_user_id_users FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE INDEX ix_duck_trade_log_user_id ON duck_trade_log (user_id);
CREATE TABLE duck_transactions (
                id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                amount FLOAT NOT NULL,
                PRIMARY KEY (id),
                FOREIGN KEY(user_id) REFERENCES users (id)
            );
CREATE INDEX ix_duck_transactions_user_id ON duck_transactions (user_id);
CREATE TABLE "notes" (
    id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    filename VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT (CURRENT_TIMESTAMP),
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE INDEX ix_notes_user_id ON notes (user_id);
CREATE TABLE parent_students (
    parent_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    CONSTRAINT pk_parent_students PRIMARY KEY (parent_id, student_id),
    CONSTRAINT uq_parent_student UNIQUE (parent_id, student_id),
    CONSTRAINT fk_parent_students_parent_id_users FOREIGN KEY(parent_id) REFERENCES users (id),
    CONSTRAINT fk_parent_students_student_id_users FOREIGN KEY(student_id) REFERENCES users (id)
);
CREATE TABLE "projects" (
    id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    user_id INTEGER NOT NULL,
    packets_awarded DOUBLE DEFAULT '0.0' NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    template_id INTEGER,
    PRIMARY KEY (id),
    CONSTRAINT fk_projects_template_id_project_templates
        FOREIGN KEY(template_id) REFERENCES project_templates (id) ON DELETE SET NULL,
    FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE INDEX ix_projects_template_id ON projects (template_id);
CREATE INDEX ix_projects_user_id ON projects (user_id);
CREATE TABLE session_logs (
    id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE INDEX ix_session_logs_user_id ON session_logs (user_id);
CREATE UNIQUE INDEX uq_session_logs_one_open_per_user
    ON session_logs (user_id) WHERE end_time IS NULL;
CREATE TABLE "skills" (
    id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    user_id INTEGER NOT NULL,
    category VARCHAR(50) DEFAULT 'concept',
    proficiency INTEGER DEFAULT 1,
    PRIMARY KEY (id),
    CONSTRAINT uq_skill_name_user UNIQUE (name, user_id),
    FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE INDEX ix_skills_user_id ON skills (user_id);
CREATE TABLE submissions (
    id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    classroom_id VARCHAR(64),
    stored_path VARCHAR(255) NOT NULL,
    CONSTRAINT pk_submissions PRIMARY KEY (id),
    CONSTRAINT fk_submissions_user_id_users FOREIGN KEY(user_id) REFERENCES users (id),
    CONSTRAINT fk_submissions_classroom_id_classrooms
        FOREIGN KEY(classroom_id) REFERENCES classrooms (id)
);
CREATE INDEX ix_submissions_user_id ON submissions (user_id);
CREATE TABLE "user_achievement" (
    id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    achievement_id INTEGER NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_user_achievement_user_id UNIQUE (user_id, achievement_id),
    FOREIGN KEY(user_id) REFERENCES users (id),
    UNIQUE (user_id, achievement_id),
    FOREIGN KEY(achievement_id) REFERENCES achievement (id)
);
CREATE INDEX ix_user_achievement_user_id ON user_achievement (user_id);
CREATE TABLE "user_certificate" (
    id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    achievement_id INTEGER NOT NULL,
    url VARCHAR(256) NOT NULL,
    is_auto_recommended BOOLEAN DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_user_certificate_user_id UNIQUE (user_id, achievement_id),
    FOREIGN KEY(user_id) REFERENCES users (id),
    FOREIGN KEY(achievement_id) REFERENCES achievement (id)
);
"""

# Users 1 and 2 each have a row in every table. User 3 is a parent of both.
ROWS = """
INSERT INTO users (id, username) VALUES (1, 'one'), (2, 'two'), (3, 'three');
INSERT INTO achievement (id) VALUES (1);
INSERT INTO classrooms (id) VALUES ('c1');
INSERT INTO project_templates (id) VALUES (1);
INSERT INTO challenge_logs (id, challenge_slug, course_instance, user_id) VALUES
    (1, 'a', NULL, 1), (2, 'a', 'i1', 1), (3, 'a', NULL, 2);
INSERT INTO connection_attempts (id, parent_id, code_attempted, success) VALUES
    (1, 1, 'ABC123', 0), (2, 2, 'ABC123', 1);
INSERT INTO course_instance_requests (id, student_id, url) VALUES (1, 1, 'u'), (2, 2, 'u');
INSERT INTO duck_trade_log (id, digital_ducks, bit_ducks, user_id) VALUES
    (1, 3, '[1, 0]', 1), (2, 4, '[]', 2);
INSERT INTO duck_transactions (id, user_id, amount) VALUES (1, 1, 1.5), (2, 2, -2.0);
INSERT INTO notes (id, user_id, filename, created_at) VALUES
    (1, 1, 'n.png', '2026-01-01 08:00:00'), (2, 2, 'm.png', NULL);
INSERT INTO parent_students (parent_id, student_id) VALUES (1, 2), (3, 1), (3, 2);
INSERT INTO projects (id, name, user_id, packets_awarded, status, template_id) VALUES
    (1, 'p', 1, 2.5, 'approved', 1), (2, 'q', 2, 0.0, 'pending', NULL);
INSERT INTO session_logs (id, user_id, start_time, end_time) VALUES
    (1, 1, '2026-01-01 08:00:00', '2026-01-01 09:00:00'),
    (2, 1, '2026-01-02 08:00:00', NULL),
    (3, 2, '2026-01-02 08:00:00', NULL);
INSERT INTO skills (id, name, user_id, category, proficiency) VALUES
    (1, 'python', 1, 'language', 3), (2, 'python', 2, 'language', 1);
INSERT INTO submissions (id, user_id, classroom_id, stored_path) VALUES
    (1, 1, 'c1', 'submissions/a.pdf'), (2, 2, NULL, 'submissions/b.pdf');
INSERT INTO user_achievement (id, user_id, achievement_id) VALUES (1, 1, 1), (2, 2, 1);
INSERT INTO user_certificate (id, user_id, achievement_id, url, is_auto_recommended, status)
    VALUES (1, 1, 1, 'u', 1, 'approved'), (2, 2, 1, 'u', 0, 'pending');
"""

PARENT_TABLES = ("users", "achievement", "classrooms", "project_templates")

# (table, column) of every foreign key the migration is about
USER_COLUMNS = (
    ("challenge_logs", "user_id"),
    ("connection_attempts", "parent_id"),
    ("course_instance_requests", "student_id"),
    ("duck_trade_log", "user_id"),
    ("duck_transactions", "user_id"),
    ("notes", "user_id"),
    ("parent_students", "parent_id"),
    ("parent_students", "student_id"),
    ("projects", "user_id"),
    ("session_logs", "user_id"),
    ("skills", "user_id"),
    ("submissions", "user_id"),
    ("user_achievement", "user_id"),
    ("user_certificate", "user_id"),
)


@pytest.fixture
def migration():
    path = next(
        pathlib.Path(__file__).resolve().parents[1].glob(
            "migrations/versions/28a685819194_*.py"
        )
    )
    spec = importlib.util.spec_from_file_location("mig_28a685819194", path)
    mig = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig)
    return mig


@pytest.fixture
def conn():
    engine = sa.create_engine("sqlite://")
    with engine.connect() as connection:
        yield connection
    engine.dispose()


def _build(conn, schema=SCHEMA, rows=ROWS):
    conn.connection.driver_connection.executescript(schema + rows)


def _run(conn, step, target_metadata=None):
    """Run a migration's upgrade or downgrade the way Alembic does, with `op` bound."""
    opts = {"target_metadata": target_metadata} if target_metadata is not None else {}
    with Operations.context(MigrationContext.configure(conn, opts=opts)):
        step()


def _table_sql(conn):
    """The CREATE statement of every table and index, by name."""
    rows = conn.execute(sa.text("SELECT name, sql FROM sqlite_master WHERE sql IS NOT NULL"))
    return {name: sql for name, sql in rows}


def _user_foreign_keys(conn):
    """{(table, column): [(name, ON DELETE rule)]} for the keys the migration is about."""
    inspector = sa.inspect(conn)
    found = {}
    for table, column in USER_COLUMNS:
        found[(table, column)] = [
            (fk["name"], fk["options"].get("ondelete"))
            for fk in inspector.get_foreign_keys(table)
            if fk["constrained_columns"] == [column] and fk["referred_table"] == "users"
        ]
    return found


def _everything_else(conn):
    """All a rebuild must carry over: the rows, the columns with their types and
    defaults, the primary key, the indexes with their WHERE clause, the unique
    rules and the foreign keys to tables other than users."""
    inspector = sa.inspect(conn)
    found = {}
    for table in inspector.get_table_names():
        primary_key = inspector.get_pk_constraint(table)
        found[table] = {
            "rows": sorted(
                (tuple(row) for row in conn.execute(sa.text(f'SELECT * FROM "{table}"'))),
                key=repr,
            ),
            "columns": [
                (c["name"], str(c["type"]), c["nullable"], c["default"])
                for c in inspector.get_columns(table)
            ],
            "primary key": (primary_key["name"], primary_key["constrained_columns"]),
            "indexes": sorted(
                (
                    ix["name"],
                    tuple(ix["column_names"]),
                    bool(ix["unique"]),
                    str(ix.get("dialect_options", {}).get("sqlite_where", "")),
                )
                for ix in inspector.get_indexes(table)
            ),
            # A set: user_achievement spells the same rule twice, once is enough
            "unique": {
                (uq["name"], tuple(uq["column_names"]))
                for uq in inspector.get_unique_constraints(table)
                if uq["name"]
            },
            "other foreign keys": sorted(
                (
                    tuple(fk["constrained_columns"]),
                    fk["referred_table"],
                    tuple(fk["referred_columns"]),
                    fk["options"].get("ondelete"),
                )
                for fk in inspector.get_foreign_keys(table)
                if fk["referred_table"] != "users"
            ),
        }
    return found


def _rows_of(conn, user_id):
    """{table.column: number of rows that point at the user}, zeros left out."""
    counts = {}
    for table, column in USER_COLUMNS:
        count = conn.execute(
            sa.text(f"SELECT COUNT(*) FROM {table} WHERE {column} = :id"), {"id": user_id}
        ).scalar()
        if count:
            counts[f"{table}.{column}"] = count
    return counts


def _enforce_foreign_keys(conn):
    """Make this connection enforce foreign keys. SQLite ignores the switch inside a
    transaction, so what was done so far is committed first."""
    conn.commit()
    conn.exec_driver_sql("PRAGMA foreign_keys=ON")
    assert conn.exec_driver_sql("PRAGMA foreign_keys").scalar() == 1


def _refused(conn, sql, **params):
    try:
        with conn.begin_nested():
            conn.execute(sa.text(sql), params)
    except sa.exc.IntegrityError:
        return True
    return False


@pytest.mark.parametrize(
    "target_metadata",
    [None, sa.MetaData(naming_convention=convention)],
    ids=["no naming convention", "the app's naming convention"],
)
def test_upgrade_gives_every_foreign_key_to_a_user_the_rule(
    migration, conn, target_metadata
):
    _build(conn)
    assert {rule for fks in _user_foreign_keys(conn).values() for _name, rule in fks} == {
        None
    }

    _run(conn, migration.upgrade, target_metadata)

    # One foreign key per column, under the name the models give it, whether it had
    # that name, another one or none
    assert _user_foreign_keys(conn) == {
        (table, column): [(f"fk_{table}_{column}_users", "CASCADE")]
        for table, column in USER_COLUMNS
    }
    assert sorted(USER_COLUMNS) == sorted(
        (table, column)
        for table, columns in migration.USER_FOREIGN_KEYS.items()
        for column in columns
    )


def test_upgrade_changes_nothing_but_those_foreign_keys(migration, conn):
    _build(conn)
    before = _everything_else(conn)
    assert before["session_logs"]["indexes"][-1] == (
        "uq_session_logs_one_open_per_user",
        ("user_id",),
        True,
        "end_time IS NULL",
    )
    assert before["projects"]["other foreign keys"] == [
        (("template_id",), "project_templates", ("id",), "SET NULL")
    ]

    _run(conn, migration.upgrade)

    assert _everything_else(conn) == before
    assert sorted(sa.inspect(conn).get_table_names()) == sorted(before)


def test_after_the_upgrade_the_database_deletes_the_rows_of_a_deleted_user(
    migration, conn
):
    _build(conn)
    _enforce_foreign_keys(conn)
    # Without the rule the database refuses to delete a user that has rows
    assert _refused(conn, "DELETE FROM users WHERE id = 1")
    conn.exec_driver_sql("PRAGMA foreign_keys=OFF")

    _run(conn, migration.upgrade)
    _enforce_foreign_keys(conn)
    of_user_two = _rows_of(conn, 2)
    assert set(_rows_of(conn, 1)) == {f"{table}.{column}" for table, column in USER_COLUMNS}

    conn.execute(sa.text("DELETE FROM users WHERE id = 1"))

    assert _rows_of(conn, 1) == {}
    # User 2 keeps every row but the link to the deleted parent
    assert of_user_two.pop("parent_students.student_id") == 2
    after = _rows_of(conn, 2)
    assert after.pop("parent_students.student_id") == 1
    assert after == of_user_two
    assert conn.exec_driver_sql("PRAGMA foreign_key_check").all() == []
    # The parent tables the rows also pointed at are untouched
    for table in ("achievement", "classrooms", "project_templates"):
        assert conn.execute(sa.text(f"SELECT COUNT(*) FROM {table}")).scalar() == 1


def test_upgrade_is_a_no_op_the_second_time(migration, conn):
    _build(conn)
    _run(conn, migration.upgrade)
    tables = _table_sql(conn)

    _run(conn, migration.upgrade)

    assert _table_sql(conn) == tables


def test_upgrade_leaves_a_table_alone_whose_foreign_key_has_the_rule(migration, conn):
    """A database that was built from the models, or a run that was interrupted
    after some of the tables."""
    schema = SCHEMA.replace(
        "CONSTRAINT fk_duck_trade_log_user_id_users FOREIGN KEY(user_id) REFERENCES users (id)",
        "CONSTRAINT fk_duck_trade_log_user_id_users FOREIGN KEY(user_id) REFERENCES users (id)"
        " ON DELETE CASCADE",
    ).replace(
        "    start_time DATETIME NOT NULL,\n    end_time DATETIME,\n    PRIMARY KEY (id),\n"
        "    FOREIGN KEY(user_id) REFERENCES users (id)\n",
        "    start_time DATETIME NOT NULL,\n    end_time DATETIME,\n    PRIMARY KEY (id),\n"
        "    FOREIGN KEY(user_id) REFERENCES users (id) on delete cascade\n",
    )
    assert schema.lower().count("on delete cascade") == 2
    _build(conn, schema)
    before = _table_sql(conn)

    _run(conn, migration.upgrade)

    after = _table_sql(conn)
    untouched = {name for name in before if after[name] == before[name]}
    assert {"duck_trade_log", "session_logs"} <= untouched
    assert not untouched & (
        {table for table, _column in USER_COLUMNS} - {"duck_trade_log", "session_logs"}
    )
    assert {rule for fks in _user_foreign_keys(conn).values() for _name, rule in fks} == {
        "CASCADE"
    }


def test_upgrade_replaces_another_rule_and_adds_a_missing_foreign_key(migration, conn):
    schema = SCHEMA.replace(
        "CONSTRAINT fk_submissions_user_id_users FOREIGN KEY(user_id) REFERENCES users (id)",
        "CONSTRAINT submissions_owner FOREIGN KEY(user_id) REFERENCES users (id)"
        " ON DELETE SET NULL",
    ).replace(
        "    filename VARCHAR(255) NOT NULL,\n"
        "    created_at DATETIME DEFAULT (CURRENT_TIMESTAMP),\n"
        "    PRIMARY KEY (id),\n"
        "    FOREIGN KEY(user_id) REFERENCES users (id)\n",
        "    filename VARCHAR(255) NOT NULL,\n"
        "    created_at DATETIME DEFAULT (CURRENT_TIMESTAMP),\n"
        "    PRIMARY KEY (id)\n",
    )
    _build(conn, schema)
    found = _user_foreign_keys(conn)
    assert found[("submissions", "user_id")] == [("submissions_owner", "SET NULL")]
    assert found[("notes", "user_id")] == []
    before = _everything_else(conn)

    _run(conn, migration.upgrade)

    found = _user_foreign_keys(conn)
    assert found[("submissions", "user_id")] == [("fk_submissions_user_id_users", "CASCADE")]
    assert found[("notes", "user_id")] == [("fk_notes_user_id_users", "CASCADE")]
    assert _everything_else(conn) == before


def test_upgrade_skips_a_table_that_does_not_have_the_column(migration, conn):
    """challenge_logs as it was while it still named its user by username."""
    _build(conn)
    conn.connection.driver_connection.executescript(
        """
        DROP TABLE challenge_logs;
        CREATE TABLE challenge_logs (
            id INTEGER NOT NULL,
            challenge_slug VARCHAR(255) NOT NULL,
            username VARCHAR(50) NOT NULL,
            PRIMARY KEY (id)
        );
        INSERT INTO challenge_logs (id, challenge_slug, username) VALUES (1, 'a', 'one');
        """
    )
    before = _table_sql(conn)["challenge_logs"]

    _run(conn, migration.upgrade)

    assert _table_sql(conn)["challenge_logs"] == before
    assert conn.execute(sa.text("SELECT * FROM challenge_logs")).all() == [(1, "a", "one")]
    assert _user_foreign_keys(conn)[("skills", "user_id")] == [
        ("fk_skills_user_id_users", "CASCADE")
    ]


def test_upgrade_clears_a_copy_left_by_an_interrupted_rebuild(migration, conn):
    _build(conn)
    before = _everything_else(conn)
    conn.execute(sa.text("CREATE TABLE _alembic_tmp_projects (id INTEGER PRIMARY KEY)"))

    _run(conn, migration.upgrade)

    assert "_alembic_tmp_projects" not in sa.inspect(conn).get_table_names()
    assert _everything_else(conn) == before
    assert _user_foreign_keys(conn)[("projects", "user_id")] == [
        ("fk_projects_user_id_users", "CASCADE")
    ]


@pytest.mark.parametrize("tables", ["none", "no users"])
def test_upgrade_and_downgrade_do_nothing_without_the_tables(migration, conn, tables):
    if tables == "no users":
        conn.execute(
            sa.text(
                "CREATE TABLE notes (id INTEGER NOT NULL PRIMARY KEY, user_id INTEGER NOT NULL)"
            )
        )
        conn.execute(sa.text("CREATE TABLE _alembic_tmp_notes (id INTEGER PRIMARY KEY)"))
    before = _table_sql(conn)

    _run(conn, migration.upgrade)
    _run(conn, migration.downgrade)

    assert _table_sql(conn) == before


@pytest.mark.parametrize(
    "target_metadata",
    [None, sa.MetaData(naming_convention=convention)],
    ids=["no naming convention", "the app's naming convention"],
)
def test_downgrade_takes_the_rule_off_and_keeps_everything_else(
    migration, conn, target_metadata
):
    _build(conn)
    before = _everything_else(conn)
    _run(conn, migration.upgrade, target_metadata)

    _run(conn, migration.downgrade, target_metadata)

    assert _user_foreign_keys(conn) == {
        (table, column): [(f"fk_{table}_{column}_users", None)]
        for table, column in USER_COLUMNS
    }
    assert _everything_else(conn) == before

    # A second run finds nothing left to change, and the upgrade works again
    tables = _table_sql(conn)
    _run(conn, migration.downgrade, target_metadata)
    assert _table_sql(conn) == tables
    _run(conn, migration.upgrade, target_metadata)
    assert {rule for fks in _user_foreign_keys(conn).values() for _name, rule in fks} == {
        "CASCADE"
    }
    assert _everything_else(conn) == before
