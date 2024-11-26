from datetime import datetime
from application.extensions import db

# Association table for many-to-many relationship between users and conversations
conversation_users = db.Table(
    'conversation_users',
    db.Column('conversation_id', db.Integer, db.ForeignKey('conversations.id', ondelete='CASCADE'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
)

class Conversation(db.Model):
    __tablename__ = 'conversations'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False, default=lambda: f"New Conversation {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    users = db.relationship('User', secondary=conversation_users, backref=db.backref('conversations', lazy='selectin'), lazy='selectin')
    messages = db.relationship('Message', backref='conversation', lazy='joined', cascade='all, delete-orphan')

    def __repr__(self):
        return f"<Conversation {self.id}: {self.title}>"


# class Conversation(db.Model):
#     __tablename__ = 'conversations'
#     id = db.Column(db.Integer, primary_key=True)
#     title = db.Column(db.String(100), nullable=False, default=lambda: f"Conversation {datetime.utcnow()}")
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#
#     # Relationships
#     users = db.relationship('User', secondary=conversation_users, backref=db.backref('conversations', lazy=True))
#     messages = db.relationship('Message', backref='conversation', lazy=True, cascade='all, delete-orphan')

