"""
File: configuration.py
Type: py
Summary: SQLAlchemy model for global configuration and feature flags.
"""

from ..extensions import db


class Configuration(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # Deprecated: the AI teacher feature was removed. Column kept until it can be
    # dropped via migration once a prod DB copy is available.
    ai_teacher_enabled = db.Column(db.Boolean, default=False)
    message_sending_enabled = db.Column(db.Boolean, default=True)
    duck_multiplier = db.Column(db.Float, default=1)

    def to_dict(self):
        return {
            "id": self.id,
            "message_sending_enabled": self.message_sending_enabled,
            "duck_multiplier": self.duck_multiplier,
        }
