"""rows that belong to a user say so in their foreign key

Every foreign key to users.id now has an ON DELETE rule (issue #61). The ones listed
below had none: the models alone decided what happens to these rows when their user
is deleted. They get ON DELETE CASCADE, which is what the models already do.

- challenge_logs.user_id, duck_trade_log.user_id, duck_transactions.user_id
- projects.user_id, skills.user_id, notes.user_id, submissions.user_id
- session_logs.user_id, user_achievement.user_id, user_certificate.user_id
- course_instance_requests.student_id, connection_attempts.parent_id
- parent_students.parent_id, parent_students.student_id

SQLite cannot alter a foreign key, so each table is rebuilt once. No row changes:
every row is copied as it is, and the columns, indexes and other constraints of the
table are carried over. A foreign key that had no name gets the name the models
give it. A table whose foreign key already has the rule is left alone.

Revision ID: 28a685819194
Revises: 1785a35c3f5a
Create Date: 2026-10-06 16:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "28a685819194"
down_revision = "1785a35c3f5a"
branch_labels = None
depends_on = None

USERS = "users"
RULE = "CASCADE"

# table -> the columns whose foreign key to users.id gets the rule
USER_FOREIGN_KEYS = {
    "challenge_logs": ("user_id",),
    "connection_attempts": ("parent_id",),
    "course_instance_requests": ("student_id",),
    "duck_trade_log": ("user_id",),
    "duck_transactions": ("user_id",),
    "notes": ("user_id",),
    "parent_students": ("parent_id", "student_id"),
    "projects": ("user_id",),
    "session_logs": ("user_id",),
    "skills": ("user_id",),
    "submissions": ("user_id",),
    "user_achievement": ("user_id",),
    "user_certificate": ("user_id",),
}

# Gives a reflected FOREIGN KEY that has no name of its own a name to drop it by.
# It is the name the models give the same key.
_NAMING = {"fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"}


def fk_name(table, column):
    return f"fk_{table}_{column}_{USERS}"


def foreign_keys_to_users(inspector, table, column):
    """The foreign keys of `table` from `column` alone to users.id."""
    return [
        fk
        for fk in inspector.get_foreign_keys(table)
        if fk["constrained_columns"] == [column]
        and fk["referred_table"] == USERS
        and fk["referred_columns"] == ["id"]
    ]


def delete_rule(fk):
    """The ON DELETE rule of a reflected foreign key, None when it has none."""
    rule = (fk.get("options") or {}).get("ondelete")
    return rule.upper() if rule else None


def _replace_foreign_keys(table, columns, ondelete):
    """Rebuild `table` once, giving each of `columns` one foreign key to users.id
    with the ON DELETE rule `ondelete`. `columns` maps a column to the foreign keys
    it has now."""
    with op.batch_alter_table(
        table, schema=None, naming_convention=_NAMING
    ) as batch_op:
        for column, current in columns.items():
            name = fk_name(table, column)
            for old in sorted({fk["name"] or name for fk in current}):
                batch_op.drop_constraint(old, type_="foreignkey")
            # op.f(): the name is final, the naming convention must not extend it
            batch_op.create_foreign_key(
                op.f(name), USERS, [column], ["id"], ondelete=ondelete
            )


def _rebuild(wanted, ondelete):
    """Rebuild every listed table that has a column for which `wanted` says its
    current foreign keys to users.id must be replaced."""
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    if USERS not in tables:
        return

    for table, columns in USER_FOREIGN_KEYS.items():
        if table not in tables:
            continue
        existing = {c["name"] for c in inspector.get_columns(table)}
        todo = {}
        for column in columns:
            if column not in existing:
                continue
            current = foreign_keys_to_users(inspector, table, column)
            if wanted(current):
                todo[column] = current
        if not todo:
            continue

        # A copy left behind by an interrupted rebuild would stop this one. The
        # real table is still there, so the copy holds nothing that is not in it.
        batch_copy = f"_alembic_tmp_{table}"
        if batch_copy in tables:
            op.drop_table(batch_copy)

        _replace_foreign_keys(table, todo, ondelete)


def upgrade():
    def lacks_the_rule(current):
        return [delete_rule(fk) for fk in current] != [RULE]

    _rebuild(lacks_the_rule, RULE)


def downgrade():
    """Take the rule off again. The foreign keys keep their names."""

    def has_the_rule(current):
        return any(delete_rule(fk) == RULE for fk in current)

    _rebuild(has_the_rule, None)
