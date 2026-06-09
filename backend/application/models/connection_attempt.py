"""
File: connection_attempt.py
Type: py
Summary: Model to track parent connection code attempts for rate limiting.
"""

from datetime import datetime, timedelta
from ..extensions import db

class ConnectionAttempt(db.Model):
    __tablename__ = "connection_attempts"

    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    attempted_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    code_attempted = db.Column(db.String(10), nullable=False)
    success = db.Column(db.Boolean, default=False)

    parent = db.relationship("User", backref=db.backref("connection_attempts", lazy="dynamic"))

    @staticmethod
    def check_rate_limits(parent_id):
        """
        Check if parent has exceeded rate limits.
        Returns: (is_allowed, error_message)
        """
        now = datetime.utcnow()

        # 15-minute limit: 5 attempts
        fifteen_min_ago = now - timedelta(minutes=15)
        attempts_15m = ConnectionAttempt.query.filter_by(parent_id=parent_id).filter(
            ConnectionAttempt.attempted_at >= fifteen_min_ago
        ).count()

        if attempts_15m >= 5:
            return False, "Too many attempts. Please wait 15 minutes before trying again."

        # Daily limit: 20 attempts
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        attempts_today = ConnectionAttempt.query.filter_by(parent_id=parent_id).filter(
            ConnectionAttempt.attempted_at >= today
        ).count()

        if attempts_today >= 20:
            return False, "Daily connection limit reached. Please try again tomorrow."

        # Lifetime limit: 100 attempts
        attempts_lifetime = ConnectionAttempt.query.filter_by(parent_id=parent_id).count()

        if attempts_lifetime >= 100:
            return False, "Lifetime connection limit reached. Please contact support."

        return True, None

    @staticmethod
    def log_attempt(parent_id, code, success=False):
        """Log a connection attempt."""
        attempt = ConnectionAttempt(
            parent_id=parent_id,
            code_attempted=code,
            success=success
        )
        db.session.add(attempt)
        db.session.commit()
