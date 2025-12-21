"""
File: message.py
Type: py
Summary: SQLAlchemy model for chat messages and metadata.
"""

from datetime import datetime

from sqlalchemy import Enum

from application.extensions import db


class Message(db.Model):
    __tablename__ = "messages"
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(
        db.Integer,
        db.ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(
        Enum("text", "link", "code_snippet", name="message_type_enum"),
        nullable=False,
        default="text",
    )
    is_struck = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    edited_at = db.Column(db.DateTime, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)

    # Relationship to the User
    user = db.relationship("User", backref=db.backref("messages", lazy="selectin"))

    def __repr__(self):
        return f"<Message(id={self.id}, conversation_id={self.conversation_id}, user_id={self.user_id})>"
