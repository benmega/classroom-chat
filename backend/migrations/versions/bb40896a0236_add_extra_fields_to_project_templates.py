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
    # --- Ghost table cleanup (idempotency) ---
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if inspector.has_table('_alembic_tmp_project_templates'):
        op.drop_table('_alembic_tmp_project_templates')
    # -----------------------------------------

    existing_cols = [col['name'] for col in inspector.get_columns('project_templates')]

    with op.batch_alter_table('project_templates', schema=None) as batch_op:
        if 'difficulty' not in existing_cols:
            batch_op.add_column(sa.Column('difficulty', sa.String(length=50), nullable=True, server_default='Intermediate'))
        if 'concepts' not in existing_cols:
            batch_op.add_column(sa.Column('concepts', sa.JSON(), nullable=True))
        if 'goals' not in existing_cols:
            batch_op.add_column(sa.Column('goals', sa.JSON(), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = [col['name'] for col in inspector.get_columns('project_templates')]

    with op.batch_alter_table('project_templates', schema=None) as batch_op:
        if 'goals' in existing_cols:
            batch_op.drop_column('goals')
        if 'concepts' in existing_cols:
            batch_op.drop_column('concepts')
        if 'difficulty' in existing_cols:
            batch_op.drop_column('difficulty')
