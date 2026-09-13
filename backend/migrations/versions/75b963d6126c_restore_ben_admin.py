"""restore_ben_admin

Revision ID: 75b963d6126c
Revises: 72b675a2ee0a
Create Date: 2026-08-15 10:23:28.798680

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '75b963d6126c'
down_revision = '72b675a2ee0a'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("UPDATE users SET role = 'admin' WHERE username = 'ben'")


def downgrade():
    pass
