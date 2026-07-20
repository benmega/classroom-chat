"""
File: course_instance_request.py
Type: py
Summary: SQLAlchemy model for student requests to add unrecognized course instances.
"""

from datetime import datetime

from ..extensions import db


class CourseInstanceRequest(db.Model):
    """
    Represents a request from a student to add a new course instance when submitting work.
    """

    __tablename__ = "course_instance_requests"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    
    # The ID extracted from the URL, e.g. "678b56dc..."
    course_instance_id = db.Column(db.String(64), nullable=False)
    
    # Optional course_id that might also be present in the URL
    requested_course_id = db.Column(db.String(64), nullable=True)
    
    # The full URL they tried to submit
    url = db.Column(db.Text, nullable=False)
    
    # "pending", "approved", or "rejected"
    status = db.Column(db.String(20), default="pending")
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "course_instance_id": self.course_instance_id,
            "requested_course_id": self.requested_course_id,
            "url": self.url,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<CourseInstanceRequest(id={self.id}, student_id={self.student_id}, course_instance_id={self.course_instance_id})>"
