"""
File: parent_message.py
Type: py
Summary: Model for storing messages/inquiries sent from parents to teachers/admin.
"""

from datetime import datetime

from ..extensions import db


class ParentMessage(db.Model):
    __tablename__ = "parent_messages"

    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject = db.Column(db.String(255), nullable=True)
    body = db.Column(db.Text, nullable=False)
    status = db.Column(
        db.String(20),
        default="pending",
        index=True,
    )  # pending, resolved
    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        index=True,
    )
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolved_by_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    parent = db.relationship(
        "User",
        foreign_keys=[parent_id],
        backref=db.backref("parent_messages_sent", lazy="selectin", cascade="all, delete-orphan"),
        lazy="joined",
    )
    resolved_by = db.relationship(
        "User",
        foreign_keys=[resolved_by_id],
        lazy="joined",
    )

    def to_dict(self):
        parent_name = (
            self.parent.nickname or self.parent.username
            if self.parent
            else "Unknown Parent"
        )
        student_names = [
            (c.nickname or c.username)
            for c in (self.parent.children if self.parent else [])
        ]
        return {
            "id": self.id,
            "parent_id": self.parent_id,
            "parent_name": parent_name,
            "parent_username": self.parent.username if self.parent else None,
            "parent_email": self.parent.email if self.parent else None,
            "student_names": student_names,
            "subject": self.subject,
            "body": self.body,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "resolved_by": (
                self.resolved_by.nickname or self.resolved_by.username
                if self.resolved_by
                else None
            ),
        }
