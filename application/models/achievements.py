from datetime import datetime

from application.extensions import db


class Achievement(db.Model):
    __tablename__ = 'achievement'
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(64), unique=True, nullable=False)
    name = db.Column(db.String(128), nullable=False)
    type = db.Column(db.String(64), nullable=False) # ["ducks","project","progress","chat","consistency","community","session","trade","certificate"]
    reward = db.Column(db.Integer, nullable=False, default=1)
    description = db.Column(db.String(256), nullable=True)
    requirement_value = db.Column(db.String(128), nullable=True)
    source = db.Column(db.String(255), nullable=True)
    users = db.relationship('UserAchievement', backref='achievement', lazy=True)

class UserAchievement(db.Model):
    __tablename__ = 'user_achievement'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievement.id'), nullable=False)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)


    __table_args__ = (db.UniqueConstraint('user_id', 'achievement_id'),)
