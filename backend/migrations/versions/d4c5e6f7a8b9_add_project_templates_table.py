"""add project templates table

Revision ID: d4c5e6f7a8b9
Revises: 694097f8bfbf
Create Date: 2026-07-05 19:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4c5e6f7a8b9'
down_revision = '694097f8bfbf'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('project_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )


def downgrade():
    op.drop_table('project_templates')
