"""remove_challenge_in_progress_suffix

Revision ID: 114833c64c05
Revises: cb217f4b8c0a
Create Date: 2026-07-04 14:57:15.792171

"""

from alembic import op
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = "114833c64c05"
down_revision = "cb217f4b8c0a"
branch_labels = None
depends_on = None


def _existing_unique_constraints(table_name):
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    return {c["name"] for c in inspector.get_unique_constraints(table_name)}


def upgrade():
    existing_uqs = _existing_unique_constraints("challenges")

    # 1. Drop the old single-column unique constraint
    if "uq_challenges_name" in existing_uqs:
        with op.batch_alter_table("challenges", schema=None) as batch_op:
            batch_op.drop_constraint("uq_challenges_name", type_="unique")

    # 2. Strip " - In Progress" suffix from challenge names
    op.execute(
        "UPDATE challenges SET name = SUBSTR(name, 1, LENGTH(name) - 14) WHERE name LIKE '% - In Progress'"
    )

    # 3. Add the new composite unique constraint
    if "uq_challenges_name_domain" not in existing_uqs:
        with op.batch_alter_table("challenges", schema=None) as batch_op:
            batch_op.create_unique_constraint(
                "uq_challenges_name_domain", ["name", "domain"]
            )


def downgrade():
    # Drop composite unique constraint
    with op.batch_alter_table("challenges", schema=None) as batch_op:
        batch_op.drop_constraint("uq_challenges_name_domain", type_="unique")

    # Recreate the original unique constraint on name
    with op.batch_alter_table("challenges", schema=None) as batch_op:
        batch_op.create_unique_constraint("uq_challenges_name", ["name"])
