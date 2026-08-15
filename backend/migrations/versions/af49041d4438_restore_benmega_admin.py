"""restore_benmega_admin

Revision ID: af49041d4438
Revises: 75b963d6126c
Create Date: 2026-08-15 10:45:39.944045

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'af49041d4438'
down_revision = '75b963d6126c'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("UPDATE users SET role = 'admin' WHERE username IN ('ben', 'benmega', 'admin', 'administrator')")

def downgrade():
    pass
