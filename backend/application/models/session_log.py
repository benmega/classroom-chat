# application/models/session_log.py



from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..utilities.helper_functions import utcnow_naive


class SessionLog(db.Model):
    __tablename__ = "session_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start_time = db.Column(db.DateTime, default=utcnow_naive, nullable=False)
    # set when user goes offline
    end_time = db.Column(db.DateTime, nullable=True, index=True)
    last_seen = db.Column(
        db.DateTime, default=utcnow_naive, nullable=False, index=True
    )

    __table_args__ = (
        # A user has at most one open session (one that has not ended)
        db.Index(
            "uq_session_logs_one_open_per_user",
            "user_id",
            unique=True,
            sqlite_where=db.text("end_time IS NULL"),
            postgresql_where=db.text("end_time IS NULL"),
        ),
    )

    user = db.relationship(
        "User",
        backref=db.backref("session_logs", lazy=True, cascade="all, delete-orphan"),
    )

    def __repr__(self):
        return f"<SessionLog user_id={self.user_id} start={self.start_time} end={self.end_time}>"

    @property
    def duration(self):
        """Return session length in seconds (if ended)."""
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return None

    @classmethod
    def _open_session(cls, user_id):
        """The user's open session, or None. The newest one, should a database
        from before the one-open-session index still hold several."""
        return (
            cls.query.filter_by(user_id=user_id, end_time=None)
            .order_by(cls.start_time.desc(), cls.id.desc())
            .first()
        )

    @classmethod
    def start_session(cls, user_id, commit=True):
        """Log a new session start (idempotent).

        If the user already has an open session (second tab, repeat login) that
        session is returned instead of opening another one.

        The database allows one open session per user, so the insert is refused
        (IntegrityError) when another request opened the session after the lookup
        here. With commit=True that request's session is returned. With
        commit=False the error surfaces at the caller's commit, which has to roll
        back and call again.
        """
        log = cls._open_session(user_id)
        if log:
            return log

        log = cls(user_id=user_id)
        db.session.add(log)
        if commit:
            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                log = cls._open_session(user_id)
                if log is None:
                    raise
        return log

    @classmethod
    def touch(cls, user_id, now=None, commit=True):
        """Record activity: bump last_seen on the user's current open session.

        Used for presence signals that do not come from the HTTP heartbeat
        (socket connects and messages). Returns the session, or None when the
        user has none open. Only the newest open session is touched: older
        ones are orphans and must keep their last_seen (see end_session).
        """
        log = cls._open_session(user_id)
        if log:
            log.last_seen = now or utcnow_naive()
            if commit:
                db.session.commit()
        return log

    @classmethod
    def end_session(cls, user_id, commit=True):
        """Close every open session of the user; return the most recent one.

        The newest open session ends now. Older ones are orphans that stopped
        receiving heartbeats, so they end at their last_seen (as the periodic
        cleanup does) rather than being stretched to now. Only a database from
        before the one-open-session index can hold such orphans.
        """
        logs = (
            cls.query.filter_by(user_id=user_id, end_time=None)
            .order_by(cls.start_time.desc(), cls.id.desc())
            .all()
        )
        for i, log in enumerate(logs):
            log.end_time = utcnow_naive() if i == 0 else log.last_seen
        if logs and commit:
            db.session.commit()
        return logs[0] if logs else None
