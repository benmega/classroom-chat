"""
File: course_instance.py
Type: py
Summary: SQLAlchemy model for specific class instances (e.g., "Sat1030 CS 4 PY").
"""

from datetime import datetime

from application.extensions import db


class CourseInstance(db.Model):
    """
    Represents a specific course assigned to a classroom.
    """
    __tablename__ = "course_instances"

    # This is the _id from the JSON (678b56dc...)
    id = db.Column(db.String(64), primary_key=True)

    # Foreign Keys
    classroom_id = db.Column(db.String(64), db.ForeignKey("classrooms.id"), nullable=False)
    course_id = db.Column(db.String(64), db.ForeignKey("courses.id"), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<CourseInstance(id={self.id}, classroom_id={self.classroom_id})>"