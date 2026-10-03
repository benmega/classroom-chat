"""
File: duck_trade.py
Type: py
Summary: SQLAlchemy model for duck trade logs and statuses.
"""

from sqlalchemy import update

from ..extensions import db


class DuckTradeLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    digital_ducks = db.Column(db.Integer, nullable=False)
    bit_ducks = db.Column(
        db.JSON, nullable=False
    )  # Store as JSON instead of PickleType
    byte_ducks = db.Column(
        db.JSON, nullable=False
    )  # Store as JSON instead of PickleType
    status = db.Column(
        db.String(20), default="pending", index=True
    )  # pending, approved, rejected
    timestamp = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), index=True
    )

    def __init__(self, **kwargs):
        """Explicit constructor to handle keyword arguments correctly."""
        for key, value in kwargs.items():
            setattr(self, key, value)

    @classmethod
    def claim_pending(cls, trade_id, new_status):
        """Atomically move a trade out of 'pending' (conditional UPDATE).

        Returns True only for the one caller whose UPDATE matched a pending row,
        so concurrent approvals/rejections of the same trade cannot both win.
        Does not commit: the caller owns the transaction and can roll the claim
        back if the rest of the work fails.
        """
        result = db.session.execute(
            update(cls)
            .where(cls.id == trade_id, cls.status == "pending")
            .values(status=new_status)
            .execution_options(synchronize_session=False)
        )
        return result.rowcount == 1

    def approve(self):
        self.status = "approved"
        db.session.commit()

    def reject(self):
        self.status = "rejected"
        db.session.commit()

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "digital_ducks": self.digital_ducks,
            "bit_ducks": self.bit_ducks,
            "byte_ducks": self.byte_ducks,
            "status": self.status,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
