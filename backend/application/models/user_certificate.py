"""
File: user_certificate.py
Type: py
Summary: SQLAlchemy model for user-submitted certificates.
"""

from datetime import datetime

from ..extensions import db


class UserCertificate(db.Model):
    __tablename__ = "user_certificate"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    achievement_id = db.Column(
        db.Integer, db.ForeignKey("achievement.id"), nullable=False
    )
    url = db.Column(db.String(256), nullable=False)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    file_path = db.Column(db.String(256), nullable=True)
    reviewed = db.Column(db.Boolean, default=False)
    reviewed_at = db.Column(db.DateTime)

    # Relationships
    achievement = db.relationship("Achievement", backref="certificates")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user": (
                {
                    "username": self.user.username,
                    "nickname": self.user.nickname,
                    "slug": self.user.slug,
                }
                if self.user
                else None
            ),
            "achievement": self.achievement.to_dict() if self.achievement else None,
            "url": self.url,
            "submitted_at": (
                self.submitted_at.isoformat() if self.submitted_at else None
            ),
            "file_path": self.file_path,
            "reviewed": self.reviewed,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
        }

    __table_args__ = (db.UniqueConstraint("user_id", "achievement_id"),)
