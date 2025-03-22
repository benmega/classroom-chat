from application.extensions import db

class ChallengeLog(db.Model):
    __tablename__ = 'challenge_logs'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    domain = db.Column(db.String(100), nullable=False)  # e.g., "CodeCombat", "Ozaria", "Studio.Code"
    challenge_name = db.Column(db.String(255), nullable=False)
    course_id = db.Column(db.String(100), nullable=True)
    course_instance = db.Column(db.String(100), nullable=True) 
    timestamp = db.Column(db.DateTime, nullable=False, default=db.func.now())  # Auto-populates with current time

    def __repr__(self):
        return f"<ChallengeLog(username={self.username}, domain={self.domain}, challenge={self.challenge_name}, timestamp={self.timestamp})>"
