from ..extensions import db


class ChallengeLog(db.Model):
    __tablename__ = "challenge_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    domain = db.Column(db.String(100), nullable=False)
    challenge_slug = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), index=True
    )
    course_id = db.Column(db.String(100), nullable=True)
    course_instance = db.Column(db.String(100), nullable=True)
    helper = db.Column(db.String(100), nullable=True)

    __table_args__ = (
        # Composite index: speeds up filter_by(user_id=..., challenge_slug=..., course_instance=...)
        # on every challenge submission (uniqueness check on the critical path).
        db.Index(
            "ix_challenge_log_user_slug_instance",
            "user_id",
            "challenge_slug",
            "course_instance",
        ),
    )

    def __repr__(self):
        return f"<ChallengeLog(user_id={self.user_id}, domain={self.domain}, slug={self.challenge_slug}, timestamp={self.timestamp})>"
