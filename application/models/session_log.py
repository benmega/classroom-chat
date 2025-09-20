# application/models/session_log.py

"""
Model: SessionLog
Type: SQLAlchemy ORM model
Location: application/models/session_log.py
Summary: Tracks when a user starts and ends a session in the classroom chat.
"""

from datetime import datetime
from application.extensions import db

class SessionLog(db.Model):
    __tablename__ = 'session_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    start_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    end_time = db.Column(db.DateTime, nullable=True)  # set when user goes offline
    last_seen = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = db.relationship('User', backref=db.backref('session_logs', lazy=True, cascade="all, delete-orphan"))

    def __repr__(self):
        return f"<SessionLog user_id={self.user_id} start={self.start_time} end={self.end_time}>"

    @property
    def duration(self):
        """Return session length in seconds (if ended)."""
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return None

    @classmethod
    def start_session(cls, user_id):
        """Log a new session start."""
        log = cls(user_id=user_id)
        db.session.add(log)
        db.session.commit()
        return log

    @classmethod
    def end_session(cls, user_id):
        """Mark the most recent open session as ended."""
        log = cls.query.filter_by(user_id=user_id, end_time=None).order_by(cls.start_time.desc()).first()
        if log:
            log.end_time = datetime.utcnow()
            db.session.commit()
        return log
