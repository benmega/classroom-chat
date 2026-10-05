"""remove_ai_teacher

The AI teacher feature was removed from the code (issue #92). This migration
removes what it left in the database:

- the AI Teacher user (id 0, username "AI Teacher"), the messages it wrote,
  the messages addressed only to it, and every other row that points at it;
- the ai_settings table;
- the configuration.ai_teacher_enabled column.

SQLite does not enforce ON DELETE CASCADE unless foreign keys are switched on,
so child rows are deleted explicitly before their parents.

Revision ID: f3c9a1d07e52
Revises: e5b2d84f6a17
Create Date: 2026-10-03 18:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'f3c9a1d07e52'
down_revision = 'e5b2d84f6a17'
branch_labels = None
depends_on = None

AI_TEACHER_USER_ID = 0
AI_TEACHER_USERNAME = 'ai teacher'

# Columns other than messages.user_id / message_users.user_id that may point at a user.
_USER_FK_COLUMNS = ('user_id', 'student_id', 'parent_id')


def _ai_teacher_exists(conn):
    return conn.execute(
        sa.text("SELECT 1 FROM users WHERE id = :uid AND lower(username) = :name"),
        {"uid": AI_TEACHER_USER_ID, "name": AI_TEACHER_USERNAME},
    ).first() is not None


def delete_ai_teacher(conn, inspector):
    """Delete the AI Teacher user and every row that refers to it."""
    tables = set(inspector.get_table_names())
    if 'users' not in tables or not _ai_teacher_exists(conn):
        return
    uid = {"uid": AI_TEACHER_USER_ID}

    if 'messages' in tables:
        # Messages it wrote, plus messages whose only recipient was the AI teacher
        # (not global and not posted to a classroom), which nobody can see any more.
        doomed = "SELECT id FROM messages WHERE user_id = :uid"
        if 'message_users' in tables:
            only_to_ai = (
                "SELECT mu.message_id FROM message_users mu "
                "JOIN messages m ON m.id = mu.message_id "
                "WHERE mu.user_id = :uid AND coalesce(m.is_global, 0) = 0 "
                "AND NOT EXISTS (SELECT 1 FROM message_users o "
                "WHERE o.message_id = mu.message_id AND o.user_id != :uid)"
            )
            if 'message_classrooms' in tables:
                only_to_ai += (
                    " AND NOT EXISTS (SELECT 1 FROM message_classrooms mc "
                    "WHERE mc.message_id = mu.message_id)"
                )
            doomed = f"{doomed} UNION {only_to_ai}"

        ids = [row[0] for row in conn.execute(sa.text(doomed), uid)]
        for child in ('message_users', 'message_classrooms'):
            if child in tables and ids:
                conn.execute(
                    sa.text(f"DELETE FROM {child} WHERE message_id IN :ids").bindparams(
                        sa.bindparam("ids", expanding=True)
                    ),
                    {"ids": ids},
                )
        if ids:
            conn.execute(
                sa.text("DELETE FROM messages WHERE id IN :ids").bindparams(
                    sa.bindparam("ids", expanding=True)
                ),
                {"ids": ids},
            )

    for table in sorted(tables - {'users'}):
        for col in inspector.get_columns(table):
            if col["name"] in _USER_FK_COLUMNS:
                conn.execute(sa.text(f'DELETE FROM "{table}" WHERE "{col["name"]}" = :uid'), uid)

    conn.execute(sa.text("DELETE FROM users WHERE id = :uid"), uid)


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    delete_ai_teacher(conn, inspector)

    if 'ai_settings' in inspector.get_table_names():
        op.drop_table('ai_settings')

    if 'configuration' in inspector.get_table_names():
        cols = [c["name"] for c in inspector.get_columns('configuration')]
        if 'ai_teacher_enabled' in cols:
            with op.batch_alter_table('configuration', schema=None) as batch_op:
                batch_op.drop_column('ai_teacher_enabled')


def downgrade():
    # Restores the schema only; the deleted AI Teacher user and messages are gone.
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'configuration' in inspector.get_table_names():
        cols = [c["name"] for c in inspector.get_columns('configuration')]
        if 'ai_teacher_enabled' not in cols:
            with op.batch_alter_table('configuration', schema=None) as batch_op:
                batch_op.add_column(sa.Column('ai_teacher_enabled', sa.Boolean(), nullable=True))

    if 'ai_settings' not in inspector.get_table_names():
        op.create_table(
            'ai_settings',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('key', sa.String(length=50), nullable=True),
            sa.Column('value', sa.String(length=1000), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
