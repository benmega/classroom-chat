"""
add_classroom_join_code

Adds join_code column to classrooms and creates the classroom_join_attempts
table for rate-limit tracking.

Revision ID: c1d2e3f4a5b6
Revises: 1217f40df1a9
Create Date: 2026-07-24
"""
from alembic import op
import sqlalchemy as sa

# ---------------------------------------------------------------------------
# Alembic revision chain
# ---------------------------------------------------------------------------
revision = 'c1d2e3f4a5b6'
down_revision = '1217f40df1a9'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # ── 1. classrooms.join_code ──────────────────────────────────────────────
    if 'classrooms' in existing_tables:
        existing_cols = {c['name'] for c in inspector.get_columns('classrooms')}
        if 'join_code' not in existing_cols:
            with op.batch_alter_table('classrooms', schema=None) as batch_op:
                batch_op.add_column(sa.Column('join_code', sa.String(5), nullable=True))
                batch_op.create_index('ix_classrooms_join_code', ['join_code'], unique=True)

    # ── 2. classroom_join_attempts table ────────────────────────────────────
    if 'classroom_join_attempts' not in existing_tables:
        op.create_table(
            'classroom_join_attempts',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('student_id', sa.Integer(), nullable=False),
            sa.Column('attempted_at', sa.DateTime(), nullable=False),
            sa.Column('code_attempted', sa.String(10), nullable=False),
            sa.Column('success', sa.Boolean(), nullable=True),
            sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(
            'ix_classroom_join_attempts_student_id',
            'classroom_join_attempts',
            ['student_id'],
        )
        op.create_index(
            'ix_classroom_join_attempts_attempted_at',
            'classroom_join_attempts',
            ['attempted_at'],
        )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if 'classroom_join_attempts' in existing_tables:
        op.drop_index('ix_classroom_join_attempts_attempted_at',
                      table_name='classroom_join_attempts')
        op.drop_index('ix_classroom_join_attempts_student_id',
                      table_name='classroom_join_attempts')
        op.drop_table('classroom_join_attempts')

    if 'classrooms' in existing_tables:
        existing_cols = {c['name'] for c in inspector.get_columns('classrooms')}
        if 'join_code' in existing_cols:
            with op.batch_alter_table('classrooms', schema=None) as batch_op:
                batch_op.drop_index('ix_classrooms_join_code')
                batch_op.drop_column('join_code')
