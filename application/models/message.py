from datetime import datetime
from application.extensions import db


class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to the User
    user = db.relationship('User', backref=db.backref('messages', lazy=True))

    def __repr__(self):
        return f'<Message {self.content} by {self.user_id} at {self.timestamp}>'