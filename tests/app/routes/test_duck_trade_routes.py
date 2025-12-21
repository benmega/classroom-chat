"""
File: test_duck_trade_routes.py
Type: py
Summary: Unit tests for duck trade routes Flask routes.
"""

import secrets

from flask import url_for


# Test submitting a valid trade
def test_submit_trade_valid(client, sample_user_with_ducks, test_app):
    with test_app.app_context():
        # Generate random CSRF token
        csrf_token = secrets.token_hex(32)

        # Start a session and set the user
        with client.session_transaction() as sess:
            sess["user"] = sample_user_with_ducks.username  # Set the session user

        # Include the CSRF token in the form data for testing
        response = client.post(
            url_for("duck_trade.submit_trade"),
            data={
                "csrf_token": csrf_token,
                "digital_ducks": 3,
                "bit_duck_selection-bit_ducks-0": 1,
                # ... rest of your form data ...
            },
            follow_redirects=True,
        )  # Follow the redirect

        # Now we expect a 200 from the page we were redirected to
        assert response.status_code == 200
        # You can also check for content in the redirected page to confirm success
        assert (
            b"Digital Ducks" in response.data
        )  # Adjust based on actual success message


# Test submitting a trade with insufficient ducks
def test_submit_trade_insufficient_ducks(client, sample_user_with_ducks, test_app):
    with test_app.app_context():
        csrf_token = secrets.token_hex(32)
        response = client.post(
            url_for("duck_trade.submit_trade"),
            data={
                "digital_ducks": 100,
                # Data for BitDuckForm (use the nested field format)
                "bit_duck_selection-bit_ducks-0": 100,
                "bit_duck_selection-bit_ducks-1": 0,
                "bit_duck_selection-bit_ducks-2": 0,
                "bit_duck_selection-bit_ducks-3": 0,
                "bit_duck_selection-bit_ducks-4": 0,
                "bit_duck_selection-bit_ducks-5": 0,
                "bit_duck_selection-bit_ducks-6": 0,
                # Data for ByteDuckForm (provide zeros if not used)
                "byte_duck_selection-byte_ducks-0": 0,
                "byte_duck_selection-byte_ducks-1": 0,
                "byte_duck_selection-byte_ducks-2": 1,
                "byte_duck_selection-byte_ducks-3": 0,
                "byte_duck_selection-byte_ducks-4": 0,
                "byte_duck_selection-byte_ducks-5": 0,
                "byte_duck_selection-byte_ducks-6": 0,
                "csrf_token": csrf_token,
            },
        )
        assert response.status_code == 302


# Test the bit shift get route
def test_bit_shift_get(client, test_app):
    with test_app.app_context():
        # Use client to make requests, which will automatically push the app context
        response = client.get(
            url_for("duck_trade.bit_shift")
        )  # Assuming 'duck_trade.bit_shift' is your route
        assert response.status_code == 200
        assert b"Digital Ducks" in response.data


# # Test updating the trade status
# def test_update_trade_status_valid(client, sample_duck_trade, test_app):
#     with test_app.app_context():
#         response = client.post(url_for('duck_trade.update_trade_status'), json={
#             'trade_id': sample_duck_trade.id,
#             'status': 'completed'
#         })
#         assert response.status_code == 200
#         assert response.json['status'] == 'success'

# # Test trade logs
# def test_trade_logs(client, sample_trade, test_app):
#     with test_app.app_context():
#         response = client.get(url_for('duck_trade.trade_logs'))
#         assert response.status_code == 200
#         assert b'Trade Logs' in response.data
