from ..extensions import db
from ..utilities.helper_functions import to_utc_iso, utcnow_naive


class DuckTransaction(db.Model):
    __tablename__ = "duck_transactions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount = db.Column(db.Float, nullable=False)
    reason = db.Column(db.String(200), nullable=True)
    timestamp = db.Column(db.DateTime, default=utcnow_naive, index=True)

    user = db.relationship(
        "User",
        backref=db.backref("transactions", lazy=True, cascade="all, delete-orphan"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "amount": self.amount,
            "reason": self.reason,
            "timestamp": to_utc_iso(self.timestamp),
        }
