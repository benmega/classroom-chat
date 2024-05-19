
from application.extensions import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    ip_address = db.Column(db.String(45), nullable=False)
    conversations = db.relationship('Conversation', backref='user', lazy='dynamic')
    # is_ai_teacher = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f'<User {self.username}>'

    @classmethod
    def set_online(cls, user_id, online=True):
        user = cls.query.filter_by(id=user_id).first()
        if user:
            user.is_online = online
            db.session.commit()