from application.extensions import db
from application.models.challenge_log import ChallengeLog


class Challenge(db.Model):
    __tablename__ = 'challenges'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)  # Challenge name must be unique
    domain = db.Column(db.String(100), nullable=False)  # e.g., "CodeCombat", "LeetCode", "HackerRank"
    course_id = db.Column(db.String(100), nullable=True)  # Optional for challenges without courses
    description = db.Column(db.Text, nullable=True)  # Optional challenge description
    difficulty = db.Column(db.String(50), nullable=False, default='medium')  # Options: 'easy', 'medium', 'hard'
    value = db.Column(db.Integer, nullable=False, default=1)  # Default point value
    is_active = db.Column(db.Boolean, nullable=False, default=True)  # Flag to manage active/inactive challenges
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())  # Timestamp of challenge creation

    def __repr__(self):
        return f"<Challenge(name={self.name}, domain={self.domain}, difficulty={self.difficulty}, value={self.value})>"

    # Useful methods
    def complete_challenge(self, user):
        """Logs the challenge completion and updates user progress."""

        log = ChallengeLog(username=user.username, domain=self.domain, challenge_name=self.name)
        db.session.add(log)
        db.session.commit()

    def scale_value(self, difficulty_multiplier=1.0):
        """Scales the challenge value based on difficulty."""
        scale_factors = {'easy': 0.5, 'medium': 1.0, 'hard': 2.0}
        return int(self.value * scale_factors.get(self.difficulty, 1.0) * difficulty_multiplier)
