"""Initial migration from prod schema to current models

Revision ID: 3a10e78a7fd0
Revises:
Create Date: 2026-05-16 10:00:00.000000

Hand-written migration reflecting the true diff between the legacy
production database (pre-Alembic) and the current SQLAlchemy models.

Tables that exist in prod but have NO corresponding model and are
intentionally left untouched (legacy data):
  - bounties, trade, courses

Tables fully managed by models that are already schema-correct in prod
and need no column changes:
  - ai_settings, banned_words, challenge_logs, configuration,
    conversation_users, course_instances, duck_trade_log,
    duck_transactions, messages, notes, projects, session_logs,
    skills, user_achievement, user_certificate, user_classrooms
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3a10e78a7fd0'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # -------------------------------------------------------------------------
    # conversations
    # Prod has: id, title, created_at
    # Model wants: id, title, creator_id, classroom_id, is_locked,
    #              slow_mode_delay, created_at
    # -------------------------------------------------------------------------
    with op.batch_alter_table('conversations', schema=None) as batch_op:
        batch_op.add_column(sa.Column(
            'creator_id',
            sa.Integer(),
            sa.ForeignKey('users.id', ondelete='SET NULL'),
            nullable=True,
        ))
        batch_op.add_column(sa.Column(
            'classroom_id',
            sa.String(length=64),
            nullable=True,  # nullable during migration; data may be empty
        ))
        batch_op.add_column(sa.Column(
            'is_locked',
            sa.Boolean(),
            nullable=True,
            server_default=sa.text('0'),
        ))
        batch_op.add_column(sa.Column(
            'slow_mode_delay',
            sa.Integer(),
            nullable=True,
            server_default=sa.text('0'),
        ))

    # -------------------------------------------------------------------------
    # challenges
    # Prod has: id, name, slug, domain, course_id, description, difficulty,
    #           value, is_active, created_at
    # Model wants: all of above + classroom_id
    # -------------------------------------------------------------------------
    with op.batch_alter_table('challenges', schema=None) as batch_op:
        batch_op.add_column(sa.Column(
            'classroom_id',
            sa.String(length=64),
            nullable=True,
        ))
        batch_op.create_unique_constraint('uq_challenges_name', ['name'])
        batch_op.create_unique_constraint('uq_challenges_slug', ['slug'])

    # -------------------------------------------------------------------------
    # users
    # Prod has: id, username, password_hash, profile_picture, ip_address,
    #           is_online, ducks, nickname, earned_ducks, duck_balance,
    #           packets, last_daily_duck, is_admin, slug
    # Model wants: all above except 'ducks', plus bio, created_at,
    #              is_approved, last_achievement_evaluation
    #              Also: earned_ducks/duck_balance → Double, last_daily_duck → Date
    # -------------------------------------------------------------------------
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column(
            'bio',
            sa.String(length=500),
            nullable=True,
        ))
        batch_op.add_column(sa.Column(
            'created_at',
            sa.DateTime(),
            nullable=True,
        ))
        batch_op.add_column(sa.Column(
            'is_approved',
            sa.Boolean(),
            nullable=True,
            server_default=sa.text('0'),
        ))
        batch_op.add_column(sa.Column(
            'last_achievement_evaluation',
            sa.DateTime(),
            nullable=True,
        ))
        batch_op.alter_column(
            'password_hash',
            existing_type=sa.VARCHAR(length=128),
            type_=sa.String(length=200),
            existing_nullable=False,
        )
        batch_op.alter_column(
            'nickname',
            existing_type=sa.TEXT(),
            type_=sa.String(length=50),
            nullable=False,
            existing_server_default=sa.text('(NULL)'),
        )
        batch_op.alter_column(
            'slug',
            existing_type=sa.TEXT(),
            type_=sa.String(length=100),
            existing_nullable=True,
        )
        batch_op.alter_column(
            'earned_ducks',
            existing_type=sa.INTEGER(),
            type_=sa.Double(),
            nullable=False,
            existing_server_default=sa.text('0'),
        )
        batch_op.alter_column(
            'duck_balance',
            existing_type=sa.INTEGER(),
            type_=sa.Double(),
            nullable=False,
            existing_server_default=sa.text('0'),
        )
        batch_op.alter_column(
            'last_daily_duck',
            existing_type=sa.DATETIME(),
            type_=sa.Date(),
            existing_nullable=True,
        )
        batch_op.drop_column('ducks')
        batch_op.create_unique_constraint('uq_users_username', ['username'])
        batch_op.create_unique_constraint('uq_users_slug', ['slug'])

    # -------------------------------------------------------------------------
    # achievement
    # Prod has: id, slug, name, description, type, requirement_value,
    #           reward, source, icon_class
    # Model wants: above minus icon_class; source as String(255)
    # -------------------------------------------------------------------------
    with op.batch_alter_table('achievement', schema=None) as batch_op:
        batch_op.alter_column(
            'reward',
            existing_type=sa.INTEGER(),
            nullable=False,
            existing_server_default=sa.text('1'),
        )
        batch_op.alter_column(
            'source',
            existing_type=sa.TEXT(),
            type_=sa.String(length=255),
            existing_nullable=True,
        )
        batch_op.create_unique_constraint('uq_achievement_slug', ['slug'])
        batch_op.drop_column('icon_class')

    # -------------------------------------------------------------------------
    # banned_words — add unique constraint on word
    # -------------------------------------------------------------------------
    with op.batch_alter_table('banned_words', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_banned_words_word', ['word'])

    # -------------------------------------------------------------------------
    # challenge_logs — add indexes
    # -------------------------------------------------------------------------
    with op.batch_alter_table('challenge_logs', schema=None) as batch_op:
        batch_op.alter_column(
            'helper',
            existing_type=sa.TEXT(),
            type_=sa.String(length=100),
            existing_nullable=True,
        )
        batch_op.create_index('ix_challenge_logs_timestamp', ['timestamp'], unique=False)
        batch_op.create_index('ix_challenge_logs_username', ['username'], unique=False)

    # -------------------------------------------------------------------------
    # classrooms — tighten nullability
    # -------------------------------------------------------------------------
    with op.batch_alter_table('classrooms', schema=None) as batch_op:
        batch_op.alter_column(
            'id',
            existing_type=sa.VARCHAR(length=64),
            nullable=False,
        )
        batch_op.alter_column(
            'created_at',
            existing_type=sa.DATETIME(),
            nullable=False,
            existing_server_default=sa.text('(CURRENT_TIMESTAMP)'),
        )

    # -------------------------------------------------------------------------
    # configuration — duck_multiplier → Float
    # -------------------------------------------------------------------------
    with op.batch_alter_table('configuration', schema=None) as batch_op:
        batch_op.alter_column(
            'duck_multiplier',
            existing_type=sa.INTEGER(),
            type_=sa.Float(),
            existing_nullable=True,
            existing_server_default=sa.text('1'),
        )

    # -------------------------------------------------------------------------
    # course_instances — type normalisation
    # -------------------------------------------------------------------------
    with op.batch_alter_table('course_instances', schema=None) as batch_op:
        batch_op.alter_column(
            'id',
            existing_type=sa.TEXT(),
            type_=sa.String(length=64),
            nullable=False,
        )
        batch_op.alter_column(
            'classroom_id',
            existing_type=sa.TEXT(),
            type_=sa.String(length=64),
            existing_nullable=False,
        )
        batch_op.alter_column(
            'course_id',
            existing_type=sa.TEXT(),
            type_=sa.String(length=64),
            existing_nullable=True,
        )

    # -------------------------------------------------------------------------
    # duck_trade_log — add indexes
    # -------------------------------------------------------------------------
    with op.batch_alter_table('duck_trade_log', schema=None) as batch_op:
        batch_op.create_index('ix_duck_trade_log_status', ['status'], unique=False)
        batch_op.create_index('ix_duck_trade_log_timestamp', ['timestamp'], unique=False)
        batch_op.create_index('ix_duck_trade_log_username', ['username'], unique=False)

    # -------------------------------------------------------------------------
    # messages — add indexes
    # -------------------------------------------------------------------------
    with op.batch_alter_table('messages', schema=None) as batch_op:
        batch_op.create_index('ix_messages_conversation_id', ['conversation_id'], unique=False)
        batch_op.create_index('ix_messages_created_at', ['created_at'], unique=False)
        batch_op.create_index('ix_messages_user_id', ['user_id'], unique=False)

    # -------------------------------------------------------------------------
    # notes — type normalisation
    # -------------------------------------------------------------------------
    with op.batch_alter_table('notes', schema=None) as batch_op:
        batch_op.alter_column(
            'id',
            existing_type=sa.INTEGER(),
            nullable=False,
            autoincrement=True,
        )
        batch_op.alter_column(
            'filename',
            existing_type=sa.TEXT(),
            type_=sa.String(length=255),
            existing_nullable=False,
        )

    # -------------------------------------------------------------------------
    # session_logs — add index
    # -------------------------------------------------------------------------
    with op.batch_alter_table('session_logs', schema=None) as batch_op:
        batch_op.create_index('ix_session_logs_user_id', ['user_id'], unique=False)

    # -------------------------------------------------------------------------
    # skills — add unique constraint
    # -------------------------------------------------------------------------
    with op.batch_alter_table('skills', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_skill_name_user', ['name', 'user_id'])

    # -------------------------------------------------------------------------
    # user_achievement — add indexes and unique constraint
    # -------------------------------------------------------------------------
    with op.batch_alter_table('user_achievement', schema=None) as batch_op:
        batch_op.create_index('ix_user_achievement_achievement_id', ['achievement_id'], unique=False)
        batch_op.create_index('ix_user_achievement_user_id', ['user_id'], unique=False)
        batch_op.create_unique_constraint('uq_user_achievement_user_id', ['user_id', 'achievement_id'])

    # -------------------------------------------------------------------------
    # user_certificate — type and constraint normalisation
    # -------------------------------------------------------------------------
    with op.batch_alter_table('user_certificate', schema=None) as batch_op:
        batch_op.alter_column(
            'file_path',
            existing_type=sa.TEXT(),
            type_=sa.String(length=256),
            existing_nullable=True,
        )
        batch_op.alter_column(
            'reviewed',
            existing_type=sa.INTEGER(),
            type_=sa.Boolean(),
            existing_nullable=True,
            existing_server_default=sa.text('0'),
        )
        batch_op.create_unique_constraint('uq_user_certificate_user_id', ['user_id', 'achievement_id'])


def downgrade():
    # -------------------------------------------------------------------------
    # user_certificate
    # -------------------------------------------------------------------------
    with op.batch_alter_table('user_certificate', schema=None) as batch_op:
        batch_op.drop_constraint('uq_user_certificate_user_id', type_='unique')
        batch_op.alter_column(
            'reviewed',
            existing_type=sa.Boolean(),
            type_=sa.INTEGER(),
            existing_nullable=True,
            existing_server_default=sa.text('0'),
        )
        batch_op.alter_column(
            'file_path',
            existing_type=sa.String(length=256),
            type_=sa.TEXT(),
            existing_nullable=True,
        )

    # -------------------------------------------------------------------------
    # user_achievement
    # -------------------------------------------------------------------------
    with op.batch_alter_table('user_achievement', schema=None) as batch_op:
        batch_op.drop_constraint('uq_user_achievement_user_id', type_='unique')
        batch_op.drop_index('ix_user_achievement_user_id')
        batch_op.drop_index('ix_user_achievement_achievement_id')

    # -------------------------------------------------------------------------
    # skills
    # -------------------------------------------------------------------------
    with op.batch_alter_table('skills', schema=None) as batch_op:
        batch_op.drop_constraint('uq_skill_name_user', type_='unique')

    # -------------------------------------------------------------------------
    # session_logs
    # -------------------------------------------------------------------------
    with op.batch_alter_table('session_logs', schema=None) as batch_op:
        batch_op.drop_index('ix_session_logs_user_id')

    # -------------------------------------------------------------------------
    # notes
    # -------------------------------------------------------------------------
    with op.batch_alter_table('notes', schema=None) as batch_op:
        batch_op.alter_column(
            'filename',
            existing_type=sa.String(length=255),
            type_=sa.TEXT(),
            existing_nullable=False,
        )
        batch_op.alter_column(
            'id',
            existing_type=sa.INTEGER(),
            nullable=True,
            autoincrement=True,
        )

    # -------------------------------------------------------------------------
    # messages
    # -------------------------------------------------------------------------
    with op.batch_alter_table('messages', schema=None) as batch_op:
        batch_op.drop_index('ix_messages_user_id')
        batch_op.drop_index('ix_messages_created_at')
        batch_op.drop_index('ix_messages_conversation_id')

    # -------------------------------------------------------------------------
    # duck_trade_log
    # -------------------------------------------------------------------------
    with op.batch_alter_table('duck_trade_log', schema=None) as batch_op:
        batch_op.drop_index('ix_duck_trade_log_username')
        batch_op.drop_index('ix_duck_trade_log_timestamp')
        batch_op.drop_index('ix_duck_trade_log_status')

    # -------------------------------------------------------------------------
    # course_instances
    # -------------------------------------------------------------------------
    with op.batch_alter_table('course_instances', schema=None) as batch_op:
        batch_op.alter_column(
            'course_id',
            existing_type=sa.String(length=64),
            type_=sa.TEXT(),
            existing_nullable=True,
        )
        batch_op.alter_column(
            'classroom_id',
            existing_type=sa.String(length=64),
            type_=sa.TEXT(),
            existing_nullable=False,
        )
        batch_op.alter_column(
            'id',
            existing_type=sa.String(length=64),
            type_=sa.TEXT(),
            nullable=True,
        )

    # -------------------------------------------------------------------------
    # configuration
    # -------------------------------------------------------------------------
    with op.batch_alter_table('configuration', schema=None) as batch_op:
        batch_op.alter_column(
            'duck_multiplier',
            existing_type=sa.Float(),
            type_=sa.INTEGER(),
            existing_nullable=True,
            existing_server_default=sa.text('1'),
        )

    # -------------------------------------------------------------------------
    # classrooms
    # -------------------------------------------------------------------------
    with op.batch_alter_table('classrooms', schema=None) as batch_op:
        batch_op.alter_column(
            'created_at',
            existing_type=sa.DATETIME(),
            nullable=True,
            existing_server_default=sa.text('(CURRENT_TIMESTAMP)'),
        )
        batch_op.alter_column(
            'id',
            existing_type=sa.VARCHAR(length=64),
            nullable=True,
        )

    # -------------------------------------------------------------------------
    # challenge_logs
    # -------------------------------------------------------------------------
    with op.batch_alter_table('challenge_logs', schema=None) as batch_op:
        batch_op.drop_index('ix_challenge_logs_username')
        batch_op.drop_index('ix_challenge_logs_timestamp')
        batch_op.alter_column(
            'helper',
            existing_type=sa.String(length=100),
            type_=sa.TEXT(),
            existing_nullable=True,
        )

    # -------------------------------------------------------------------------
    # banned_words
    # -------------------------------------------------------------------------
    with op.batch_alter_table('banned_words', schema=None) as batch_op:
        batch_op.drop_constraint('uq_banned_words_word', type_='unique')

    # -------------------------------------------------------------------------
    # achievement
    # -------------------------------------------------------------------------
    with op.batch_alter_table('achievement', schema=None) as batch_op:
        batch_op.add_column(sa.Column('icon_class', sa.VARCHAR(length=50), nullable=True))
        batch_op.drop_constraint('uq_achievement_slug', type_='unique')
        batch_op.alter_column(
            'source',
            existing_type=sa.String(length=255),
            type_=sa.TEXT(),
            existing_nullable=True,
        )
        batch_op.alter_column(
            'reward',
            existing_type=sa.INTEGER(),
            nullable=True,
            existing_server_default=sa.text('1'),
        )

    # -------------------------------------------------------------------------
    # users
    # -------------------------------------------------------------------------
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('ducks', sa.INTEGER(), nullable=True))
        batch_op.drop_constraint('uq_users_slug', type_='unique')
        batch_op.drop_constraint('uq_users_username', type_='unique')
        batch_op.drop_column('last_achievement_evaluation')
        batch_op.drop_column('is_approved')
        batch_op.drop_column('created_at')
        batch_op.drop_column('bio')
        batch_op.alter_column(
            'last_daily_duck',
            existing_type=sa.Date(),
            type_=sa.DATETIME(),
            existing_nullable=True,
        )
        batch_op.alter_column(
            'duck_balance',
            existing_type=sa.Double(),
            type_=sa.INTEGER(),
            nullable=True,
            existing_server_default=sa.text('0'),
        )
        batch_op.alter_column(
            'earned_ducks',
            existing_type=sa.Double(),
            type_=sa.INTEGER(),
            nullable=True,
            existing_server_default=sa.text('0'),
        )
        batch_op.alter_column(
            'slug',
            existing_type=sa.String(length=100),
            type_=sa.TEXT(),
            existing_nullable=True,
        )
        batch_op.alter_column(
            'nickname',
            existing_type=sa.String(length=50),
            type_=sa.TEXT(),
            nullable=True,
            existing_server_default=sa.text('(NULL)'),
        )
        batch_op.alter_column(
            'password_hash',
            existing_type=sa.String(length=200),
            type_=sa.VARCHAR(length=128),
            existing_nullable=False,
        )

    # -------------------------------------------------------------------------
    # challenges
    # -------------------------------------------------------------------------
    with op.batch_alter_table('challenges', schema=None) as batch_op:
        batch_op.drop_constraint('uq_challenges_slug', type_='unique')
        batch_op.drop_constraint('uq_challenges_name', type_='unique')
        batch_op.drop_column('classroom_id')

    # -------------------------------------------------------------------------
    # conversations
    # -------------------------------------------------------------------------
    with op.batch_alter_table('conversations', schema=None) as batch_op:
        batch_op.drop_column('slow_mode_delay')
        batch_op.drop_column('is_locked')
        batch_op.drop_column('classroom_id')
        batch_op.drop_column('creator_id')
