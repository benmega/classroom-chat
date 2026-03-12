"""
File: test_duck_trade_routes.py
Type: py
Summary: Unit tests for duck trade routes Flask routes.
"""

from flask import url_for

from application import db
from application.models.duck_trade import DuckTradeLog


# Test submitting a valid trade
def test_submit_trade_valid(client, sample_user_with_ducks, test_app):
    with test_app.app_context():
        # Clear any existing pending trades to avoid triggering our new rule
        DuckTradeLog.query.filter_by(username=sample_user_with_ducks.username).delete()
        db.session.commit()

        # Start a session and set the user ID (not username!)
        with client.session_transaction() as sess:
            sess["user"] = sample_user_with_ducks.id

        # Build complete form data to satisfy min_entries=7
        form_data = {"digital_ducks": 3}
        for i in range(7):
            form_data[f"bit_duck_selection-bit_ducks-{i}"] = 1 if i == 0 else 0
            form_data[f"byte_duck_selection-byte_ducks-{i}"] = 0

        # Note: We do NOT pass a fake csrf_token here.
        # Make sure WTF_CSRF_ENABLED = False in your test app config!
        response = client.post(
            url_for("duck_trade.submit_trade"),
            data=form_data,
            follow_redirects=True,
        )

        # Assert the page loaded successfully
        assert response.status_code == 200

        # Verify the database state actually changed
        trade = DuckTradeLog.query.filter_by(username=sample_user_with_ducks.username, status="pending").first()
        assert trade is not None
        assert trade.digital_ducks == 3


# Test submitting a second trade while one is pending (Testing our new rule!)
def test_submit_trade_one_pending_limit(client, sample_user_with_ducks, test_app):
    with test_app.app_context():
        # --- FIX: Clear existing trades to prevent database leaks between tests ---
        DuckTradeLog.query.filter_by(username=sample_user_with_ducks.username).delete()
        db.session.commit()
        # ------------------------------------------------------------------------

        with client.session_transaction() as sess:
            sess["user"] = sample_user_with_ducks.id

        # Seed an existing pending trade
        existing_trade = DuckTradeLog(
            username=sample_user_with_ducks.username,
            digital_ducks=1,
            bit_ducks=[0] * 7,
            byte_ducks=[0] * 7,
            status="pending"
        )
        db.session.add(existing_trade)
        db.session.commit()

        form_data = {"digital_ducks": 3}
        for i in range(7):
            form_data[f"bit_duck_selection-bit_ducks-{i}"] = 0
            form_data[f"byte_duck_selection-byte_ducks-{i}"] = 0

        # Try to submit a second trade
        response = client.post(
            url_for("duck_trade.submit_trade"),
            data=form_data,
            follow_redirects=True,
        )

        # Assert the request was blocked by checking the flashed error message
        assert response.status_code == 200
        assert b"You already have a pending trade" in response.data

        # Ensure a second trade wasn't added to the DB
        trade_count = DuckTradeLog.query.filter_by(username=sample_user_with_ducks.username).count()
        assert trade_count == 1


# Test the bit shift get route
def test_bit_shift_get(client, test_app):
    with test_app.app_context():
        response = client.get(url_for("duck_trade.bit_shift"))
        assert response.status_code == 200
        assert b"Digital Ducks" in response.data