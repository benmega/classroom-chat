"""Add extra fields to project templates

Revision ID: bb40896a0236
Revises: d73fcb3e720b
Create Date: 2026-08-16 22:41:57.375672

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'bb40896a0236'
down_revision = 'd73fcb3e720b'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('project_templates', schema=None) as batch_op:
        batch_op.add_column(sa.Column('difficulty', sa.String(length=50), nullable=True, server_default='Intermediate'))
        batch_op.add_column(sa.Column('concepts', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('goals', sa.JSON(), nullable=True))


def downgrade():
    with op.batch_alter_table('project_templates', schema=None) as batch_op:
        batch_op.drop_column('goals')
        batch_op.drop_column('concepts')
        batch_op.drop_column('difficulty')
