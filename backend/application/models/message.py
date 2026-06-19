"""
File: message.py
Type: py
Summary: SQLAlchemy model for feed posts (messages) and visibility targeting.
"""

from datetime import datetime

from sqlalchemy import Enum

from ..extensions import db


# Association tables for message visibility targeting
message_classrooms = db.Table(
    "message_classrooms",
    db.Column(
        "message_id",
        db.Integer,
        db.ForeignKey("messages.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    db.Column(
        "classroom_id",
        db.String(64),
        db.ForeignKey("classrooms.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

message_users = db.Table(
    "message_users",
    db.Column(
        "message_id",
        db.Integer,
        db.ForeignKey("messages.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    db.Column(
        "user_id",
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Message(db.Model):
    __tablename__ = "messages"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(
        Enum("text", "link", "code_snippet", name="message_type_enum"),
        nullable=False,
        default="text",
    )
    is_struck = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    edited_at = db.Column(db.DateTime, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)

    # Snapshot of User Perks at Send Time
    has_animated_border = db.Column(db.Boolean, default=False)
    chat_font_color = db.Column(db.String(7), nullable=True)

    # Targeting metadata
    is_global = db.Column(db.Boolean, default=False)
    target_live = db.Column(db.Boolean, default=False)

    # Relationships
    user = db.relationship(
        "User", backref=db.backref("messages", lazy="selectin"), lazy="selectin"
    )
    
    target_classrooms = db.relationship(
        "Classroom",
        secondary=message_classrooms,
        lazy="selectin",
        backref=db.backref("targeted_messages", lazy="selectin")
    )
    
    target_users = db.relationship(
        "User",
        secondary=message_users,
        lazy="selectin",
        backref=db.backref("targeted_messages", lazy="selectin")
    )

    def __repr__(self):
        return f"<Message(id={self.id}, user_id={self.user_id}, is_global={self.is_global})>"
