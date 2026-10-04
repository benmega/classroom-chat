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

    @classmethod
    def get_current(cls):
        """Return the global configuration row, or None if it does not exist.

        The oldest row wins, so every caller agrees on the same row even if
        duplicate rows ever exist (there is no database-level singleton guard).
        """
        return cls.query.order_by(cls.id).first()

    @classmethod
    def get_or_create(cls):
        """Return the global configuration row, creating the defaults if missing.

        A newly created row is flushed (so it has an id and its defaults) but
        not committed: the caller owns the transaction.
        """
        config = cls.get_current()
        if config is None:
            config = cls(
                ai_teacher_enabled=False,
                message_sending_enabled=True,
                duck_multiplier=1.0,
            )
            db.session.add(config)
            db.session.flush()
        return config

    def to_dict(self):
        return {
            "id": self.id,
            "message_sending_enabled": self.message_sending_enabled,
            "duck_multiplier": self.duck_multiplier,
        }
