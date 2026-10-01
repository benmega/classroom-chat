"""
File: classroom.py
Type: py
Summary: SQLAlchemy model for Classroom and the user_classrooms join table.
"""

import random
import string
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy import inspect as sa_inspect

from ..extensions import db

# ---------------------------------------------------------------------------
# Join table — many-to-many between users and classrooms.
# A student is enrolled when a row exists here.  The only write path for
# students is via the challenge submission enrollment trigger.
# ---------------------------------------------------------------------------
user_classrooms = db.Table(
    "user_classrooms",
    db.Column(
        "user_id",
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    db.Column(
        "classroom_id",
        db.String(64),
        db.ForeignKey("classrooms.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    db.Column(
        "enrolled_at",
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    ),
)


class Classroom(db.Model):
    """
    Represents a persistent 'room' or group of students.
    The reserved classroom with id='global' is the Global Announcements feed —
    readable by every authenticated user, writable only by admins.
    """

    __tablename__ = "classrooms"

    # Use the MongoDB-style ID you previously stored as a course instance here.
    # Two reserved values: "global" and "archive".
    id = db.Column(db.String(64), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    language = db.Column(db.String(64), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    join_code = db.Column(db.String(5), unique=True, nullable=True, index=True)
    sandbox_active = db.Column(db.Boolean, default=False, nullable=False)
    sandbox_activated_at = db.Column(db.DateTime, nullable=True)

    # Course assignments this classroom has ever had
    course_assignments = db.relationship("CourseInstance", backref="classroom")

    # Students enrolled in this classroom (via user_classrooms join table)
    users = db.relationship(
        "User",
        secondary=user_classrooms,
        back_populates="classrooms",
        lazy="select",
    )

    def __repr__(self):
        return f"<Classroom(id={self.id}, name={self.name})>"

    @staticmethod
    def generate_join_code():
        """Generate a unique 5-character uppercase alphanumeric join code."""
        chars = string.ascii_uppercase + string.digits
        while True:
            code = "".join(random.choices(chars, k=5))
            exists = Classroom.query.filter_by(join_code=code).first()
            if not exists:
                return code

    def get_join_code(self):
        """Lazy: generate and commit a join code if one doesn't exist yet."""
        if not self.join_code:
            self.join_code = self.generate_join_code()
            from ..extensions import db as _db

            _db.session.commit()
        return self.join_code

    def check_sandbox_expiry(self):
        """
        Check if sandbox mode has expired because the day ended.
        If sandbox is active and was activated on a previous date (UTC),
        resets sandbox_active to False and sandbox_activated_at to None.
        Returns True if sandbox is currently active (and not expired), False otherwise.
        """
        if self.sandbox_active:
            if (
                self.sandbox_activated_at
                and self.sandbox_activated_at.date() < datetime.utcnow().date()
            ):
                self.sandbox_active = False
                self.sandbox_activated_at = None
                return False
            return True
        return False

    def _enrolled_count(self):
        """Number of enrolled users, without loading the roster just to count it."""
        if "users" not in sa_inspect(self).unloaded:
            return len(self.users)
        return (
            db.session.scalar(
                select(func.count())
                .select_from(user_classrooms)
                .where(user_classrooms.c.classroom_id == self.id)
            )
            or 0
        )

    @classmethod
    def to_dicts(cls, classrooms):
        """to_dict() for each of `classrooms` with one grouped COUNT for all of them."""
        classrooms = list(classrooms)
        if not classrooms:
            return []
        counts = dict(
            db.session.execute(
                select(user_classrooms.c.classroom_id, func.count())
                .where(user_classrooms.c.classroom_id.in_([c.id for c in classrooms]))
                .group_by(user_classrooms.c.classroom_id)
            ).all()
        )
        return [c.to_dict(student_count=counts.get(c.id, 0)) for c in classrooms]

    def to_dict(self, student_count=None):
        # join_code is intentionally omitted; fetch it via /api/admin/classrooms/<id>/join-code
        # List views should use to_dicts(); student_count is the batch-computed value it passes in.
        self.check_sandbox_expiry()
        if student_count is None:
            student_count = self._enrolled_count()
        return {
            "id": self.id,
            "name": self.name,
            "language": self.language,
            "student_count": student_count,
            "sandbox_active": bool(self.sandbox_active),
            "sandbox_activated_at": self.sandbox_activated_at.isoformat()
            if self.sandbox_activated_at
            else None,
        }
