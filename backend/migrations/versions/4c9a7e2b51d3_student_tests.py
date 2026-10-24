"""student tests

Adds the tables of the student tests feature: quizzes, quiz_questions,
quiz_attempts and quiz_rewards.

quiz_questions and quiz_attempts belong to their quiz (ON DELETE CASCADE), and
quiz_attempts also to its user. A question number is unique within a quiz. A user
has at most one attempt in progress (submitted_at IS NULL) per quiz, which a partial
unique index holds. quiz_rewards records the first submission of a quiz by a
student, one row per (user, quiz), so the ducks for it are paid once even when the
attempt is deleted. The quizzes themselves are loaded by `flask seed`.

Revision ID: 4c9a7e2b51d3
Revises: 183122a091ad
Create Date: 2026-10-24 12:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "4c9a7e2b51d3"
down_revision = "183122a091ad"
branch_labels = None
depends_on = None

OPEN = "submitted_at IS NULL"
_IX_QUESTIONS_QUIZ = "ix_quiz_questions_quiz_id"
_IX_ATTEMPTS_QUIZ = "ix_quiz_attempts_quiz_id"
_IX_ATTEMPTS_USER = "ix_quiz_attempts_user_id"
_IX_ONE_OPEN = "uq_quiz_attempts_one_open_per_user_quiz"
_IX_REWARDS_USER = "ix_quiz_rewards_user_id"
_IX_REWARDS_QUIZ = "ix_quiz_rewards_quiz_id"


def upgrade():
    conn = op.get_bind()
    tables = set(sa.inspect(conn).get_table_names())

    if "quizzes" not in tables:
        op.create_table(
            "quizzes",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("slug", sa.String(length=100), nullable=False),
            sa.Column("title", sa.String(length=150), nullable=False),
            sa.Column("description", sa.String(length=255), nullable=True),
            sa.Column("source_url", sa.String(length=255), nullable=True),
            sa.Column("sort_order", sa.Integer(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("reveal_answers", sa.Boolean(), nullable=False),
            sa.Column("allow_retakes", sa.Boolean(), nullable=False),
            sa.Column("time_limit_minutes", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id", name=op.f("pk_quizzes")),
            sa.UniqueConstraint("slug", name=op.f("uq_quizzes_slug")),
        )

    if "quiz_questions" not in tables:
        op.create_table(
            "quiz_questions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("quiz_id", sa.Integer(), nullable=False),
            sa.Column("number", sa.Integer(), nullable=False),
            sa.Column("domain", sa.String(length=100), nullable=False),
            sa.Column("prompt", sa.Text(), nullable=False),
            sa.Column("options", sa.JSON(), nullable=False),
            sa.Column("answer", sa.String(length=1), nullable=False),
            sa.Column("explanation", sa.Text(), nullable=True),
            sa.Column("diagram_html", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(
                ["quiz_id"],
                ["quizzes.id"],
                name=op.f("fk_quiz_questions_quiz_id_quizzes"),
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id", name=op.f("pk_quiz_questions")),
            sa.UniqueConstraint("quiz_id", "number", name=op.f("uq_quiz_questions_quiz_id_number")),
        )
        op.create_index(op.f(_IX_QUESTIONS_QUIZ), "quiz_questions", ["quiz_id"], unique=False)

    if "quiz_attempts" not in tables:
        op.create_table(
            "quiz_attempts",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("quiz_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("answers", sa.JSON(), nullable=False),
            sa.Column("flagged", sa.JSON(), nullable=False),
            sa.Column("started_at", sa.DateTime(), nullable=False),
            sa.Column("submitted_at", sa.DateTime(), nullable=True),
            sa.Column("elapsed_seconds", sa.Integer(), nullable=False),
            sa.Column("correct_count", sa.Integer(), nullable=True),
            sa.Column("total_count", sa.Integer(), nullable=True),
            sa.Column("score_percent", sa.Integer(), nullable=True),
            sa.Column("ducks_awarded", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(
                ["quiz_id"],
                ["quizzes.id"],
                name=op.f("fk_quiz_attempts_quiz_id_quizzes"),
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["user_id"],
                ["users.id"],
                name=op.f("fk_quiz_attempts_user_id_users"),
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id", name=op.f("pk_quiz_attempts")),
        )
        op.create_index(op.f(_IX_ATTEMPTS_QUIZ), "quiz_attempts", ["quiz_id"], unique=False)
        op.create_index(op.f(_IX_ATTEMPTS_USER), "quiz_attempts", ["user_id"], unique=False)
        op.create_index(
            _IX_ONE_OPEN,
            "quiz_attempts",
            ["user_id", "quiz_id"],
            unique=True,
            sqlite_where=sa.text(OPEN),
            postgresql_where=sa.text(OPEN),
        )

    if "quiz_rewards" not in tables:
        op.create_table(
            "quiz_rewards",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("quiz_id", sa.Integer(), nullable=False),
            sa.Column("ducks", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(
                ["quiz_id"],
                ["quizzes.id"],
                name=op.f("fk_quiz_rewards_quiz_id_quizzes"),
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["user_id"],
                ["users.id"],
                name=op.f("fk_quiz_rewards_user_id_users"),
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id", name=op.f("pk_quiz_rewards")),
            sa.UniqueConstraint("user_id", "quiz_id", name=op.f("uq_quiz_rewards_user_id_quiz_id")),
        )
        op.create_index(op.f(_IX_REWARDS_USER), "quiz_rewards", ["user_id"], unique=False)
        op.create_index(op.f(_IX_REWARDS_QUIZ), "quiz_rewards", ["quiz_id"], unique=False)


def downgrade():
    conn = op.get_bind()
    tables = set(sa.inspect(conn).get_table_names())

    if "quiz_rewards" in tables:
        op.drop_index(op.f(_IX_REWARDS_QUIZ), table_name="quiz_rewards")
        op.drop_index(op.f(_IX_REWARDS_USER), table_name="quiz_rewards")
        op.drop_table("quiz_rewards")
    if "quiz_attempts" in tables:
        op.drop_index(_IX_ONE_OPEN, table_name="quiz_attempts")
        op.drop_index(op.f(_IX_ATTEMPTS_USER), table_name="quiz_attempts")
        op.drop_index(op.f(_IX_ATTEMPTS_QUIZ), table_name="quiz_attempts")
        op.drop_table("quiz_attempts")
    if "quiz_questions" in tables:
        op.drop_index(op.f(_IX_QUESTIONS_QUIZ), table_name="quiz_questions")
        op.drop_table("quiz_questions")
    if "quizzes" in tables:
        op.drop_table("quizzes")
