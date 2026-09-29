"""
File: test_admin_routes.py
Type: py
Summary: Unit tests for admin routes Flask routes.
"""

import json
from unittest.mock import patch

from flask import url_for

from application.extensions import db
from application.models.banned_words import BannedWords
from application.models.configuration import Configuration
from application.models.duck_trade import DuckTradeLog
from application.models.user import User


def login_as_admin(client, admin_user):
    """Helper to simulate an admin login via session."""
    with client.session_transaction() as sess:
        # Flask-Login requires the user ID to be a string
        sess["_user_id"] = str(admin_user.id)
        sess["_fresh"] = True

        # Custom admin_only decorator expects 'user' key.
        # We store it as-is (likely int) to ensure User.query.get() works.
        sess["user"] = admin_user.id


def test_get_users_requires_auth(client, sample_user):
    """Test that the users endpoint requires authentication."""
    # Ensure no session exists
    client.delete_cookie("session")

    response = client.get("/api/admin/users", headers={"Accept": "application/json"})
    assert response.status_code == 401


def test_get_users_with_auth(client, sample_admin, sample_users):
    """Test that the users endpoint returns users when authenticated."""
    login_as_admin(client, sample_admin)

    response = client.get("/api/admin/users")
    assert response.status_code == 200

    data = json.loads(response.data)
    user_list = data.get("users", data)
    assert len(user_list) >= 2  # At least the sample users we created

    # Verify the returned data contains the expected usernames
    usernames = [user["username"] for user in user_list]
    for user in sample_users:
        assert user.username in usernames


def test_dashboard(client, sample_admin, sample_configuration):
    """Test accessing the admin dashboard."""
    login_as_admin(client, sample_admin)

    response = client.get("/api/admin/dashboard")
    assert response.status_code == 200


def test_toggle_ai(client, test_app, sample_configuration, sample_admin):
    """Test toggling AI teacher functionality."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        initial_state = sample_configuration.ai_teacher_enabled

        response = client.post("/api/admin/toggle-ai")
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data["success"] is True

        updated_config = Configuration.query.first()
        assert updated_config.ai_teacher_enabled != initial_state


def test_toggle_message_sending(client, test_app, sample_configuration, sample_admin):
    """Test toggling message sending functionality."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        initial_state = sample_configuration.message_sending_enabled

        response = client.post("/api/admin/toggle-message-sending")
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data["success"] is True

        updated_config = Configuration.query.first()
        assert updated_config.message_sending_enabled != initial_state


def test_clear_partial_history(client, test_app, init_db, sample_admin):
    """Test clearing partial conversation history."""
    login_as_admin(client, sample_admin)

    pass # test deprecated


def test_add_banned_word(client, sample_admin, test_app):
    """Test adding a banned word."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        response = client.post(
            "/api/admin/add-banned-word",
            data={"word": "testbadword", "reason": "testing purposes"},
        )
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data["success"] is True

        banned_word = BannedWords.query.filter_by(word="testbadword").first()
        assert banned_word is not None
        assert banned_word.reason == "testing purposes"

        # Test adding duplicate word
        response = client.post(
            "/api/admin/add-banned-word", data={"word": "testbadword"}
        )
        assert response.status_code == 400

        db.session.delete(banned_word)
        db.session.commit()


def test_strike_message(client, sample_admin, sample_message):
    """Test striking a message."""
    login_as_admin(client, sample_admin)

    pass # test deprecated


def test_adjust_ducks(client, sample_admin, sample_user, test_app):
    """Test adjusting a user's duck balance."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        initial_ducks = sample_user.duck_balance

        response = client.post(
            "/api/admin/adjust_ducks",
            data={"username": sample_user.username, "amount": 50},
        )
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data["success"] is True

        updated_user = db.session.get(User, sample_user.id)
        assert updated_user.duck_balance == initial_ducks + 50


def test_trade_action_approve(
    client, sample_admin, sample_user, sample_duck_trade, test_app, init_db
):
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        sample_user.duck_balance = 100
        db.session.commit()

        trade_id = sample_duck_trade.id

        with patch.object(DuckTradeLog, "approve") as mock_approve:
            response = client.post(
                "/api/admin/trade_action",
                data={"trade_id": str(trade_id), "action": "approve"},
                content_type="application/x-www-form-urlencoded",
            )

            data = json.loads(response.data)
            assert response.status_code == 200
            assert data["status"] == "success"
            mock_approve.assert_called_once()


def test_trade_action_reject(client, sample_admin, sample_duck_trade, init_db):
    """Test rejecting a duck trade."""
    login_as_admin(client, sample_admin)

    with patch.object(DuckTradeLog, "reject") as mock_reject:
        response = client.post(
            "/api/admin/trade_action",
            data={"trade_id": sample_duck_trade.id, "action": "reject"},
        )

        data = json.loads(response.data)
        assert response.status_code == 200
        assert data["status"] == "success"
        mock_reject.assert_called_once()


