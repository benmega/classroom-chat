"""
File: parent_connection_request.py
Type: py
Summary: Model representing a parent's request to connect to a student's account.
"""

from datetime import datetime
from ..extensions import db

class ParentConnectionRequest(db.Model):
    __tablename__ = "parent_connection_requests"
    
    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    relationship = db.Column(db.String(50), nullable=False)
    message = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(20), default="pending", nullable=False) # pending, approved, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    parent = db.relationship("User", foreign_keys=[parent_id], backref=db.backref("sent_connection_requests", lazy="dynamic"))
    student = db.relationship("User", foreign_keys=[student_id], backref=db.backref("received_connection_requests", lazy="dynamic"))

    def to_dict(self):
        return {
            "id": self.id,
            "parent_id": self.parent_id,
            "student_id": self.student_id,
            "relationship": self.relationship,
            "message": self.message,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "parent": self.parent.to_dict_auth() if self.parent else None,
            "student": self.student.to_dict_auth() if self.student else None
        }
