"""one challenge log per user, challenge and course instance

A challenge is logged once per user and course instance (issues #61 and #67). Until
now only the code that writes a log looked for an earlier one. This migration makes
the database hold the rule as well:

- a unique index on (user_id, challenge_slug, course_instance);
- a second, partial unique index on (user_id, challenge_slug) for the rows without
  a course instance, because NULLs never collide in the first one.

Rows that already break the rule are removed first: the earliest log (lowest id) of
each user, challenge and instance is kept as it is, the later copies are deleted.
Duck balances and transactions are not touched.

The plain index on the same three columns is dropped: the unique index serves the
same lookups.

Revision ID: 1dbcb322d37d
Revises: dcfead18fb96
Create Date: 2026-10-06 13:00:00.000000

"""
import logging

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "1dbcb322d37d"
down_revision = "dcfead18fb96"
branch_labels = None
depends_on = None

logger = logging.getLogger("alembic.runtime.migration")

TABLE = "challenge_logs"
KEY = ("user_id", "challenge_slug", "course_instance")
UNIQUE_INDEX = "uq_challenge_logs_user_slug_instance"
NO_INSTANCE_INDEX = "uq_challenge_logs_user_slug_no_instance"
NO_INSTANCE = "course_instance IS NULL"
LOOKUP_INDEX = "ix_challenge_log_user_slug_instance"


def delete_duplicate_logs(conn):
    """Delete every log but the first of each (user, challenge, instance).

    GROUP BY puts the rows of one user and challenge that have no course instance
    in one group, which is exactly what the partial index enforces. Returns the
    number of rows deleted.
    """
    result = conn.execute(
        sa.text(
            f"DELETE FROM {TABLE} WHERE id NOT IN "
            f"(SELECT MIN(id) FROM {TABLE} GROUP BY {', '.join(KEY)})"
        )
    )
    return result.rowcount


def _has_key_columns(inspector):
    return set(KEY) <= {c["name"] for c in inspector.get_columns(TABLE)}


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if TABLE not in inspector.get_table_names() or not _has_key_columns(inspector):
        return
    indexes = {ix["name"] for ix in inspector.get_indexes(TABLE)}

    deleted = delete_duplicate_logs(conn)
    if deleted:
        logger.info("Deleted %d duplicate rows from %s.", deleted, TABLE)

    if UNIQUE_INDEX not in indexes:
        op.create_index(UNIQUE_INDEX, TABLE, list(KEY), unique=True)
    if NO_INSTANCE_INDEX not in indexes:
        op.create_index(
            NO_INSTANCE_INDEX,
            TABLE,
            list(KEY[:2]),
            unique=True,
            sqlite_where=sa.text(NO_INSTANCE),
            postgresql_where=sa.text(NO_INSTANCE),
        )
    if LOOKUP_INDEX in indexes:
        op.drop_index(LOOKUP_INDEX, table_name=TABLE)


def downgrade():
    """Back to the plain lookup index. The deleted duplicates do not come back."""
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names() or not _has_key_columns(inspector):
        return
    indexes = {ix["name"] for ix in inspector.get_indexes(TABLE)}

    if LOOKUP_INDEX not in indexes:
        op.create_index(LOOKUP_INDEX, TABLE, list(KEY), unique=False)
    for name in (NO_INSTANCE_INDEX, UNIQUE_INDEX):
        if name in indexes:
            op.drop_index(name, table_name=TABLE)
