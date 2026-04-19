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
        if not self.filename:
            return ""
        
        # If it's a full URL already
        if self.filename.startswith("http"):
            return self.filename
            
        # If it contains slashes, it's likely an S3 key (e.g. notes/username/file.png)
        if "/" in self.filename:
            BUCKET_NAME = "classroom-chat-student-notes" 
            REGION = "ap-southeast-1" 
            return f"https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com/{self.filename}"
            
        # Otherwise, assume it's a local file in the notes upload directory
        from flask import url_for
        try:
            # Use _external=True to return an absolute URL if possible
            return url_for('notes.serve_note', filename=self.filename, _external=True)
        except Exception:
            # Fallback if url_for fails (e.g. outside request context)
            return f"/notes/view/{self.filename}"

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "url": self.url,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }