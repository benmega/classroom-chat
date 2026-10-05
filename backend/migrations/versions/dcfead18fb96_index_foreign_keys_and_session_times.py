"""index the foreign keys and session times the app filters on

Adds a plain index to the columns that are looked up on every profile, classroom
and challenge page and by the session cleanup that runs each minute (issue #61):

- projects.user_id, skills.user_id, notes.user_id
- course_instances.classroom_id, course_instances.course_id
- challenges.classroom_id
- session_logs.end_time, session_logs.last_seen

Only indexes are created: no table is rebuilt and no row changes. An index that is
already there, under the name the models give it, is left alone.

Revision ID: dcfead18fb96
Revises: 1d9eb679a601
Create Date: 2026-10-06 12:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "dcfead18fb96"
down_revision = "1d9eb679a601"
branch_labels = None
depends_on = None

# (index name, table, column), named as index=True on the model column names them.
INDEXES = (
    ("ix_projects_user_id", "projects", "user_id"),
    ("ix_skills_user_id", "skills", "user_id"),
    ("ix_notes_user_id", "notes", "user_id"),
    ("ix_course_instances_classroom_id", "course_instances", "classroom_id"),
    ("ix_course_instances_course_id", "course_instances", "course_id"),
    ("ix_challenges_classroom_id", "challenges", "classroom_id"),
    ("ix_session_logs_end_time", "session_logs", "end_time"),
    ("ix_session_logs_last_seen", "session_logs", "last_seen"),
)


def _index_names(inspector, table):
    return {ix["name"] for ix in inspector.get_indexes(table)}


def upgrade():
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())

    for name, table, column in INDEXES:
        if table not in tables:
            continue
        if column not in {c["name"] for c in inspector.get_columns(table)}:
            continue
        if name in _index_names(inspector, table):
            continue
        op.create_index(name, table, [column], unique=False)


def downgrade():
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())

    for name, table, _column in reversed(INDEXES):
        if table in tables and name in _index_names(inspector, table):
            op.drop_index(name, table_name=table)
