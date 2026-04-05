"""
File: configuration.py
Type: py
Summary: SQLAlchemy model for global configuration and feature flags.
"""

from application.extensions import db


class Configuration(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ai_teacher_enabled = db.Column(db.Boolean, default=False)
    message_sending_enabled = db.Column(db.Boolean, default=False)
    duck_multiplier = db.Column(db.Float, default=1)

    def to_dict(self):
        return {
            "id": self.id,
            "ai_teacher_enabled": self.ai_teacher_enabled,
            "message_sending_enabled": self.message_sending_enabled,
            "duck_multiplier": self.duck_multiplier
        }
