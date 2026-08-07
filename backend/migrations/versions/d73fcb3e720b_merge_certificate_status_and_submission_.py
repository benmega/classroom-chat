"""merge certificate status and submission teacher_note migrations

Revision ID: d73fcb3e720b
Revises: c95373b97dc9, f4951ace0f87
Create Date: 2026-08-07 12:58:48.103329

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd73fcb3e720b'
down_revision = ('c95373b97dc9', 'f4951ace0f87')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
