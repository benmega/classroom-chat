"""prod hotfix

Revision ID: a9f2e1d4b823
Revises: 940df4043dd3
Create Date: 2026-06-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = 'a9f2e1d4b823'
down_revision = '940df4043dd3'
branch_labels = None
depends_on = None

def _existing_columns(table_name):
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    return {c['name'] for c in inspector.get_columns(table_name)}

def upgrade():
    existing = _existing_columns('users')
    with op.batch_alter_table('users', schema=None) as batch_op:
        if 'packets' not in existing:
            batch_op.add_column(sa.Column('packets', sa.Double(), nullable=False, server_default='0'))

def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('packets')
