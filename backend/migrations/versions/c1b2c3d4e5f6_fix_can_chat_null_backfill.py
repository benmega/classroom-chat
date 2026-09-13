"""Fix can_chat NULL values - backfill existing rows to True

Revision ID: a1b2c3d4e5f6
Revises: f907d00ca5ef
Create Date: 2026-08-02 13:17:00.000000

The original migration (561b9631c222) added can_chat as nullable=True with no
server_default, leaving all pre-existing users with can_chat = NULL.

This migration backfills NULL rows to TRUE (i.e., chat enabled by default),
then tightens the column to NOT NULL with a server default of TRUE so no future
rows can end up in an ambiguous NULL state.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "c1b2c3d4e5f6"
down_revision = "f907d00ca5ef"
branch_labels = None
depends_on = None


def upgrade():
    # Backfill all existing NULL rows to TRUE (chat enabled)
    op.execute("UPDATE users SET can_chat = TRUE WHERE can_chat IS NULL")

    # Tighten the column: add server default and make it NOT NULL
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.alter_column(
            "can_chat",
            existing_type=sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        )


def downgrade():
    # Revert to nullable without server default (matches original migration state)
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.alter_column(
            "can_chat",
            existing_type=sa.Boolean(),
            nullable=True,
            server_default=None,
        )
