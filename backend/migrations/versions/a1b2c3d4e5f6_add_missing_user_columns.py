"""Add missing user columns to bring prod up to date

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-06-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


revision = 'a1b2c3d4e5f6'
down_revision = '3a10e78a7fd0'
branch_labels = None
depends_on = None


def _existing_columns(table_name):
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    return {c['name'] for c in inspector.get_columns(table_name)}


def upgrade():
    existing = _existing_columns('users')

    with op.batch_alter_table('users', schema=None) as batch_op:
        if 'role' not in existing:
            batch_op.add_column(sa.Column('role', sa.String(length=20), nullable=True))
        if 'email' not in existing:
            batch_op.add_column(sa.Column('email', sa.String(length=120), nullable=True))
        if 'cognito_sub' not in existing:
            batch_op.add_column(sa.Column('cognito_sub', sa.String(length=50), nullable=True))
        if 'has_seen_tutorial' not in existing:
            batch_op.add_column(sa.Column('has_seen_tutorial', sa.Boolean(), nullable=True))
        if 'connection_code' not in existing:
            batch_op.add_column(sa.Column('connection_code', sa.String(length=10), nullable=True))
        if 'has_chat_font' not in existing:
            batch_op.add_column(sa.Column('has_chat_font', sa.Boolean(), nullable=True))
        if 'chat_font_color' not in existing:
            batch_op.add_column(sa.Column('chat_font_color', sa.String(length=7), nullable=True))
        if 'has_animated_border' not in existing:
            batch_op.add_column(sa.Column('has_animated_border', sa.Boolean(), nullable=True))
        if 'has_auto_bitshift' not in existing:
            batch_op.add_column(sa.Column('has_auto_bitshift', sa.Boolean(), nullable=True))
        if 'has_custom_wallpaper' not in existing:
            batch_op.add_column(sa.Column('has_custom_wallpaper', sa.Boolean(), nullable=True))
        if 'profile_wallpaper' not in existing:
            batch_op.add_column(sa.Column('profile_wallpaper', sa.String(length=255), nullable=True))
        if 'has_auto_claimer' not in existing:
            batch_op.add_column(sa.Column('has_auto_claimer', sa.Boolean(), nullable=True))

    # Backfill safe defaults for newly added columns
    bind = op.get_bind()
    new_cols = {
        'role': "'student'",
        'has_seen_tutorial': '0',
        'has_chat_font': '0',
        'has_animated_border': '0',
        'has_auto_bitshift': '0',
        'has_custom_wallpaper': '0',
        'has_auto_claimer': '0',
    }
    for col, default in new_cols.items():
        if col not in existing:
            bind.execute(sa.text(f"UPDATE users SET {col} = {default} WHERE {col} IS NULL"))


def downgrade():
    # Removing columns in SQLite requires a full table rebuild; skip for safety.
    pass
