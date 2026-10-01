"""
File: application/models/note.py
Type: py
Summary: Model for storing user notes (images) uploaded to S3.
"""

from datetime import datetime

from flask import current_app, has_app_context

from ..config import Config
from ..extensions import db


def _s3_setting(name):
    """An S3 setting from the app config, falling back to Config outside an app context."""
    if has_app_context():
        return current_app.config.get(name, getattr(Config, name))
    return getattr(Config, name)


class Note(db.Model):
    __tablename__ = "notes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship("User", back_populates="notes")

    @property
    def url(self):
        if not self.filename:
            return ""

        # If it's a full URL already
        if self.filename.startswith(("http://", "https://")):
            return self.filename

        # Any other name containing a slash is an S3 key (e.g. notes/username/file.png).
        # delete_note relies on the same convention to pick S3 or local deletion.
        if "/" in self.filename:
            bucket = _s3_setting("S3_NOTES_BUCKET")
            region = _s3_setting("AWS_REGION")
            return f"https://{bucket}.s3.{region}.amazonaws.com/{self.filename}"

        # Otherwise, assume it's a local file in the notes upload directory
        from flask import url_for

        try:
            # Use _external=True to return an absolute URL if possible
            return url_for("notes.serve_note", filename=self.filename, _external=True)
        except Exception:
            # Fallback if url_for fails (e.g. outside request context)
            return f"/notes/view/{self.filename}"

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "url": self.url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
