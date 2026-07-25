"""
File: classroom_join_attempt.py
Type: py
Summary: SQLAlchemy model for tracking student classroom join attempts.
         Used for rate limiting and audit logging.
"""

from datetime import datetime, timedelta

from ..extensions import db


class ClassroomJoinAttempt(db.Model):
    """Records every attempt by a student to join a classroom via a join code."""

    __tablename__ = "classroom_join_attempts"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attempted_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True,
    )
    code_attempted = db.Column(db.String(10), nullable=False)
    success = db.Column(db.Boolean, default=False)

    # Relationship back to User
    student = db.relationship(
        "User",
        backref=db.backref(
            "classroom_join_attempts",
            lazy="dynamic",
            cascade="all, delete-orphan",
        ),
        foreign_keys=[student_id],
    )

    # -----------------------------------------------------------------------
    # Rate-limiting helpers
    # -----------------------------------------------------------------------

    HOURLY_LIMIT = 10
    DAILY_LIMIT = 50

    @staticmethod
    def check_rate_limits(student_id):
        """
        Check whether the given student is within join-attempt rate limits.

        Returns:
            (is_allowed: bool, error_message: str | None)
        """
        now = datetime.utcnow()

        hourly_count = ClassroomJoinAttempt.query.filter(
            ClassroomJoinAttempt.student_id == student_id,
            ClassroomJoinAttempt.attempted_at >= now - timedelta(hours=1),
        ).count()

        if hourly_count >= ClassroomJoinAttempt.HOURLY_LIMIT:
            return (
                False,
                f"Too many attempts. You may only try {ClassroomJoinAttempt.HOURLY_LIMIT} "
                "times per hour. Please wait before trying again.",
            )

        daily_count = ClassroomJoinAttempt.query.filter(
            ClassroomJoinAttempt.student_id == student_id,
            ClassroomJoinAttempt.attempted_at >= now - timedelta(days=1),
        ).count()

        if daily_count >= ClassroomJoinAttempt.DAILY_LIMIT:
            return (
                False,
                f"Too many attempts today. You may only try {ClassroomJoinAttempt.DAILY_LIMIT} "
                "times per day.",
            )

        return True, None

    @staticmethod
    def log_attempt(student_id, code, success=False):
        """Persist a join attempt record to the database."""
        attempt = ClassroomJoinAttempt(
            student_id=student_id,
            code_attempted=code,
            success=success,
        )
        db.session.add(attempt)
        db.session.commit()
