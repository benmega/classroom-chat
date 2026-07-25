"""Auto migration

Revision ID: d1f659476137
Revises: e1f2a3b4c5d6
Create Date: 2026-07-18 15:30:43.234434

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "d1f659476137"
down_revision = "e1f2a3b4c5d6"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "standard_projects" not in existing_tables:
        op.create_table(
            "standard_projects",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("link", sa.String(length=255), nullable=True),
            sa.Column("github_link", sa.String(length=255), nullable=True),
            sa.Column("video_url", sa.String(length=255), nullable=True),
            sa.Column("code_snippet", sa.Text(), nullable=True),
            sa.Column("image_url", sa.String(length=255), nullable=True),
            sa.PrimaryKeyConstraint("id", name=op.f("pk_standard_projects")),
        )

    if "users" in existing_tables:
        existing_cols = [c["name"] for c in inspector.get_columns("users")]
        if "can_chat" not in existing_cols:
            with op.batch_alter_table("users", schema=None) as batch_op:
                batch_op.add_column(sa.Column("can_chat", sa.Boolean(), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "users" in existing_tables:
        existing_cols = [c["name"] for c in inspector.get_columns("users")]
        if "can_chat" in existing_cols:
            with op.batch_alter_table("users", schema=None) as batch_op:
                batch_op.drop_column("can_chat")

    if "standard_projects" in existing_tables:
        op.drop_table("standard_projects")
