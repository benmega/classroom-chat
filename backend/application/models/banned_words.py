"""
File: banned_words.py
Type: py
Summary: SQLAlchemy model for banned words used in moderation.
"""

from ..extensions import db
from ..utilities.helper_functions import to_utc_iso


class BannedWords(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String(255), unique=True, nullable=False)
    added_on = db.Column(db.DateTime, default=db.func.current_timestamp())
    reason = db.Column(db.Text, nullable=True)
    active = db.Column(db.Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<BannedWords {self.word}>"

    def to_dict(self):
        return {
            "id": self.id,
            "word": self.word,
            "added_on": to_utc_iso(self.added_on),
            "reason": self.reason,
            "active": self.active,
        }
