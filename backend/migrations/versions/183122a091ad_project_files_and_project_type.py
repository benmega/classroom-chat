"""project files and project types

Projects get files of three kinds (3D models, source files, assets) in the new
project_files table, and projects and project templates get a project_type:
'code', the default, or '3d'.

A project_files row belongs to its project (ON DELETE CASCADE, indexed), and a
project has one file per path (uq_project_files_project_id_path). Its id is an
AUTOINCREMENT key, so an id is never reused: the file URLs carry it and are
cached. The files themselves live under userData/project_files; a downgrade
leaves them there.

Backfill: a template whose challenge_slug is a challenge of the 3D modeling domain
('3d-modeling') becomes '3d', and so does every project built from such a
template (projects.template_id). Everything else stays 'code'.

Revision ID: 183122a091ad
Revises: 28a685819194
Create Date: 2026-10-14 12:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "183122a091ad"
down_revision = "28a685819194"
branch_labels = None
depends_on = None

THREE_D_DOMAIN = "3d-modeling"
FILES_TABLE = "project_files"
_IX_PROJECT_ID = "ix_project_files_project_id"
# The tables that gain project_type (altered in batch mode)
TYPED_TABLES = ("projects", "project_templates")


def _columns(inspector, table):
    return {column["name"] for column in inspector.get_columns(table)}


def _has_index(inspector, table, name):
    try:
        return any(index["name"] == name for index in inspector.get_indexes(table))
    except Exception:
        return False


def backfill_project_types(conn):
    """Mark the templates of the 3D modeling challenges, and the projects built
    from them, as '3d'."""
    three_d_templates = (
        "SELECT pt.id FROM project_templates pt "
        "JOIN challenges c ON c.slug = pt.challenge_slug "
        "WHERE c.domain = :domain"
    )
    for table, key in (("project_templates", "id"), ("projects", "template_id")):
        conn.execute(
            sa.text(f"UPDATE {table} SET project_type = '3d' WHERE {key} IN ({three_d_templates})"),
            {"domain": THREE_D_DOMAIN},
        )


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    # A copy left by an interrupted batch run would stop the one below. The real
    # table is still there, so the copy holds nothing that is not in it.
    for table in TYPED_TABLES:
        if f"_alembic_tmp_{table}" in tables and table in tables:
            op.drop_table(f"_alembic_tmp_{table}")

    for table in TYPED_TABLES:
        if table in tables and "project_type" not in _columns(inspector, table):
            with op.batch_alter_table(table, schema=None) as batch_op:
                batch_op.add_column(
                    sa.Column("project_type", sa.String(length=20), nullable=False, server_default="code")
                )

    if "projects" in tables and FILES_TABLE not in tables:
        op.create_table(
            FILES_TABLE,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("project_id", sa.Integer(), nullable=False),
            sa.Column("kind", sa.String(length=20), nullable=False),
            sa.Column("path", sa.String(length=255), nullable=False),
            sa.Column("stored_path", sa.String(length=255), nullable=False),
            sa.Column("content_type", sa.String(length=100), nullable=False),
            sa.Column("file_size", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(
                ["project_id"],
                ["projects.id"],
                name=op.f("fk_project_files_project_id_projects"),
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id", name=op.f("pk_project_files")),
            sa.UniqueConstraint("project_id", "path", name=op.f("uq_project_files_project_id_path")),
            sqlite_autoincrement=True,
        )

    inspector = sa.inspect(conn)
    if FILES_TABLE in inspector.get_table_names() and not _has_index(inspector, FILES_TABLE, _IX_PROJECT_ID):
        op.create_index(op.f(_IX_PROJECT_ID), FILES_TABLE, ["project_id"], unique=False)

    if (
        {"projects", "project_templates", "challenges"} <= tables
        and "challenge_slug" in _columns(inspector, "project_templates")
        and "template_id" in _columns(inspector, "projects")
    ):
        backfill_project_types(conn)


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    if FILES_TABLE in tables:
        if _has_index(inspector, FILES_TABLE, _IX_PROJECT_ID):
            op.drop_index(op.f(_IX_PROJECT_ID), table_name=FILES_TABLE)
        op.drop_table(FILES_TABLE)

    for table in TYPED_TABLES:
        if table in tables and "project_type" in _columns(inspector, table):
            with op.batch_alter_table(table, schema=None) as batch_op:
                batch_op.drop_column("project_type")
