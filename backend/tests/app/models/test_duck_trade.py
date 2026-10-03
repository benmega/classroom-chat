"""
File: test_duck_trade.py
Type: py
Summary: Unit tests for DuckTradeLog model methods.
"""

from application.extensions import db
from application.models.duck_trade import DuckTradeLog
from application.models.user import User


def test_duck_trade_log_methods(app):
    with app.app_context():
        user = User(
            username="trade_user",
            nickname="Trade User",
            email="tradeuser@example.com",
            role="student",
        )
        user.set_password("Password123!")
        db.session.add(user)
        db.session.flush()

        trade = DuckTradeLog(
            user_id=user.id,
            digital_ducks=1,
            bit_ducks=[1, 2],
            byte_ducks=[3],
            status="pending",
        )
        db.session.add(trade)
        db.session.commit()

        d = trade.to_dict()
        assert d["user_id"] == user.id
        assert d["status"] == "pending"

        trade.approve()
        assert trade.status == "approved"

        trade.reject()
        assert trade.status == "rejected"


def test_claim_pending_only_succeeds_for_the_first_caller(sample_duck_trade):
    trade_id = sample_duck_trade.id

    assert DuckTradeLog.claim_pending(trade_id, "approved") is True
    db.session.commit()
    assert db.session.get(DuckTradeLog, trade_id).status == "approved"

    # Already out of 'pending': neither another approval nor a rejection claims it.
    assert DuckTradeLog.claim_pending(trade_id, "approved") is False
    assert DuckTradeLog.claim_pending(trade_id, "rejected") is False
    db.session.commit()
    assert db.session.get(DuckTradeLog, trade_id).status == "approved"

    assert DuckTradeLog.claim_pending(trade_id + 1000, "approved") is False
