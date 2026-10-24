"""
File: test_migration_project_files.py
Type: py
Summary: The 183122a091ad migration adds project_files and project_type, marks the 3D
         templates and their projects as '3d', can run twice, and downgrades cleanly.
"""

import importlib.util
import pathlib

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

# The tables as the previous head (28a685819194) leaves them, cut down to the columns
# that matter here
SCHEMA = """
CREATE TABLE users (id INTEGER NOT NULL, username VARCHAR(50) NOT NULL, PRIMARY KEY (id));
CREATE TABLE challenges (
    id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (slug)
);
CREATE TABLE project_templates (
    id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    challenge_slug VARCHAR(255),
    CONSTRAINT pk_project_templates PRIMARY KEY (id),
    CONSTRAINT uq_project_templates_name UNIQUE (name)
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
    CONSTRAINT fk_projects_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX ix_projects_template_id ON projects (template_id);
CREATE INDEX ix_projects_user_id ON projects (user_id);
"""

ROWS = """
INSERT INTO users VALUES (1, 'one');
INSERT INTO challenges VALUES
  (1, 'Name Tag Model', 'name-tag-model', '3d-modeling'),
  (2, 'Dungeons', 'dungeons-of-kithgard', 'codecombat.com');
INSERT INTO project_templates VALUES
  (1, 'Name Tag Model', 'd', 'name-tag-model'),   -- a 3D challenge: '3d'
  (2, 'Dungeon Game', 'd', 'dungeons-of-kithgard'),  -- another domain
  (3, 'Plain', 'd', NULL),
  (4, 'Dangling', 'd', 'no-such-challenge');
INSERT INTO projects (id, name, user_id, template_id) VALUES
  (1, 'Name Tag Model', 1, 1),
  (2, 'Renamed tag', 1, 1),
  (3, 'My dungeon', 1, 2),
  (4, 'Free project', 1, NULL),
  (5, 'Plain one', 1, 3);
"""

TEMPLATE_TYPES = {1: "3d", 2: "code", 3: "code", 4: "code"}
PROJECT_TYPES = {1: "3d", 2: "3d", 3: "code", 4: "code", 5: "code"}


@pytest.fixture
def migration():
    path = next(
        pathlib.Path(__file__).resolve().parents[1].glob("migrations/versions/183122a091ad_*.py")
    )
    spec = importlib.util.spec_from_file_location("mig_183122a091ad", path)
    mig = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig)
    return mig


@pytest.fixture
def conn():
    engine = sa.create_engine("sqlite://")
    with engine.begin() as connection:
        raw = connection.connection.driver_connection
        raw.executescript(SCHEMA)
        raw.executescript(ROWS)
        yield connection
    engine.dispose()


def _run(conn, step):
    """Run a migration's upgrade or downgrade the way Alembic does, with `op` bound."""
    with Operations.context(MigrationContext.configure(conn)):
        step()


def _types(conn, table):
    return dict(conn.execute(sa.text(f"SELECT id, project_type FROM {table}")).all())


def _columns(conn, table):
    return {column["name"]: column for column in sa.inspect(conn).get_columns(table)}


def _schema(conn):
    rows = conn.execute(sa.text("SELECT name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'"))
    return dict(rows.all())


def test_it_follows_the_previous_head(migration):
    assert migration.down_revision == "28a685819194"


def test_upgrade_adds_the_files_table_and_the_type_columns(migration, conn):
    _run(conn, migration.upgrade)

    inspector = sa.inspect(conn)
    files = _columns(conn, "project_files")
    assert set(files) == {
        "id", "project_id", "kind", "path", "stored_path", "content_type", "file_size", "created_at"
    }
    assert [name for name, column in files.items() if not column["nullable"]] == [
        "id", "project_id", "kind", "path", "stored_path", "content_type", "file_size"
    ]
    [foreign_key] = inspector.get_foreign_keys("project_files")
    assert foreign_key["referred_table"] == "projects"
    assert foreign_key["constrained_columns"] == ["project_id"]
    assert foreign_key["options"]["ondelete"] == "CASCADE"
    assert [(u["name"], u["column_names"]) for u in inspector.get_unique_constraints("project_files")] == [
        ("uq_project_files_project_id_path", ["project_id", "path"])
    ]
    assert [(i["name"], i["column_names"]) for i in inspector.get_indexes("project_files")] == [
        ("ix_project_files_project_id", ["project_id"])
    ]
    # Ids are never reused: the file URLs carry them and are cached
    assert "AUTOINCREMENT" in _schema(conn)["project_files"]

    for table in ("projects", "project_templates"):
        column = _columns(conn, table)["project_type"]
        assert column["nullable"] is False
        assert column["default"] == "'code'"


