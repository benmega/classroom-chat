"""configuration is a single row

The app reads its settings from one configuration row (issue #66). Until now
nothing in the database kept a second row from being added. This migration adds a
CHECK constraint that only accepts id 1; with the primary key on id, the table can
then hold one row at most.

Rows that do not fit are dealt with first: the oldest row (lowest id), which is the
one Configuration.get_current() has always returned, is kept and given id 1. Any
other row is deleted. An empty table stays empty: the app creates the default row
when it starts.

Revision ID: 1785a35c3f5a
Revises: 6f71766c6b8f
Create Date: 2026-10-06 15:00:00.000000

"""
import logging

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "1785a35c3f5a"
down_revision = "6f71766c6b8f"
branch_labels = None
depends_on = None

logger = logging.getLogger("alembic.runtime.migration")

TABLE = "configuration"
BATCH_COPY = f"_alembic_tmp_{TABLE}"
SINGLETON_ID = 1
CHECK_NAME = "ck_configuration_singleton"
CHECK_SQL = f"id = {SINGLETON_ID}"


def keep_the_oldest_row(conn):
    """Delete every configuration row but the oldest and make that one row 1.

    Returns the number of rows deleted.
    """
    kept = conn.execute(sa.text(f"SELECT MIN(id) FROM {TABLE}")).scalar()
    if kept is None:
        return 0
    deleted = conn.execute(
        sa.text(f"DELETE FROM {TABLE} WHERE id != :kept"), {"kept": kept}
    ).rowcount
    if kept != SINGLETON_ID:
        conn.execute(
            sa.text(f"UPDATE {TABLE} SET id = :one WHERE id = :kept"),
            {"one": SINGLETON_ID, "kept": kept},
        )
    return deleted


def has_singleton_check(inspector):
    return any(
        check["name"] == CHECK_NAME
        for check in inspector.get_check_constraints(TABLE)
    )


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if TABLE not in tables:
        return

    deleted = keep_the_oldest_row(conn)
    if deleted:
        logger.info("Deleted %d surplus rows from %s.", deleted, TABLE)

    if has_singleton_check(inspector):
        return

    # A copy left behind by an interrupted rebuild would stop this one. The real
    # table is still there, so the copy holds nothing that is not in it.
    if BATCH_COPY in tables:
        op.drop_table(BATCH_COPY)

    with op.batch_alter_table(TABLE, schema=None) as batch_op:
        # op.f(): the name is final, the naming convention must not extend it
        batch_op.create_check_constraint(op.f(CHECK_NAME), CHECK_SQL)


def downgrade():
    """Drop the constraint. The rows the upgrade deleted do not come back."""
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names() or not has_singleton_check(inspector):
        return

    with op.batch_alter_table(TABLE, schema=None) as batch_op:
        batch_op.drop_constraint(op.f(CHECK_NAME), type_="check")
