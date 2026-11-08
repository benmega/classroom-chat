"""add_project_template_is_active

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
    inspector = sa.inspect(op.get_bind())
    if 'project_templates' in inspector.get_table_names() and 'is_active' not in _columns(inspector, 'project_templates'):
        with op.batch_alter_table('project_templates', schema=None) as batch_op:
            batch_op.add_column(sa.Column('is_active', sa.Boolean(), server_default=sa.text('1'), nullable=False))


def downgrade():
    inspector = sa.inspect(op.get_bind())
    if 'project_templates' in inspector.get_table_names() and 'is_active' in _columns(inspector, 'project_templates'):
        with op.batch_alter_table('project_templates', schema=None) as batch_op:
            batch_op.drop_column('is_active')
