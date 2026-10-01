from datetime import datetime

from application.models.duck_transaction import DuckTransaction


def test_to_dict_serialises_timestamp():
    stamp = datetime(2026, 1, 2, 3, 4, 5)
    tx = DuckTransaction(user_id=1, amount=2.5, reason="Reward", timestamp=stamp)

    assert tx.to_dict() == {
        "id": None,
        "user_id": 1,
        "amount": 2.5,
        "reason": "Reward",
        "timestamp": "2026-01-02T03:04:05",
    }


def test_to_dict_handles_missing_timestamp():
    """timestamp is nullable, so an unsaved or legacy row must not raise."""
    tx = DuckTransaction(user_id=1, amount=-1.0, reason=None, timestamp=None)

    assert tx.to_dict()["timestamp"] is None
