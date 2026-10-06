"""one open session per user

A user has at most one open session, a session_logs row whose end_time is NULL
(issue #68). Until now only SessionLog.start_session looked for an open session
before it wrote one. This migration makes the database hold the rule as well, with
a partial unique index on session_logs(user_id) for the rows that have not ended.

Where a user has several open sessions, the newest one (latest start, then highest
id) stays open. The older ones stopped being used when it began: they are closed at
the time they were last seen, the way the stale-session cleanup closes a session.
No row is deleted.

Revision ID: 6f71766c6b8f
Revises: 1dbcb322d37d
Create Date: 2026-10-06 14:00:00.000000

"""
import logging

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "6f71766c6b8f"
down_revision = "1dbcb322d37d"
branch_labels = None
depends_on = None

logger = logging.getLogger("alembic.runtime.migration")

TABLE = "session_logs"
INDEX = "uq_session_logs_one_open_per_user"
OPEN = "end_time IS NULL"
_COLUMNS = {"id", "user_id", "start_time", "end_time", "last_seen"}


def close_older_open_sessions(conn):
    """Close every open session that has a newer open one of the same user.

    Which rows are closed does not depend on the order they are visited in: the
    newest open session of a user is never closed, so each older one always finds
    it. Returns the number of sessions closed.
    """
    result = conn.execute(
        sa.text(
            f"UPDATE {TABLE} SET end_time = COALESCE(last_seen, start_time) "
            f"WHERE {OPEN} AND EXISTS ("
            f"SELECT 1 FROM {TABLE} AS newer "
            f"WHERE newer.user_id = {TABLE}.user_id AND newer.{OPEN} "
            f"AND (newer.start_time > {TABLE}.start_time "
            f"OR (newer.start_time = {TABLE}.start_time AND newer.id > {TABLE}.id)))"
        )
    )
    return result.rowcount


def _is_session_logs(inspector):
    if TABLE not in inspector.get_table_names():
        return False
    return _COLUMNS.issubset(c["name"] for c in inspector.get_columns(TABLE))


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if not _is_session_logs(inspector):
        return

    closed = close_older_open_sessions(conn)
    if closed:
        logger.info("Closed %d older open rows of %s.", closed, TABLE)

    if INDEX not in {ix["name"] for ix in inspector.get_indexes(TABLE)}:
        op.create_index(
            INDEX,
            TABLE,
            ["user_id"],
            unique=True,
            sqlite_where=sa.text(OPEN),
            postgresql_where=sa.text(OPEN),
        )


def downgrade():
    """Drop the index. The sessions the upgrade closed stay closed."""
    inspector = sa.inspect(op.get_bind())
    if not _is_session_logs(inspector):
        return

    if INDEX in {ix["name"] for ix in inspector.get_indexes(TABLE)}:
        op.drop_index(INDEX, table_name=TABLE)
