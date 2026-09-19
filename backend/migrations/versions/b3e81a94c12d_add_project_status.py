"""add_project_status

Revision ID: b3e81a94c12d
Revises: a6bfc514707c
Create Date: 2026-09-19 10:05:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'b3e81a94c12d'
down_revision = 'a6bfc514707c'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = [c["name"] for c in inspector.get_columns("projects")]
    if "status" not in existing_cols:
        with op.batch_alter_table("projects", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column("status", sa.String(length=20), nullable=False, server_default="pending")
            )

        # Backfill existing projects with teacher comments as approved
        conn.execute(
            sa.text(
                "UPDATE projects SET status = 'approved' WHERE teacher_comment IS NOT NULL AND teacher_comment != ''"
            )
        )


def downgrade():
    with op.batch_alter_table("projects", schema=None) as batch_op:
        batch_op.drop_column("status")
