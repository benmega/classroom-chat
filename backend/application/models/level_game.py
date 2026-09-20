"""
File: level_game.py
Type: py
Summary: SQLAlchemy model for sandbox level games unlocked by progression milestones.
"""

from datetime import datetime

from ..extensions import db


class LevelGame(db.Model):
    __tablename__ = "level_games"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    course_id = db.Column(db.String(64), index=True, nullable=True)
    chapter = db.Column(db.Integer, index=True, nullable=True)
    lesson = db.Column(db.Integer, index=True, nullable=True)
    challenge_level = db.Column(db.String(10), index=True, nullable=True)
    assigned_lesson = db.Column(db.String(50), index=True, nullable=False)
    challenge_slug = db.Column(db.String(255), nullable=True, index=True)
    progression_order = db.Column(db.Integer, index=True, nullable=False)
    game_name = db.Column(db.String(255), nullable=False)
    game_url = db.Column(db.String(1000), nullable=False)
    platform = db.Column(db.String(100), nullable=True)
    comment = db.Column(db.Text, nullable=True)
    requires_account = db.Column(db.Boolean, default=False, nullable=False)
    rating = db.Column(db.Float, nullable=True)
    verified = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<LevelGame(id={self.id}, name='{self.game_name}', lesson='{self.assigned_lesson}', challenge_slug='{self.challenge_slug}')>"

    def to_dict(self):
        return {
            "id": self.id,
            "course_id": self.course_id,
            "chapter": self.chapter,
            "lesson": self.lesson,
            "challenge_level": self.challenge_level,
            "assigned_lesson": self.assigned_lesson,
            "challenge_slug": self.challenge_slug,
            "progression_order": self.progression_order,
            "game_name": self.game_name,
            "game_url": self.game_url,
            "platform": self.platform,
            "comment": self.comment,
            "requires_account": self.requires_account,
            "rating": self.rating,
            "verified": self.verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
