"""add teacher_note to submissions

Revision ID: f4951ace0f87
Revises: 694b5ead6d52
Create Date: 2026-08-07 12:50:09.242975

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f4951ace0f87'
down_revision = '694b5ead6d52'
branch_labels = None
depends_on = None


def _existing_columns(table_name):
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    return {col['name'] for col in inspector.get_columns(table_name)}


def upgrade():
    existing_cols = _existing_columns('submissions')
    with op.batch_alter_table('submissions', schema=None) as batch_op:
        if 'teacher_note' not in existing_cols:
            batch_op.add_column(sa.Column('teacher_note', sa.String(length=500), nullable=True))


def downgrade():
    existing_cols = _existing_columns('submissions')
    with op.batch_alter_table('submissions', schema=None) as batch_op:
        if 'teacher_note' in existing_cols:
            batch_op.drop_column('teacher_note')
