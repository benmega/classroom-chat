from application.extensions import db


class ChallengeLog(db.Model):
    __tablename__ = "challenge_logs"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    domain = db.Column(db.String(100), nullable=False)
    challenge_slug = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=db.func.now())
    course_id = db.Column(db.String(100), nullable=True)
    course_instance = db.Column(db.String(100), nullable=True)
    helper = db.Column(db.String(100), nullable=True)

    def __repr__(self):
        return f"<ChallengeLog(username={self.username}, domain={self.domain}, slug={self.challenge_slug}, timestamp={self.timestamp})>"
