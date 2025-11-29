"""
File: user_certificate.py
Type: py
Summary: SQLAlchemy model for user-submitted certificates.
"""

from datetime import datetime

from application.extensions import db

class UserCertificate(db.Model):
    __tablename__ = "user_certificate"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    achievement_id = db.Column(db.Integer, db.ForeignKey("achievement.id"), nullable=False)
    url = db.Column(db.String(256), nullable=False)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    file_path = db.Column(db.String(256), nullable=True)
    reviewed = db.Column(db.Boolean, default=False)
    reviewed_at = db.Column(db.DateTime)

    __table_args__ = (db.UniqueConstraint("user_id", "achievement_id"),)
