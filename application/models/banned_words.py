"""
File: banned_words.py
Type: py
Summary: SQLAlchemy model for banned words used in moderation.
"""

from application.extensions import db


class BannedWords(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String(255), unique=True, nullable=False)
    added_on = db.Column(db.DateTime, default=db.func.current_timestamp())
    reason = db.Column(db.Text, nullable=True)
    active = db.Column(db.Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<BannedWords {self.word}>"
