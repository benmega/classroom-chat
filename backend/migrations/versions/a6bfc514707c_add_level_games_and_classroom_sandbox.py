"""add_level_games_and_classroom_sandbox

Revision ID: a6bfc514707c
Revises: f443a8f8f605
Create Date: 2026-09-17 23:51:48.511690

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'a6bfc514707c'
down_revision = 'f443a8f8f605'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    for ghost in ("_alembic_tmp_level_games", "_alembic_tmp_classrooms"):
        if ghost in existing_tables:
            op.drop_table(ghost)

    if 'level_games' not in existing_tables:
        op.create_table('level_games',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('course_id', sa.String(length=64), nullable=True),
            sa.Column('chapter', sa.Integer(), nullable=True),
            sa.Column('lesson', sa.Integer(), nullable=True),
            sa.Column('challenge_level', sa.String(length=10), nullable=True),
            sa.Column('assigned_lesson', sa.String(length=50), nullable=False),
            sa.Column('progression_order', sa.Integer(), nullable=False),
            sa.Column('game_name', sa.String(length=255), nullable=False),
            sa.Column('game_url', sa.String(length=1000), nullable=False),
            sa.Column('platform', sa.String(length=100), nullable=True),
            sa.Column('comment', sa.Text(), nullable=True),
            sa.Column('requires_account', sa.Boolean(), nullable=False, server_default=sa.text('0')),
            sa.Column('rating', sa.Float(), nullable=True),
            sa.Column('verified', sa.Boolean(), nullable=False, server_default=sa.text('1')),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id', name=op.f('pk_level_games'))
        )

    def has_index(tname, iname):
        try:
            return any(idx["name"] == iname for idx in inspector.get_indexes(tname))
        except Exception:
            return False

    with op.batch_alter_table('level_games', schema=None) as batch_op:
        if not has_index('level_games', 'ix_level_games_assigned_lesson'):
            batch_op.create_index(batch_op.f('ix_level_games_assigned_lesson'), ['assigned_lesson'], unique=False)
        if not has_index('level_games', 'ix_level_games_challenge_level'):
            batch_op.create_index(batch_op.f('ix_level_games_challenge_level'), ['challenge_level'], unique=False)
        if not has_index('level_games', 'ix_level_games_chapter'):
            batch_op.create_index(batch_op.f('ix_level_games_chapter'), ['chapter'], unique=False)
        if not has_index('level_games', 'ix_level_games_course_id'):
            batch_op.create_index(batch_op.f('ix_level_games_course_id'), ['course_id'], unique=False)
        if not has_index('level_games', 'ix_level_games_lesson'):
            batch_op.create_index(batch_op.f('ix_level_games_lesson'), ['lesson'], unique=False)
        if not has_index('level_games', 'ix_level_games_progression_order'):
            batch_op.create_index(batch_op.f('ix_level_games_progression_order'), ['progression_order'], unique=False)

    existing_classroom_cols = [c["name"] for c in inspector.get_columns("classrooms")]
    with op.batch_alter_table('classrooms', schema=None) as batch_op:
        if 'sandbox_active' not in existing_classroom_cols:
            batch_op.add_column(sa.Column('sandbox_active', sa.Boolean(), nullable=False, server_default=sa.text('0')))
        if 'sandbox_activated_at' not in existing_classroom_cols:
            batch_op.add_column(sa.Column('sandbox_activated_at', sa.DateTime(), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "classrooms" in existing_tables:
        existing_classroom_cols = [c["name"] for c in inspector.get_columns("classrooms")]
        with op.batch_alter_table('classrooms', schema=None) as batch_op:
            if 'sandbox_activated_at' in existing_classroom_cols:
                batch_op.drop_column('sandbox_activated_at')
            if 'sandbox_active' in existing_classroom_cols:
                batch_op.drop_column('sandbox_active')

    if "level_games" in existing_tables:
        def has_index(tname, iname):
            try:
                return any(idx["name"] == iname for idx in inspector.get_indexes(tname))
            except Exception:
                return False

        with op.batch_alter_table('level_games', schema=None) as batch_op:
            if has_index('level_games', 'ix_level_games_progression_order'):
                batch_op.drop_index(batch_op.f('ix_level_games_progression_order'))
            if has_index('level_games', 'ix_level_games_lesson'):
                batch_op.drop_index(batch_op.f('ix_level_games_lesson'))
            if has_index('level_games', 'ix_level_games_course_id'):
                batch_op.drop_index(batch_op.f('ix_level_games_course_id'))
            if has_index('level_games', 'ix_level_games_chapter'):
                batch_op.drop_index(batch_op.f('ix_level_games_chapter'))
            if has_index('level_games', 'ix_level_games_challenge_level'):
                batch_op.drop_index(batch_op.f('ix_level_games_challenge_level'))
            if has_index('level_games', 'ix_level_games_assigned_lesson'):
                batch_op.drop_index(batch_op.f('ix_level_games_assigned_lesson'))

        op.drop_table('level_games')
