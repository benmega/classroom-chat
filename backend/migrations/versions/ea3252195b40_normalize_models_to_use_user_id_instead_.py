"""Normalize models to use user_id instead of username

Revision ID: ea3252195b40
Revises: a1b2c3d4e5f6
Create Date: 2026-06-10 12:54:08.498310

────────────────────────────────────────────────────────────────────────────
DESIGN NOTES FOR FUTURE DEVELOPERS
────────────────────────────────────────────────────────────────────────────
This migration replaces the 'username' foreign key (a string) with 'user_id'
(an integer FK) on challenge_logs and duck_trade_log.

Key rules that make this migration safe on any database state:

1.  TOP-LEVEL SCHEMA CHECK before entering batch_alter_table.
    We check whether 'username' exists on the table.  If it does not, the
    table is already on the new schema and we skip it entirely.  This means
    the migration is a no-op on databases that were created by db.create_all()
    from the current models (which already have user_id, no username).

2.  NO CONDITIONAL LOGIC INSIDE batch_alter_table.
    Operations inside a batch_alter_table context are *buffered* — they are
    not executed until the context exits (flush).  Any exception is raised
    during flush(), NOT during the individual add_column / drop_index call.
    This means try/except blocks around individual batch_op calls are useless
    and will never catch anything.  Instead, inspect the schema BEFORE entering
    the context and only include operations you know will succeed.

3.  SQLite table rebuild makes explicit FK drops unnecessary.
    batch_alter_table on SQLite works by creating a new table, copying data,
    and dropping the old one.  Old unnamed/implicit FK constraints disappear
    automatically during the rebuild.  There is no need to call
    drop_constraint() for the old username FK.

4.  NULL cleanup runs BEFORE alter_column(nullable=False).
    batch_alter_table rebuilds the table with the new constraint, which means
    SQLite does an internal INSERT SELECT.  Any NULL in a NOT NULL column will
    fail that INSERT.  Always DELETE nulls before the batch that enforces NOT NULL.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# ---------------------------------------------------------------------------
# Alembic revision chain
# ---------------------------------------------------------------------------
revision = 'ea3252195b40'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # ── Clean up orphaned temp tables from any previous failed run ───────────
    # SQLite batch_alter_table creates _alembic_tmp_<table> and renames it at
    # the end.  A crash between CREATE and RENAME leaves a ghost table that
    # blocks every subsequent attempt.  Dropping it here makes the migration
    # re-entrant with no manual server intervention required.
    for orphan in ('_alembic_tmp_challenge_logs', '_alembic_tmp_duck_trade_log'):
        if orphan in existing_tables:
            bind.execute(sa.text(f'DROP TABLE "{orphan}"'))

    # ── Drop legacy tables (were removed from models) ────────────────────────
    if 'trade' in existing_tables:
        op.drop_table('trade')
    if 'bounties' in existing_tables:
        op.drop_table('bounties')

    # ── challenge_logs ────────────────────────────────────────────────────────
    cl_cols = {c['name'] for c in inspector.get_columns('challenge_logs')}

    if 'username' not in cl_cols:
        # Schema already has user_id and no username column — nothing to do.
        # This is the case for any DB created from the current models.
        print("challenge_logs: already on new schema, skipping.")
    else:
        # Old schema detected: username column present, user_id absent.
        # Step 1: add user_id as nullable
        with op.batch_alter_table('challenge_logs', schema=None) as batch_op:
            batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=True))

        # Step 2: back-fill user_id from the username column
        op.execute(
            "UPDATE challenge_logs "
            "SET user_id = (SELECT id FROM users "
            "               WHERE LOWER(users.username) = LOWER(challenge_logs.username))"
        )

        # Step 3: purge rows that had no matching user (orphans)
        op.execute("DELETE FROM challenge_logs WHERE user_id IS NULL")

        # Step 4: rebuild table — enforce NOT NULL, add index + FK, drop username.
        # All operations in this context are known to be safe:
        #   • user_id is non-null (purged above)
        #   • ix_challenge_logs_user_id does not exist (we just added the column)
        #   • username column exists (we checked above)
        #   • Old FK on username disappears automatically during the table rebuild.
        with op.batch_alter_table('challenge_logs', schema=None) as batch_op:
            batch_op.alter_column('user_id', existing_type=sa.Integer(), nullable=False)
            batch_op.create_index(
                batch_op.f('ix_challenge_logs_user_id'), ['user_id'], unique=False
            )
            batch_op.create_foreign_key(
                batch_op.f('fk_challenge_logs_user_id_users'),
                'users', ['user_id'], ['id'],
            )
            batch_op.drop_column('username')

    # ── duck_trade_log ────────────────────────────────────────────────────────
    # Re-inspect: the challenge_logs batch may have refreshed the connection state.
    dtl_cols = {c['name'] for c in sa.inspect(bind).get_columns('duck_trade_log')}

    if 'username' not in dtl_cols:
        print("duck_trade_log: already on new schema, skipping.")
    else:
        # Step 1: add user_id as nullable
        with op.batch_alter_table('duck_trade_log', schema=None) as batch_op:
            batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=True))

        # Step 2: back-fill
        op.execute(
            "UPDATE duck_trade_log "
            "SET user_id = (SELECT id FROM users "
            "               WHERE LOWER(users.username) = LOWER(duck_trade_log.username))"
        )

        # Step 3: purge orphans
        op.execute("DELETE FROM duck_trade_log WHERE user_id IS NULL")

        # Step 4: rebuild table
        with op.batch_alter_table('duck_trade_log', schema=None) as batch_op:
            batch_op.alter_column('user_id', existing_type=sa.Integer(), nullable=False)
            batch_op.create_index(
                batch_op.f('ix_duck_trade_log_user_id'), ['user_id'], unique=False
            )
            batch_op.create_foreign_key(
                batch_op.f('fk_duck_trade_log_user_id_users'),
                'users', ['user_id'], ['id'],
            )
            batch_op.drop_column('username')


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
