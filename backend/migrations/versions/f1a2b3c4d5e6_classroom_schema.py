"""Add classroom schema: user_classrooms table and classroom_id columns

Revision ID: f1a2b3c4d5e6
Revises: ea3252195b40
Create Date: 2026-06-12

────────────────────────────────────────────────────────────────────────────
WHY THIS MIGRATION EXISTS
────────────────────────────────────────────────────────────────────────────
Prior to this revision the classroom schema (user_classrooms join table plus
the classroom_id / is_locked / slow_mode_delay columns on conversations and
challenges) was created by a raw-SQL script called tools/migrate_classroom.py.
That script bypassed Alembic entirely, meaning:

  • Alembic had no record of those tables/columns.
  • `flask db migrate` would occasionally generate spurious DROP statements.
  • There was no downgrade path.

This migration absorbs all DDL from that script so the full schema history
lives in one place.

DATA SEEDING (global/archive classrooms, retroactive enrolments, etc.) is
intentionally NOT here.  Data seeding belongs in tools/migrate_classroom.py,
which is called by deploy.sh AFTER `flask db upgrade` completes.

────────────────────────────────────────────────────────────────────────────
FOR FUTURE DEVELOPERS
────────────────────────────────────────────────────────────────────────────
• Never put raw ALTER TABLE / CREATE TABLE calls in tools/ scripts.
  Always create a new Alembic revision instead:

      cd backend
      flask db migrate -m "your description here"
      # then edit the generated file and add existence guards like the ones
      # below if you need the migration to be idempotent on prod.

• Data seeding (INSERT rows, backfills) is fine in tools/migrate_classroom.py
  or a dedicated seed script — just never DDL there.

• Every DDL operation in this file is guarded with an inspector check so the
  migration is idempotent — safe to run against a database that was built by
  db.create_all() from the current models (which is how the prod DB was
  originally created).
"""
from alembic import op
import sqlalchemy as sa

# ---------------------------------------------------------------------------
# Alembic revision chain
# ---------------------------------------------------------------------------
revision = 'f1a2b3c4d5e6'
down_revision = 'ea3252195b40'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # ── 1. user_classrooms (join table) ─────────────────────────────────────
    # Many-to-many between users and classrooms.  The model defines this in
    # classroom.py via db.Table("user_classrooms", ...).
    if 'user_classrooms' not in existing_tables:
        op.create_table(
            'user_classrooms',
            sa.Column(
                'user_id',
                sa.Integer(),
                sa.ForeignKey('users.id', ondelete='CASCADE'),
                nullable=False,
                primary_key=True,
            ),
            sa.Column(
                'classroom_id',
                sa.String(length=64),
                sa.ForeignKey('classrooms.id', ondelete='CASCADE'),
                nullable=False,
                primary_key=True,
            ),
            sa.Column(
                'enrolled_at',
                sa.DateTime(),
                nullable=False,
                server_default=sa.text('CURRENT_TIMESTAMP'),
            ),
        )
    # else: table already exists (db.create_all() built it from the model) — skip.

    # ── 2. challenges.classroom_id ──────────────────────────────────────────
    # Links a challenge to a specific classroom so that per-classroom challenge
    # sets are possible.  Nullable so global/unassigned challenges still work.
    if 'challenges' in existing_tables:
        ch_cols = {c['name'] for c in inspector.get_columns('challenges')}
        if 'classroom_id' not in ch_cols:
            with op.batch_alter_table('challenges', schema=None) as batch_op:
                batch_op.add_column(
                    sa.Column('classroom_id', sa.String(length=64), nullable=True)
                )
                # Foreign key added separately; SQLite batch mode handles this
                # during the table rebuild that batch_alter_table performs.
                batch_op.create_foreign_key(
                    'fk_challenges_classroom_id_classrooms',
                    'classrooms',
                    ['classroom_id'],
                    ['id'],
                    ondelete='SET NULL',
                )
        # else: column already present — skip.

    # ── 3. conversations.classroom_id ───────────────────────────────────────
    # Every conversation must belong to a classroom (or 'archive' for orphans).
    # NOT NULL is enforced at the ORM level; SQLite requires a table rebuild to
    # add a NOT NULL constraint to an existing column, which we defer to avoid
    # data risk.  The model already declares nullable=False so SQLAlchemy will
    # enforce this at write time.
    if 'conversations' in existing_tables:
        conv_cols = {c['name'] for c in inspector.get_columns('conversations')}
        needs_batch = (
            'classroom_id' not in conv_cols
            or 'is_locked' not in conv_cols
            or 'slow_mode_delay' not in conv_cols
        )
        if needs_batch:
            with op.batch_alter_table('conversations', schema=None) as batch_op:
                if 'classroom_id' not in conv_cols:
                    batch_op.add_column(
                        sa.Column('classroom_id', sa.String(length=64), nullable=True)
                    )
                    batch_op.create_foreign_key(
                        'fk_conversations_classroom_id_classrooms',
                        'classrooms',
                        ['classroom_id'],
                        ['id'],
                        ondelete='RESTRICT',
                    )
                if 'is_locked' not in conv_cols:
                    # Whether the conversation is read-only for non-admins.
                    batch_op.add_column(
                        sa.Column(
                            'is_locked',
                            sa.Boolean(),
                            nullable=True,
                            server_default=sa.text('0'),
                        )
                    )
                if 'slow_mode_delay' not in conv_cols:
                    # Minimum seconds between messages per user (0 = disabled).
                    batch_op.add_column(
                        sa.Column(
                            'slow_mode_delay',
                            sa.Integer(),
                            nullable=True,
                            server_default=sa.text('0'),
                        )
                    )
        # else: all three columns already exist — skip.


def downgrade():
    """
    Reverting classroom schema is intentionally partial.

    • user_classrooms is safe to drop — it is a pure join table with no
      business data beyond what can be reconstructed.
    • Dropping classroom_id from challenges / conversations is not done here
      because SQLite does not support DROP COLUMN without a full table rebuild,
      and doing that rebuild risks data loss.  If you need a clean downgrade on
      PostgreSQL, add the batch_alter_table DROP COLUMN calls below.

    In practice you should never need to downgrade past this revision on prod.
    """
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if 'user_classrooms' in existing_tables:
        op.drop_table('user_classrooms')

    # NOTE: classroom_id, is_locked, slow_mode_delay column drops omitted.
    # See docstring above.
