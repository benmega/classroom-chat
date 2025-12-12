"""
File: challenge.py
Type: py
Summary: SQLAlchemy model for coding challenges and rewards.
"""

from application.extensions import db
from application.models.challenge_log import ChallengeLog
from sqlalchemy.event import listens_for

class Challenge(db.Model):
    __tablename__ = 'challenges'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    slug = db.Column(db.String(255), nullable=False, unique=True)
    domain = db.Column(db.String(100), nullable=False)
    difficulty = db.Column(db.String(50), nullable=False, default='medium')
    value = db.Column(db.Integer, nullable=False, default=1)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    course_id = db.Column(db.String(100), nullable=True)
    description = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f"<Challenge(name={self.name}, domain={self.domain}, difficulty={self.difficulty}, value={self.value})>"

    def complete_challenge(self, user):
        """Logs the challenge completion and updates user progress."""
        log = ChallengeLog(username=user.username, domain=self.domain, challenge_slug=self.slug)
        db.session.add(log)
        db.session.commit()

    def scale_value(self, difficulty_multiplier=1.0):
        """Scales the challenge value based on difficulty."""
        scale_factors = {'easy': 0.5, 'medium': 1.0, 'hard': 2.0}
        return int(self.value * scale_factors.get(self.difficulty, 1.0) * difficulty_multiplier)

@listens_for(Challenge, 'before_insert')
def set_default_slug(mapper, connection, target):
    if not target.slug:
        target.slug = target.name