def test_trade_action_double_approve_deducts_once(
    client, sample_admin, sample_user, sample_duck_trade, test_app, init_db
):
    login_as_admin(client, sample_admin)
    trade_id = sample_duck_trade.id
    user_id = sample_user.id
    sample_user.duck_balance = 100
    db.session.commit()

    first = client.post(
        "/api/admin/trade_action", data={"trade_id": str(trade_id), "action": "approve"}
    )
    assert first.status_code == 200
    balance_after_first = db.session.get(User, user_id).duck_balance

    second = client.post(
        "/api/admin/trade_action", data={"trade_id": str(trade_id), "action": "approve"}
    )
    assert second.status_code == 409
    assert db.session.get(User, user_id).duck_balance == balance_after_first
    assert db.session.get(DuckTradeLog, trade_id).status == "approved"


def test_trade_action_rejects_non_pending_trade(
    client, sample_admin, sample_duck_trade, init_db
):
    login_as_admin(client, sample_admin)
    trade_id = sample_duck_trade.id

    assert (
        client.post(
            "/api/admin/trade_action", data={"trade_id": str(trade_id), "action": "reject"}
        ).status_code
        == 200
    )
    for action in ("approve", "reject"):
        resp = client.post(
            "/api/admin/trade_action", data={"trade_id": str(trade_id), "action": action}
        )
        assert resp.status_code == 409
    assert db.session.get(DuckTradeLog, trade_id).status == "rejected"


def test_reset_password(client, sample_admin, sample_user, test_app, init_db):
    """Test resetting a user's password."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        with patch.object(User, "set_password") as mock_set_password:
            response = client.post(
                "/api/admin/reset_password",
                json={"username": sample_user.username, "new_password": "newpassword"},
            )
            data = json.loads(response.data)

            assert response.status_code == 200
            assert data["success"] is True
            mock_set_password.assert_called_once_with("newpassword")

        response = client.post(
            "/api/admin/reset_password",
            json={"username": "nonexistent_user", "new_password": "newpassword"},
        )
        assert response.status_code == 404


def test_duck_transactions_data(client, sample_admin):
    """Test retrieving duck transaction data."""
    login_as_admin(client, sample_admin)

    pass # test deprecated


def test_get_users(client, test_app, sample_users, sample_admin, init_db):
    """Test the /users route properly returns user data."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        response = client.get(url_for("admin.get_users"))

        assert response.status_code == 200
        users_data = json.loads(response.data)
        assert len(users_data) >= len(sample_users)

        user_list = users_data.get("users", users_data)
        user_data = next(
            u for u in user_list if u["username"] == sample_users[0].username
        )
        assert user_data["username"] == sample_users[0].username


def test_toggle_messages_text_matches_state(client, sample_configuration, sample_admin):
    login_as_admin(client, sample_admin)
    sample_configuration.message_sending_enabled = False
    db.session.commit()

    data = json.loads(client.post("/api/admin/toggle-message-sending").data)
    assert data["status"] is True
    assert "enabled" in data["message"] and "disabled" not in data["message"]

    data = json.loads(client.post("/api/admin/toggle-message-sending").data)
    assert data["status"] is False
    assert "disabled" in data["message"]


def test_toggle_message_sending_without_config_row(client, init_db, sample_admin):
    login_as_admin(client, sample_admin)
    # A missing row counts as enabled, so the first toggle disables sending.
    data = json.loads(client.post("/api/admin/toggle-message-sending").data)
    assert data["status"] is False
    assert Configuration.query.first().message_sending_enabled is False


def test_toggle_ai_text_matches_state(client, sample_configuration, sample_admin):
    login_as_admin(client, sample_admin)
    sample_configuration.ai_teacher_enabled = False
    db.session.commit()
    data = json.loads(client.post("/api/admin/toggle-ai").data)
    assert data["status"] is True
    assert "enabled" in data["message"] and "disabled" not in data["message"]


def test_update_duck_multiplier_rejects_student_and_anonymous(
    client, sample_configuration, sample_user
):
    response = client.post("/api/admin/update_duck_multiplier", json={"multiplier": 1000})
    assert response.status_code in (401, 403)

    with client.session_transaction() as sess:
        sess["_user_id"] = str(sample_user.id)
        sess["user"] = sample_user.id
    response = client.post("/api/admin/update_duck_multiplier", json={"multiplier": 1000})
    assert response.status_code in (401, 403)
    assert Configuration.query.first().duck_multiplier == 1


def test_update_duck_multiplier_admin_ok(client, sample_configuration, sample_admin):
    login_as_admin(client, sample_admin)
    response = client.post("/api/admin/update_duck_multiplier", json={"multiplier": 2})
    assert response.status_code == 200
    assert Configuration.query.first().duck_multiplier == 2
