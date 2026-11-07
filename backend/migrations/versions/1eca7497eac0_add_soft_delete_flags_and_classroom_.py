"""add_soft_delete_flags_and_classroom_archive

Revision ID: 1eca7497eac0
Revises: 7d3e1f9a2c64
Create Date: 2026-11-07 10:53:31.270542

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '1eca7497eac0'
down_revision = '7d3e1f9a2c64'
branch_labels = None
depends_on = None


def _columns(inspector, table):
    return [col["name"] for col in inspector.get_columns(table)]


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'achievement' in tables and 'is_active' not in _columns(inspector, 'achievement'):
        with op.batch_alter_table('achievement', schema=None) as batch_op:
            batch_op.add_column(sa.Column('is_active', sa.Boolean(), server_default=sa.text('1'), nullable=False))

    if 'classrooms' in tables:
        cols = _columns(inspector, 'classrooms')
        if 'is_active' not in cols:
            with op.batch_alter_table('classrooms', schema=None) as batch_op:
                batch_op.add_column(sa.Column('is_active', sa.Boolean(), server_default=sa.text('1'), nullable=False))
        if 'is_archived' not in cols:
            with op.batch_alter_table('classrooms', schema=None) as batch_op:
                batch_op.add_column(sa.Column('is_archived', sa.Boolean(), server_default=sa.text('0'), nullable=False))

    if 'project_templates' in tables and 'is_active' not in _columns(inspector, 'project_templates'):
        with op.batch_alter_table('project_templates', schema=None) as batch_op:
            batch_op.add_column(sa.Column('is_active', sa.Boolean(), server_default=sa.text('1'), nullable=False))

    if 'user_classrooms' in tables:
        conn.execute(sa.text("DELETE FROM user_classrooms WHERE classroom_id IN ('global', 'archive')"))
    if 'course_instances' in tables:
        conn.execute(sa.text("DELETE FROM course_instances WHERE classroom_id IN ('global', 'archive')"))
    if 'message_classrooms' in tables:
        conn.execute(sa.text("DELETE FROM message_classrooms WHERE classroom_id IN ('global', 'archive')"))
    if 'quiz_assignments' in tables:
        conn.execute(sa.text("DELETE FROM quiz_assignments WHERE classroom_id IN ('global', 'archive')"))
    if 'challenges' in tables:
        conn.execute(sa.text("UPDATE challenges SET classroom_id = NULL WHERE classroom_id IN ('global', 'archive')"))
    if 'submissions' in tables:
        conn.execute(sa.text("UPDATE submissions SET classroom_id = NULL WHERE classroom_id IN ('global', 'archive')"))
    if 'classrooms' in tables:
        conn.execute(sa.text("DELETE FROM classrooms WHERE id IN ('global', 'archive')"))


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'project_templates' in tables and 'is_active' in _columns(inspector, 'project_templates'):
        with op.batch_alter_table('project_templates', schema=None) as batch_op:
            batch_op.drop_column('is_active')
