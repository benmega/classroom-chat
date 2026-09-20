"""add_challenge_slug_to_level_games

Revision ID: c1f8a29b4e31
Revises: b3e81a94c12d
Create Date: 2026-09-20 10:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'c1f8a29b4e31'
down_revision = 'b3e81a94c12d'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'level_games' in existing_tables:
        existing_cols = [c["name"] for c in inspector.get_columns("level_games")]

        def has_index(tname, iname):
            try:
                return any(idx["name"] == iname for idx in inspector.get_indexes(tname))
            except Exception:
                return False

        with op.batch_alter_table('level_games', schema=None) as batch_op:
            if 'challenge_slug' not in existing_cols:
                batch_op.add_column(sa.Column('challenge_slug', sa.String(length=255), nullable=True))
            if not has_index('level_games', 'ix_level_games_challenge_slug'):
                batch_op.create_index(batch_op.f('ix_level_games_challenge_slug'), ['challenge_slug'], unique=False)


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'level_games' in existing_tables:
        def has_index(tname, iname):
            try:
                return any(idx["name"] == iname for idx in inspector.get_indexes(tname))
            except Exception:
                return False

        existing_cols = [c["name"] for c in inspector.get_columns("level_games")]

        with op.batch_alter_table('level_games', schema=None) as batch_op:
            if has_index('level_games', 'ix_level_games_challenge_slug'):
                batch_op.drop_index(batch_op.f('ix_level_games_challenge_slug'))
            if 'challenge_slug' in existing_cols:
                batch_op.drop_column('challenge_slug')
