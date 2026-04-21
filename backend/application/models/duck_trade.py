"""
File: duck_trade.py
Type: py
Summary: SQLAlchemy model for duck trade logs and statuses.
"""

from ..extensions import db


class DuckTradeLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), db.ForeignKey("users.username"), nullable=False, index=True)
    digital_ducks = db.Column(db.Integer, nullable=False)
    bit_ducks = db.Column(
        db.JSON, nullable=False
    )  # Store as JSON instead of PickleType
    byte_ducks = db.Column(
        db.JSON, nullable=False
    )  # Store as JSON instead of PickleType
    status = db.Column(db.String(20), default="pending", index=True)  # pending, approved, rejected
    timestamp = db.Column(db.DateTime, nullable=False, default=db.func.now(), index=True)

    def approve(self):
        self.status = "approved"
        db.session.commit()

    def reject(self):
        self.status = "rejected"
        db.session.commit()

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "digital_ducks": self.digital_ducks,
            "bit_ducks": self.bit_ducks,
            "byte_ducks": self.byte_ducks,
            "status": self.status,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }
