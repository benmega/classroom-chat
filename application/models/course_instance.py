"""
File: course_instance.py
Type: py
Summary: SQLAlchemy model for specific class instances (e.g., "Sat1030 CS 4 PY").
"""

from datetime import datetime

from application.extensions import db


class CourseInstance(db.Model):
    __tablename__ = "course_instances"

    # The MongoDB-style ID extracted from the URL (e.g., "678b56ea92eef90eb4c37231")
    id = db.Column(db.String(64), primary_key=True)

    name = db.Column(db.String(255), nullable=False)  # e.g., "CS 1-3 JS"
    language = db.Column(db.String(64), nullable=False)  # e.g., "JavaScript"
    url = db.Column(db.String(255), nullable=False)  # The relative URL

    # Optional: Link to the parent Course curriculum if known
    course_id = db.Column(db.String(64), db.ForeignKey("courses.id"), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to parent Course
    course = db.relationship("Course", backref="instances")

    def __repr__(self):
        return f"<CourseInstance(id={self.id}, name={self.name})>"
