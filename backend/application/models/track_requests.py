"""
File: track_requests.py
Type: py
Summary: SQLAlchemy model for Student/Parent track change requests.
"""

from datetime import datetime
from ..extensions import db


class TrackChangeRequest(db.Model):
    __tablename__ = "track_change_requests"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    requester_type = db.Column(db.String(20), nullable=False)  # 'student' or 'parent'
    requested_track = db.Column(db.String(50), nullable=False)  # 'ozaria', 'cs', 'gd', 'wd'
    status = db.Column(db.String(20), default="pending", nullable=False)  # 'pending', 'approved', 'denied'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        # Composite index: speeds up filter_by(student_id=..., status="pending") on every
        # auth status check and admin user list page load (previously a full table scan).
        db.Index("ix_track_change_requests_student_id_status", "student_id", "status"),
    )

    # Relationship to user
    student = db.relationship("User", backref=db.backref("track_change_requests", lazy="dynamic"))

    def __repr__(self):
        return f"<TrackChangeRequest {self.id} student={self.student_id} track={self.requested_track} status={self.status}>"

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "requester_type": self.requester_type,
            "requested_track": self.requested_track,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "student_name": self.student.nickname if self.student else None,
            "student_username": self.student.username if self.student else None,
            "student_current_track": self.student.active_track if self.student else None,
        }
