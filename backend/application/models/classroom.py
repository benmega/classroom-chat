"""
File: classroom.py
Type: py
Summary: SQLAlchemy model for Classroom and the user_classrooms join table.
"""

from datetime import datetime

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
    url = db.Column(db.String(255), nullable=False)
    course_id = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Course assignments this classroom has ever had
    course_assignments = db.relationship("CourseInstance", backref="classroom")

    # Students enrolled in this classroom (via user_classrooms join table)
    users = db.relationship(
        "User",
        secondary=user_classrooms,
        back_populates="classrooms",
        lazy="selectin",
    )

    def __repr__(self):
        return f"<Classroom(id={self.id}, name={self.name})>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "language": self.language,
        }