"""
File: ai_settings.py
Type: py
Summary: SQLAlchemy model for AI teacher-related settings (deprecated).
"""

from ..extensions import db


class AISettings(db.Model):
    """Deprecated: table retained until a drop migration can be validated against a prod DB copy."""

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50))
    value = db.Column(db.String(1000))
