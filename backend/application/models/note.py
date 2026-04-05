"""
File: application/models/note.py
Type: py
Summary: Model for storing user notes (images) uploaded to S3.
"""
from datetime import datetime

from application.extensions import db


class Note(db.Model):
    __tablename__ = 'notes'

    id = db.Column(db.Integer, primary_key=True)
    # CHANGED: 'user.id' -> 'users.id' to match User.__tablename__
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', back_populates='notes')

    @property
    def url(self):
        BUCKET_NAME = "classroom-chat-student-notes" # Ensure this matches your bucket
        REGION = "ap-southeast-1" # Updated based on your logs
        return f"https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com/{self.filename}"