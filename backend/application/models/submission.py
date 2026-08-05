"""
File: submission.py
Type: py
Summary: SQLAlchemy model for student file submissions ("homework inbox").
"""

from ..extensions import db


class Submission(db.Model):
    __tablename__ = "submissions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    classroom_id = db.Column(
        db.String(64), db.ForeignKey("classrooms.id"), nullable=True, index=True
    )
    original_filename = db.Column(db.String(255), nullable=False)
    # Relative path under Config.UPLOAD_FOLDER, e.g. "submissions/<uuid>.pdf"
    stored_path = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    note = db.Column(db.String(500), nullable=True)
    status = db.Column(
        db.String(20), default="pending", index=True
    )  # pending, reviewed
    timestamp = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), index=True
    )

    def __init__(self, **kwargs):
        """Explicit constructor to handle keyword arguments correctly."""
        for key, value in kwargs.items():
            setattr(self, key, value)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "classroom_id": self.classroom_id,
            "original_filename": self.original_filename,
            "file_size": self.file_size,
            "note": self.note,
            "status": self.status,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
