from datetime import datetime

from application.extensions import db


class Achievement(db.Model):
    __tablename__ = 'achievement'
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(64), unique=True, nullable=False)
    name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.String(256))

    # Generalized requirement fields
    type = db.Column(db.String(64), nullable=False)
    # e.g. "ducks", "challenge", "streak", "custom"
    requirement_value = db.Column(db.String(128), nullable=True)
    reward = db.Column(db.Integer, nullable=False, default=1)
    source = db.Column(db.String(255), nullable=True)

    users = db.relationship('UserAchievement', backref='achievement', lazy=True)

class UserAchievement(db.Model):
    __tablename__ = 'user_achievement'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievement.id'), nullable=False)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)


    __table_args__ = (db.UniqueConstraint('user_id', 'achievement_id'),)