def test_upgrade_marks_the_3d_templates_and_their_projects(migration, conn):
    _run(conn, migration.upgrade)

    assert _types(conn, "project_templates") == TEMPLATE_TYPES
    assert _types(conn, "projects") == PROJECT_TYPES


def test_rows_added_later_default_to_code(migration, conn):
    _run(conn, migration.upgrade)

    conn.execute(sa.text("INSERT INTO projects (id, name, user_id) VALUES (6, 'Later', 1)"))
    conn.execute(sa.text("INSERT INTO project_templates (id, name, description) VALUES (5, 'Later', 'd')"))

    assert _types(conn, "projects")[6] == "code"
    assert _types(conn, "project_templates")[5] == "code"


def test_upgrade_can_run_twice(migration, conn):
    _run(conn, migration.upgrade)
    schema = _schema(conn)
    # An admin's choice made since then is not undone by a second run
    conn.execute(sa.text("UPDATE projects SET project_type = '3d' WHERE id = 4"))

    _run(conn, migration.upgrade)

    assert _schema(conn) == schema
    assert _types(conn, "projects") == {**PROJECT_TYPES, 4: "3d"}


def test_upgrade_drops_a_copy_left_by_an_interrupted_run(migration, conn):
    conn.execute(sa.text("CREATE TABLE _alembic_tmp_projects (id INTEGER)"))

    _run(conn, migration.upgrade)

    assert "_alembic_tmp_projects" not in sa.inspect(conn).get_table_names()
    assert "project_type" in _columns(conn, "projects")


def test_upgrade_of_a_database_without_challenges_only_adds_the_schema(migration, conn):
    conn.execute(sa.text("DROP TABLE challenges"))

    _run(conn, migration.upgrade)

    assert set(_types(conn, "projects").values()) == {"code"}
    assert "project_files" in sa.inspect(conn).get_table_names()


def test_downgrade_takes_it_all_out_and_keeps_the_rows(migration, conn):
    projects_before = conn.execute(sa.text("SELECT * FROM projects ORDER BY id")).all()
    templates_before = conn.execute(sa.text("SELECT * FROM project_templates ORDER BY id")).all()
    _run(conn, migration.upgrade)
    conn.execute(
        sa.text(
            "INSERT INTO project_files (project_id, kind, path, stored_path, content_type, file_size) "
            "VALUES (1, 'model', 'tag.stl', 'project_files/x.stl', 'model/stl', 84)"
        )
    )

    _run(conn, migration.downgrade)

    inspector = sa.inspect(conn)
    assert "project_files" not in inspector.get_table_names()
    assert "project_type" not in _columns(conn, "projects")
    assert "project_type" not in _columns(conn, "project_templates")
    assert conn.execute(sa.text("SELECT * FROM projects ORDER BY id")).all() == projects_before
    assert conn.execute(sa.text("SELECT * FROM project_templates ORDER BY id")).all() == templates_before
    # The rebuilt projects table keeps its indexes and foreign keys
    assert {i["name"] for i in inspector.get_indexes("projects")} == {"ix_projects_template_id", "ix_projects_user_id"}
    assert {fk["referred_table"]: fk["options"].get("ondelete") for fk in inspector.get_foreign_keys("projects")} == {
        "project_templates": "SET NULL",
        "users": "CASCADE",
    }

    # And it can go up again
    _run(conn, migration.upgrade)
    assert _types(conn, "projects") == PROJECT_TYPES
