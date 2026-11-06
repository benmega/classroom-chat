"""
File: quiz.py
Type: py
Summary: SQLAlchemy models for student tests: a quiz, its multiple-choice questions and
         the attempts students make at it.
"""

from ..extensions import db
from ..utilities.helper_functions import to_utc_iso, utcnow_naive


class Quiz(db.Model):
    __tablename__ = "quizzes"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    source_url = db.Column(db.String(255), nullable=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    # Admin settings: the seed never overwrites these on an existing quiz
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    # Whether the owner sees the key and explanations after submitting
    reveal_answers = db.Column(db.Boolean, nullable=False, default=True)
    allow_retakes = db.Column(db.Boolean, nullable=False, default=True)
    time_limit_minutes = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow_naive)
    updated_at = db.Column(db.DateTime, default=utcnow_naive, onupdate=utcnow_naive)

    questions = db.relationship(
        "QuizQuestion",
        back_populates="quiz",
        order_by="QuizQuestion.number",
        cascade="all, delete-orphan",
    )
    attempts = db.relationship(
        "QuizAttempt",
        back_populates="quiz",
        cascade="all, delete-orphan",
    )
    # None: open to everyone. Any: open only to the students and classrooms named.
    assignments = db.relationship(
        "QuizAssignment",
        back_populates="quiz",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Quiz {self.slug}>"


class QuizAssignment(db.Model):
    """A quiz assigned to one student or one classroom; exactly one of the two is set."""

    __tablename__ = "quiz_assignments"
    __table_args__ = (
        db.UniqueConstraint("quiz_id", "user_id", name="uq_quiz_assignments_quiz_id_user_id"),
        db.UniqueConstraint(
            "quiz_id", "classroom_id", name="uq_quiz_assignments_quiz_id_classroom_id"
        ),
        db.CheckConstraint("(user_id IS NULL) <> (classroom_id IS NULL)", name="one_target"),
    )

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(
        db.Integer,
        db.ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    classroom_id = db.Column(
        db.String(64),
        db.ForeignKey("classrooms.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow_naive)

    quiz = db.relationship("Quiz", back_populates="assignments")
    user = db.relationship("User", back_populates="quiz_assignments")
    classroom = db.relationship("Classroom", back_populates="quiz_assignments")

    def __repr__(self):
        target = f"user={self.user_id}" if self.user_id else f"classroom={self.classroom_id}"
        return f"<QuizAssignment quiz={self.quiz_id} {target}>"


class QuizQuestion(db.Model):
    __tablename__ = "quiz_questions"
    __table_args__ = (
        db.UniqueConstraint("quiz_id", "number", name="uq_quiz_questions_quiz_id_number"),
    )

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(
        db.Integer,
        db.ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    number = db.Column(db.Integer, nullable=False)
    domain = db.Column(db.String(100), nullable=False)
    prompt = db.Column(db.Text, nullable=False)
    # {"A": "text", "B": "text", ...}
    options = db.Column(db.JSON, nullable=False)
    answer = db.Column(db.String(1), nullable=False)
    explanation = db.Column(db.Text, nullable=True)
    diagram_html = db.Column(db.Text, nullable=True)

    quiz = db.relationship("Quiz", back_populates="questions")

    def __repr__(self):
        return f"<QuizQuestion {self.quiz_id}#{self.number}>"


class QuizAttempt(db.Model):
    __tablename__ = "quiz_attempts"
    __table_args__ = (
        # A user has at most one attempt in progress (not yet submitted) per quiz
        db.Index(
            "uq_quiz_attempts_one_open_per_user_quiz",
            "user_id",
            "quiz_id",
            unique=True,
            sqlite_where=db.text("submitted_at IS NULL"),
            postgresql_where=db.text("submitted_at IS NULL"),
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(
        db.Integer,
        db.ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # {"<question number>": "<letter>"}
    answers = db.Column(db.JSON, nullable=False, default=dict)
    # Question numbers the student marked
    flagged = db.Column(db.JSON, nullable=False, default=list)
    started_at = db.Column(db.DateTime, nullable=False, default=utcnow_naive)
    # When the attempt runs out (naive UTC), fixed at start from the quiz's time limit
    # of that moment; None without a limit. A later change to the limit leaves it alone.
    deadline = db.Column(db.DateTime, nullable=True)
    submitted_at = db.Column(db.DateTime, nullable=True)  # None while in progress
    elapsed_seconds = db.Column(db.Integer, nullable=False, default=0)
    # Set when the attempt is submitted
    correct_count = db.Column(db.Integer, nullable=True)
    total_count = db.Column(db.Integer, nullable=True)
    score_percent = db.Column(db.Integer, nullable=True)
    # Snapshot of what was graded, set at submit:
    # {"<number>": {"answer": letter, "selected": letter|None, "domain": str}}
    graded = db.Column(db.JSON, nullable=True)
    # Ducks credited for this attempt (the first attempt of a quiz only)
    ducks_awarded = db.Column(db.Integer, nullable=False, default=0)

    quiz = db.relationship("Quiz", back_populates="attempts")
    user = db.relationship("User", back_populates="quiz_attempts")

    def __repr__(self):
        return f"<QuizAttempt {self.id} quiz={self.quiz_id} user={self.user_id}>"

    @property
    def is_submitted(self):
        return self.submitted_at is not None

    def deadline_iso(self):
        return to_utc_iso(self.deadline)


class QuizReward(db.Model):
    """A student's first submission of a quiz, kept for good: it outlives the attempt
    (an admin deleting the attempt for a retake does not make the ducks payable again)
    and its unique key makes two racing submits pay once."""

    __tablename__ = "quiz_rewards"
    __table_args__ = (
        db.UniqueConstraint("user_id", "quiz_id", name="uq_quiz_rewards_user_id_quiz_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    quiz_id = db.Column(
        db.Integer,
        db.ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ducks = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow_naive)

    def __repr__(self):
        return f"<QuizReward user={self.user_id} quiz={self.quiz_id} ducks={self.ducks}>"
