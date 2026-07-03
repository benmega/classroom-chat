"""remove_ducks_column

Revision ID: 25e56ccdad3b
Revises: f1a2b3c4d5e6
Create Date: 2026-06-12 10:53:10.565114

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '25e56ccdad3b'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def _existing_columns(table_name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {c['name'] for c in inspector.get_columns(table_name)}

def upgrade():
    existing = _existing_columns('users')
    with op.batch_alter_table('users', schema=None) as batch_op:
        if 'ducks' in existing:
            batch_op.drop_column('ducks')

def downgrade():
    pass
