"""certificate status enum

Revision ID: c95373b97dc9
Revises: 694b5ead6d52
Create Date: 2026-08-07 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "c95373b97dc9"
down_revision = "694b5ead6d52"
branch_labels = None
depends_on = None


def _existing_columns(table_name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {c["name"] for c in inspector.get_columns(table_name)}


def upgrade():
    existing = _existing_columns("user_certificate")

    if "status" not in existing:
        with op.batch_alter_table("user_certificate", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column(
                    "status",
                    sa.String(length=20),
                    nullable=False,
                    server_default="pending",
                )
            )
    if "review_note" not in existing:
        with op.batch_alter_table("user_certificate", schema=None) as batch_op:
            batch_op.add_column(sa.Column("review_note", sa.Text(), nullable=True))

    # Backfill status from the old `reviewed` boolean before dropping it.
    if "reviewed" in existing:
        op.execute(
            "UPDATE user_certificate SET status = 'approved' WHERE reviewed IN (1, 'true', 't', 'True')"
        )
        op.execute(
            "UPDATE user_certificate SET status = 'pending' "
            "WHERE reviewed IS NULL OR reviewed IN (0, 'false', 'f', 'False')"
        )

        with op.batch_alter_table("user_certificate", schema=None) as batch_op:
            batch_op.drop_column("reviewed")


def downgrade():
    existing = _existing_columns("user_certificate")

    if "reviewed" not in existing:
        with op.batch_alter_table("user_certificate", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column(
                    "reviewed", sa.Boolean(), nullable=False, server_default=sa.text("0")
                )
            )

        op.execute("UPDATE user_certificate SET reviewed = 1 WHERE status = 'approved'")
        op.execute("UPDATE user_certificate SET reviewed = 0 WHERE status != 'approved'")

    existing = _existing_columns("user_certificate")
    with op.batch_alter_table("user_certificate", schema=None) as batch_op:
        if "review_note" in existing:
            batch_op.drop_column("review_note")
        if "status" in existing:
            batch_op.drop_column("status")
