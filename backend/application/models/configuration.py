"""
File: configuration.py
Type: py
Summary: SQLAlchemy model for global configuration and feature flags.
"""

from ..extensions import db


class Configuration(db.Model):
    # The configuration is a single row. Its id is fixed and the CHECK constraint
    # makes the database refuse any other id, so a second row cannot exist.
    SINGLETON_ID = 1

    __table_args__ = (
        # The naming convention makes this ck_configuration_singleton
        db.CheckConstraint(f"id = {SINGLETON_ID}", name="singleton"),
    )

    id = db.Column(
        db.Integer, primary_key=True, autoincrement=False, default=SINGLETON_ID
    )
    message_sending_enabled = db.Column(db.Boolean, default=True)
    duck_multiplier = db.Column(db.Float, default=1)

    @classmethod
    def get_current(cls):
        """Return the global configuration row, or None if it does not exist.

        The database allows only one row. The oldest row is asked for all the
        same, so every caller agrees on the row even in a database from before
        that constraint.
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
