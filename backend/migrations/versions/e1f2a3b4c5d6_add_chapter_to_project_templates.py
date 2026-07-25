"""add chapter to project templates

Revision ID: e1f2a3b4c5d6
Revises: 6cafca745adc
Create Date: 2026-07-13 22:47:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "e1f2a3b4c5d6"
down_revision = "6cafca745adc"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("project_templates")]
    if "chapter" not in columns:
        op.add_column(
            "project_templates",
            sa.Column("chapter", sa.String(length=100), nullable=True),
        )


def downgrade():
    op.drop_column("project_templates", "chapter")
