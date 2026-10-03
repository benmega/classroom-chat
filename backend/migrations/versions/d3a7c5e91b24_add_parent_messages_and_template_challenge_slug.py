"""add_parent_messages_and_template_challenge_slug

Creates the parent_messages table and adds the nullable challenge_slug column
to project_templates (links a project template to the Challenge that approval
of the project completes, used by the 3D modeling track).

Revision ID: d3a7c5e91b24
Revises: c1f8a29b4e31
Create Date: 2026-10-03 09:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'd3a7c5e91b24'
down_revision = 'c1f8a29b4e31'
branch_labels = None
depends_on = None


def _has_index(inspector, tname, iname):
    try:
        return any(idx["name"] == iname for idx in inspector.get_indexes(tname))
    except Exception:
        return False


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # --- parent_messages -------------------------------------------------
    if 'parent_messages' not in existing_tables:
        op.create_table('parent_messages',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('parent_id', sa.Integer(), nullable=False),
            sa.Column('subject', sa.String(length=255), nullable=True),
            sa.Column('body', sa.Text(), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('resolved_at', sa.DateTime(), nullable=True),
            sa.Column('resolved_by_id', sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(['parent_id'], ['users.id'], name=op.f('fk_parent_messages_parent_id_users'), ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['resolved_by_id'], ['users.id'], name=op.f('fk_parent_messages_resolved_by_id_users'), ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id', name=op.f('pk_parent_messages'))
        )

    inspector = sa.inspect(conn)
    with op.batch_alter_table('parent_messages', schema=None) as batch_op:
        if not _has_index(inspector, 'parent_messages', 'ix_parent_messages_parent_id'):
            batch_op.create_index(batch_op.f('ix_parent_messages_parent_id'), ['parent_id'], unique=False)
        if not _has_index(inspector, 'parent_messages', 'ix_parent_messages_status'):
            batch_op.create_index(batch_op.f('ix_parent_messages_status'), ['status'], unique=False)
        if not _has_index(inspector, 'parent_messages', 'ix_parent_messages_created_at'):
            batch_op.create_index(batch_op.f('ix_parent_messages_created_at'), ['created_at'], unique=False)

    # --- project_templates.challenge_slug --------------------------------
    if 'project_templates' in existing_tables:
        existing_cols = [c["name"] for c in inspector.get_columns("project_templates")]
        if 'challenge_slug' not in existing_cols:
            with op.batch_alter_table('project_templates', schema=None) as batch_op:
                batch_op.add_column(sa.Column('challenge_slug', sa.String(length=255), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'project_templates' in existing_tables:
        existing_cols = [c["name"] for c in inspector.get_columns("project_templates")]
        if 'challenge_slug' in existing_cols:
            with op.batch_alter_table('project_templates', schema=None) as batch_op:
                batch_op.drop_column('challenge_slug')

    if 'parent_messages' in existing_tables:
        with op.batch_alter_table('parent_messages', schema=None) as batch_op:
            if _has_index(inspector, 'parent_messages', 'ix_parent_messages_created_at'):
                batch_op.drop_index(batch_op.f('ix_parent_messages_created_at'))
            if _has_index(inspector, 'parent_messages', 'ix_parent_messages_status'):
                batch_op.drop_index(batch_op.f('ix_parent_messages_status'))
            if _has_index(inspector, 'parent_messages', 'ix_parent_messages_parent_id'):
                batch_op.drop_index(batch_op.f('ix_parent_messages_parent_id'))
        op.drop_table('parent_messages')
