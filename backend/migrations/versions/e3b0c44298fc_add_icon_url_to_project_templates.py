"""add icon_url to project templates

Revision ID: e3b0c44298fc
Revises: 1eca7497eac0
Create Date: 2026-11-10 18:30:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'e3b0c44298fc'
down_revision = '1eca7497eac0'
branch_labels = None
depends_on = None


def _columns(inspector, table):
    return [col["name"] for col in inspector.get_columns(table)]


def upgrade():
    inspector = sa.inspect(op.get_bind())
    if 'project_templates' in inspector.get_table_names() and 'icon_url' not in _columns(inspector, 'project_templates'):
        with op.batch_alter_table('project_templates', schema=None) as batch_op:
            batch_op.add_column(sa.Column('icon_url', sa.String(length=255), nullable=True))


def downgrade():
    inspector = sa.inspect(op.get_bind())
    if 'project_templates' in inspector.get_table_names() and 'icon_url' in _columns(inspector, 'project_templates'):
        with op.batch_alter_table('project_templates', schema=None) as batch_op:
            batch_op.drop_column('icon_url')
