"""quiz assignments

Adds quiz_assignments: a test assigned to one student (user_id) or one classroom
(classroom_id), never both. A test with no rows is open to everyone, as before; one
with rows is open only to the students named and those enrolled in the classrooms
named. Each row belongs to its quiz, user or classroom (ON DELETE CASCADE).

Revision ID: 7d3e1f9a2c64
Revises: 4c9a7e2b51d3
Create Date: 2026-10-27 12:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "7d3e1f9a2c64"
down_revision = "4c9a7e2b51d3"
branch_labels = None
depends_on = None

_IX_QUIZ = "ix_quiz_assignments_quiz_id"
_IX_USER = "ix_quiz_assignments_user_id"
_IX_CLASSROOM = "ix_quiz_assignments_classroom_id"


def upgrade():
    conn = op.get_bind()
    if "quiz_assignments" in sa.inspect(conn).get_table_names():
        return
    op.create_table(
        "quiz_assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("quiz_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("classroom_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            "(user_id IS NULL) <> (classroom_id IS NULL)",
            name=op.f("ck_quiz_assignments_one_target"),
        ),
        sa.ForeignKeyConstraint(
            ["quiz_id"],
            ["quizzes.id"],
            name=op.f("fk_quiz_assignments_quiz_id_quizzes"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_quiz_assignments_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["classroom_id"],
            ["classrooms.id"],
            name=op.f("fk_quiz_assignments_classroom_id_classrooms"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_quiz_assignments")),
        sa.UniqueConstraint("quiz_id", "user_id", name=op.f("uq_quiz_assignments_quiz_id_user_id")),
        sa.UniqueConstraint(
            "quiz_id", "classroom_id", name=op.f("uq_quiz_assignments_quiz_id_classroom_id")
        ),
    )
    op.create_index(op.f(_IX_QUIZ), "quiz_assignments", ["quiz_id"], unique=False)
    op.create_index(op.f(_IX_USER), "quiz_assignments", ["user_id"], unique=False)
    op.create_index(op.f(_IX_CLASSROOM), "quiz_assignments", ["classroom_id"], unique=False)


def downgrade():
    conn = op.get_bind()
    if "quiz_assignments" not in sa.inspect(conn).get_table_names():
        return
    op.drop_index(op.f(_IX_CLASSROOM), table_name="quiz_assignments")
    op.drop_index(op.f(_IX_USER), table_name="quiz_assignments")
    op.drop_index(op.f(_IX_QUIZ), table_name="quiz_assignments")
    op.drop_table("quiz_assignments")
