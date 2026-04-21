"""
File: achievements.py
Type: py
Summary: SQLAlchemy model for achievement definitions and metadata.
"""

from datetime import datetime

from ..extensions import db


class Achievement(db.Model):
    __tablename__ = "achievement"
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(64), unique=True, nullable=False)
    name = db.Column(db.String(128), nullable=False)
    type = db.Column(
        db.String(64), nullable=False
    )  # ["ducks","project","progress","chat","consistency","community","session","trade","certificate"]
    reward = db.Column(db.Integer, nullable=False, default=1)
    description = db.Column(db.String(256), nullable=True)
    requirement_value = db.Column(db.String(128), nullable=True)
    source = db.Column(db.String(255), nullable=True)
    users = db.relationship("UserAchievement", backref="achievement", lazy=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "slug": self.slug,
            "name": self.name,
            "type": self.type,
            "reward": self.reward,
            "description": self.description,
            "requirement_value": self.requirement_value,
            "source": self.source
        }



class UserAchievement(db.Model):
    __tablename__ = "user_achievement"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    achievement_id = db.Column(
        db.Integer, db.ForeignKey("achievement.id"), nullable=False, index=True
    )
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint("user_id", "achievement_id"),)

    def to_dict(self):
        return {
            "id": self.id,
            "achievement_id": self.achievement_id,
            "achievement": self.achievement.to_dict() if self.achievement else None,
            "earned_at": self.earned_at.isoformat() if self.earned_at else None
        }
