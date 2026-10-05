"""challenge slug is the only unique key, value is a float

Levels may share a name inside one domain (issue #87): the slug is what identifies
a challenge. This migration

- removes every unique rule on challenges.name, alone or together with the domain,
  whether it is a named constraint, an unnamed one or a unique index;
- declares challenges.value as FLOAT, so a fractional reward such as 1.5 is part of
  the schema instead of something the column merely tolerates.

Both changes are made in one rebuild of the table. No stored value changes: a whole
number is copied as the same number, a fraction is copied as it is.

Revision ID: 1d9eb679a601
Revises: 5c02b3fd911f
Create Date: 2026-10-06 09:00:00.000000

"""
import logging

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "1d9eb679a601"
down_revision = "5c02b3fd911f"
branch_labels = None
depends_on = None

logger = logging.getLogger("alembic.runtime.migration")

TABLE = "challenges"
BATCH_COPY = f"_alembic_tmp_{TABLE}"
NAME_DOMAIN_UNIQUE = "uq_challenges_name_domain"

# The column sets a unique rule on the display name has had over time.
_NAME_RULES = (frozenset({"name"}), frozenset({"name", "domain"}))

# Gives a reflected UNIQUE that has no name of its own a name to drop it by.
_NAMING = {"uq": "uq_%(table_name)s_%(column_0_N_name)s"}


def _is_on_the_name(rule):
    return frozenset(rule["column_names"]) in _NAME_RULES


def name_unique_constraints(inspector):
    """Names of the unique constraints on the name, alone or with the domain."""
    return sorted(
        {
            uq["name"] or f"uq_{TABLE}_{'_'.join(uq['column_names'])}"
            for uq in inspector.get_unique_constraints(TABLE)
            if _is_on_the_name(uq)
        }
    )


def name_unique_indexes(inspector):
    """Names of the unique indexes on the name, alone or with the domain."""
    return sorted(
        ix["name"]
        for ix in inspector.get_indexes(TABLE)
        if ix.get("unique") and _is_on_the_name(ix)
    )


def value_is_float(inspector):
    column = next(c for c in inspector.get_columns(TABLE) if c["name"] == "value")
    return isinstance(column["type"], sa.Float)


def upgrade():
    inspector = sa.inspect(op.get_bind())
    tables = inspector.get_table_names()
    if TABLE not in tables:
        return

    constraints = name_unique_constraints(inspector)
    indexes = name_unique_indexes(inspector)
    retype = not value_is_float(inspector)
    if not (constraints or indexes or retype):
        return

    # A copy left behind by an interrupted rebuild would stop this one. The real
    # table is still there, so the copy holds nothing that is not in it.
    if BATCH_COPY in tables:
        op.drop_table(BATCH_COPY)

    with op.batch_alter_table(
        TABLE, schema=None, naming_convention=_NAMING
    ) as batch_op:
        for name in constraints:
            batch_op.drop_constraint(name, type_="unique")
        for name in indexes:
            batch_op.drop_index(name)
        if retype:
            batch_op.alter_column("value", type_=sa.Float())


def downgrade():
    """Put the unique rule on (name, domain) back where the rows still allow it.

    value stays FLOAT. Declaring it INTEGER again would cast every stored value and
    cut 1.5 down to 1, and the previous revision reads a FLOAT column just as well.
    """
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if TABLE not in inspector.get_table_names():
        return

    rules = inspector.get_unique_constraints(TABLE) + [
        ix for ix in inspector.get_indexes(TABLE) if ix.get("unique")
    ]
    if any(frozenset(rule["column_names"]) == {"name", "domain"} for rule in rules):
        return

    shared = bind.execute(
        sa.text(
            f"SELECT COUNT(*) FROM (SELECT 1 FROM {TABLE} "
            "GROUP BY name, domain HAVING COUNT(*) > 1)"
        )
    ).scalar()
    if shared:
        # Rows written since the upgrade are not deleted to make the rule fit.
        logger.warning(
            "%s is not restored: %d (name, domain) pairs are used by more than one row.",
            NAME_DOMAIN_UNIQUE,
            shared,
        )
        return

    with op.batch_alter_table(TABLE, schema=None) as batch_op:
        batch_op.create_unique_constraint(NAME_DOMAIN_UNIQUE, ["name", "domain"])
