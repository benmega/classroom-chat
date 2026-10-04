"""add_project_template_id

Adds the nullable projects.template_id foreign key (-> project_templates.id,
ON DELETE SET NULL, indexed) so a project keeps its link to the template it was
built from even when the student renames it. Approval of a template-linked
project uses this to complete the template's linked Challenge.

Existing projects whose name exactly equals a template name are backfilled.

Revision ID: e5b2d84f6a17
Revises: d3a7c5e91b24
Create Date: 2026-10-03 12:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'e5b2d84f6a17'
down_revision = 'd3a7c5e91b24'
branch_labels = None
depends_on = None

_FK_NAME = 'fk_projects_template_id_project_templates'
_IX_NAME = 'ix_projects_template_id'


def _has_index(inspector, tname, iname):
    try:
        return any(idx["name"] == iname for idx in inspector.get_indexes(tname))
    except Exception:
        return False


def backfill_template_ids(conn):
    """Link projects to the template whose name exactly equals the project name."""
    conn.execute(
        sa.text(
            "UPDATE projects SET template_id = ("
            "SELECT pt.id FROM project_templates pt WHERE pt.name = projects.name"
            ") WHERE template_id IS NULL "
            "AND name IN (SELECT name FROM project_templates)"
        )
    )


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    if 'projects' not in existing_tables:
        return

    existing_cols = [c["name"] for c in inspector.get_columns("projects")]
    if 'template_id' not in existing_cols:
        with op.batch_alter_table('projects', schema=None) as batch_op:
            batch_op.add_column(sa.Column('template_id', sa.Integer(), nullable=True))
            if 'project_templates' in existing_tables:
                batch_op.create_foreign_key(
                    op.f(_FK_NAME),
                    'project_templates',
                    ['template_id'],
                    ['id'],
                    ondelete='SET NULL',
                )

    inspector = sa.inspect(conn)
    if not _has_index(inspector, 'projects', _IX_NAME):
        with op.batch_alter_table('projects', schema=None) as batch_op:
            batch_op.create_index(batch_op.f(_IX_NAME), ['template_id'], unique=False)

    if 'project_templates' in existing_tables:
        backfill_template_ids(conn)


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'projects' not in inspector.get_table_names():
        return

    existing_cols = [c["name"] for c in inspector.get_columns("projects")]
    if 'template_id' not in existing_cols:
        return

    fk_names = [
        fk["name"]
        for fk in inspector.get_foreign_keys("projects")
        if fk.get("constrained_columns") == ['template_id'] and fk.get("name")
    ]
    has_index = _has_index(inspector, 'projects', _IX_NAME)

    with op.batch_alter_table('projects', schema=None) as batch_op:
        if has_index:
            batch_op.drop_index(batch_op.f(_IX_NAME))
        for fk_name in fk_names:
            batch_op.drop_constraint(fk_name, type_='foreignkey')
        batch_op.drop_column('template_id')
