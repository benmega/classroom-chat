"""drop_orphaned_conversations_tables

Revision ID: a9f2e1d4b823
Revises: f88dd28bd832
Create Date: 2026-06-19 16:44:00.000000

The conversations and conversation_users tables were created by the
social_feed_architecture migration (6ed31261661c) but the corresponding
SQLAlchemy models were subsequently removed from the codebase.

This migration drops the now-orphaned tables so that `flask db check`
no longer reports pending upgrade operations.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a9f2e1d4b823'
down_revision = 'f88dd28bd832'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # conversation_users must be dropped before conversations (FK dependency).
    if 'conversation_users' in existing_tables:
        op.drop_table('conversation_users')

    if 'conversations' in existing_tables:
        op.drop_table('conversations')


def downgrade():
    # Restore the tables as they were defined in the social_feed migration.
    op.create_table(
        'conversations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=100), nullable=False),
        sa.Column('creator_id', sa.Integer(), nullable=True),
        sa.Column('classroom_id', sa.String(length=64), nullable=False),
        sa.Column('is_locked', sa.Boolean(), nullable=True),
        sa.Column('slow_mode_delay', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['classroom_id'], ['classrooms.id'],
                                name=op.f('fk_conversations_classroom_id_classrooms'),
                                ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'],
                                name=op.f('fk_conversations_creator_id_users'),
                                ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_conversations')),
    )
    op.create_table(
        'conversation_users',
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'],
                                name=op.f('fk_conversation_users_conversation_id_conversations'),
                                ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'],
                                name=op.f('fk_conversation_users_user_id_users'),
                                ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('conversation_id', 'user_id',
                                name=op.f('pk_conversation_users')),
    )
