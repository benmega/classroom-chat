from datetime import datetime
from application.extensions import db

class Bounty(db.Model):
    __tablename__ = 'bounties'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)  # User who submitted the bounty
    description = db.Column(db.Text, nullable=False)
    bounty = db.Column(db.String, nullable=False)  # Store as a binary string
    expected_behavior = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String, default="Open", nullable=True)
    image_path = db.Column(db.String(255), nullable=True)  # Store relative path to the image file

    def __repr__(self):
        return f"<Bounty {self.id} by User {self.user_id}>"
