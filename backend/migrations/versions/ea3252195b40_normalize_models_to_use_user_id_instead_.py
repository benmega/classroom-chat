"""Normalize models to use user_id instead of username

Revision ID: ea3252195b40
Revises: a1b2c3d4e5f6
Create Date: 2026-06-10 12:54:08.498310

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'ea3252195b40'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # ── Clean up orphaned Alembic temp tables ─────────────────────────────────
    # SQLite's batch_alter_table works by creating _alembic_tmp_<table>, copying
    # data into it, then renaming.  If a previous migration run crashed mid-way,
    # these temp tables are left behind and block the next attempt.
    # Dropping them here makes upgrade() safely re-entrant after any failure.
    existing_tables = inspector.get_table_names()
    for orphan in ('_alembic_tmp_challenge_logs', '_alembic_tmp_duck_trade_log'):
        if orphan in existing_tables:
            bind.execute(sa.text(f'DROP TABLE "{orphan}"'))

    # ── Drop legacy tables if they exist ──────────────────────────────────────
    existing_tables = inspector.get_table_names()
    if 'trade' in existing_tables:
        op.drop_table('trade')
    if 'bounties' in existing_tables:
        op.drop_table('bounties')

    # ── challenge_logs ────────────────────────────────────────────────────────
    cl_cols = {c['name'] for c in inspector.get_columns('challenge_logs')}

    # Add user_id only if it doesn't exist yet
    if 'user_id' not in cl_cols:
        with op.batch_alter_table('challenge_logs', schema=None) as batch_op:
            batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=True))

        # Back-fill from username column (only meaningful if username still exists)
        if 'username' in cl_cols:
            op.execute(
                "UPDATE challenge_logs SET user_id = "
                "(SELECT id FROM users WHERE LOWER(users.username) = LOWER(challenge_logs.username))"
            )

    # Always purge orphan rows before enforcing NOT NULL — this must run
    # unconditionally because the prod DB may have been built by db.create_all()
    # (user_id column already present) but still contain NULL rows from legacy
    # data that pre-dates the FK relationship.
    op.execute("DELETE FROM challenge_logs WHERE user_id IS NULL")

    # Second batch: make user_id NOT NULL, swap indexes, drop username.
    # SQLite batch_alter_table rebuilds the entire table, so any NULL in user_id
    # would fail the constraint during the internal INSERT SELECT — hence the
    # unconditional DELETE immediately above.
    with op.batch_alter_table('challenge_logs', schema=None) as batch_op:
        batch_op.alter_column('user_id', existing_type=sa.Integer(), nullable=False)

        cl_indexes = {ix['name'] for ix in inspector.get_indexes('challenge_logs')}
        if 'ix_challenge_logs_username' in cl_indexes:
            try:
                batch_op.drop_index(batch_op.f('ix_challenge_logs_username'))
            except (ValueError, Exception):
                pass
        if 'ix_challenge_logs_user_id' not in cl_indexes:
            batch_op.create_index(batch_op.f('ix_challenge_logs_user_id'), ['user_id'], unique=False)

        batch_op.create_foreign_key(batch_op.f('fk_challenge_logs_user_id_users'), 'users', ['user_id'], ['id'])

        # Re-inspect to see if username column still exists before dropping
        cl_cols_now = {c['name'] for c in sa.inspect(bind).get_columns('challenge_logs')}
        if 'username' in cl_cols_now:
            batch_op.drop_column('username')

    # ── duck_trade_log ────────────────────────────────────────────────────────
    dtl_cols = {c['name'] for c in inspector.get_columns('duck_trade_log')}

    if 'user_id' not in dtl_cols:
        with op.batch_alter_table('duck_trade_log', schema=None) as batch_op:
            batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=True))

        if 'username' in dtl_cols:
            op.execute(
                "UPDATE duck_trade_log SET user_id = "
                "(SELECT id FROM users WHERE LOWER(users.username) = LOWER(duck_trade_log.username))"
            )

    # Same pattern as challenge_logs — purge NULLs unconditionally before
    # the batch rebuild enforces NOT NULL.
    op.execute("DELETE FROM duck_trade_log WHERE user_id IS NULL")

    with op.batch_alter_table('duck_trade_log', schema=None) as batch_op:
        batch_op.alter_column('user_id', existing_type=sa.Integer(), nullable=False)

        dtl_indexes = {ix['name'] for ix in inspector.get_indexes('duck_trade_log')}
        if 'ix_duck_trade_log_username' in dtl_indexes:
            try:
                batch_op.drop_index(batch_op.f('ix_duck_trade_log_username'))
            except (ValueError, Exception):
                pass
        if 'ix_duck_trade_log_user_id' not in dtl_indexes:
            batch_op.create_index(batch_op.f('ix_duck_trade_log_user_id'), ['user_id'], unique=False)

        try:
            batch_op.drop_constraint('fk_duck_trade_log_username_users', type_='foreignkey')
        except (ValueError, KeyError, Exception):
            pass
        batch_op.create_foreign_key(batch_op.f('fk_duck_trade_log_user_id_users'), 'users', ['user_id'], ['id'])

        dtl_cols_now = {c['name'] for c in sa.inspect(bind).get_columns('duck_trade_log')}
        if 'username' in dtl_cols_now:
            batch_op.drop_column('username')

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('duck_trade_log', schema=None) as batch_op:
        batch_op.add_column(sa.Column('username', sa.VARCHAR(length=80), nullable=False))
        batch_op.drop_constraint(batch_op.f('fk_duck_trade_log_user_id_users'), type_='foreignkey')
        batch_op.create_foreign_key(batch_op.f('fk_duck_trade_log_username_users'), 'users', ['username'], ['username'])
        batch_op.drop_index(batch_op.f('ix_duck_trade_log_user_id'))
        batch_op.create_index(batch_op.f('ix_duck_trade_log_username'), ['username'], unique=False)
        batch_op.drop_column('user_id')

    with op.batch_alter_table('challenge_logs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('username', sa.VARCHAR(length=100), nullable=False))
        batch_op.drop_constraint(batch_op.f('fk_challenge_logs_user_id_users'), type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_challenge_logs_user_id'))
        batch_op.create_index(batch_op.f('ix_challenge_logs_username'), ['username'], unique=False)
        batch_op.drop_column('user_id')

    op.create_table('bounties',
    sa.Column('id', sa.INTEGER(), nullable=False),
    sa.Column('user_id', sa.INTEGER(), nullable=False),
    sa.Column('description', sa.TEXT(), nullable=False),
    sa.Column('bounty', sa.VARCHAR(), nullable=False),
    sa.Column('expected_behavior', sa.TEXT(), nullable=True),
    sa.Column('timestamp', sa.DATETIME(), nullable=True),
    sa.Column('status', sa.VARCHAR(), nullable=True),
    sa.Column('image_path', sa.VARCHAR(length=255), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('trade',
    sa.Column('id', sa.INTEGER(), nullable=False),
    sa.Column('user_id', sa.INTEGER(), nullable=False),
    sa.Column('digital_ducks_traded', sa.INTEGER(), nullable=False),
    sa.Column('duck_breakdown', sqlite.JSON(), nullable=False),
    sa.Column('duck_type', sa.VARCHAR(length=4), nullable=False),
    sa.Column('timestamp', sa.DATETIME(), nullable=False),
    sa.Column('status', sa.VARCHAR(length=20), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###
