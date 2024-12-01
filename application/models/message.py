from datetime import datetime

from sqlalchemy import Enum

from application.extensions import db


class Message(db.Model):
    __tablename__ = 'messages'
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(Enum("text", "link", "code_snippet", name="message_type_enum"), nullable=False, default="text")
    is_struck = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    edited_at = db.Column(db.DateTime, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)

    # Relationship to the User
    user = db.relationship('User', backref=db.backref('messages', lazy='selectin'))

    def __repr__(self):
        return f"<Message(id={self.id}, conversation_id={self.conversation_id}, user_id={self.user_id})>"


# class Message(db.Model):
#     __tablename__ = 'messages'
#     id = db.Column(db.Integer, primary_key=True)
#     conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False)
#     user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
#     content = db.Column(db.Text, nullable=False)
#     message_type = db.Column(db.String(20), nullable=False, default="text")  # "text", "link", "code_snippet"
#     is_struck = db.Column(db.Boolean, default=False)  # Flag for struck (hidden) messages
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     edited_at = db.Column(db.DateTime, nullable=True)  # Tracks last edit
#
#     # Relationship to the User
#     user = db.relationship('User', backref=db.backref('messages', lazy=True))
#
#     def __repr__(self):
#         return f"<Message {self.id} in Conversation {self.conversation_id} by User {self.user_id}>"


# from datetime import datetime
# from application.extensions import db
#
#
# class Message(db.Model):
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
#     content = db.Column(db.Text, nullable=False)
#     timestamp = db.Column(db.DateTime, default=datetime.utcnow)
#
#     # Relationship to the User
#     user = db.relationship('User', backref=db.backref('messages', lazy=True))
#
#     def __repr__(self):
#         return f'<Message {self.content} by {self.user_id} at {self.timestamp}>'