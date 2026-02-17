"""
File: test_admin_routes.py
Type: py
Summary: Unit tests for admin routes Flask routes.
"""

import json
from datetime import datetime, timedelta
from unittest.mock import patch

from flask import url_for

from application.extensions import db
from application.models.banned_words import BannedWords
from application.models.configuration import Configuration
from application.models.conversation import Conversation
from application.models.duck_trade import DuckTradeLog
from application.models.message import Message
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

    response = client.get("/admin/users")
    assert response.status_code == 401


def test_get_users_with_auth(client, sample_admin, sample_users):
    """Test that the users endpoint returns users when authenticated."""
    login_as_admin(client, sample_admin)

    response = client.get("/admin/users")
    assert response.status_code == 200

    data = json.loads(response.data)
    assert len(data) >= 2  # At least the sample users we created

    # Verify the returned data contains the expected usernames
    usernames = [user["username"] for user in data]
    for user in sample_users:
        assert user.username in usernames


def test_set_username_route(client, sample_user, sample_admin):
    """Test setting a username as an admin."""
    login_as_admin(client, sample_admin)

    resp = client.post(
        "/admin/set_username",
        data={"user_id": sample_user.id, "username": "new_username"},
    )
    assert resp.status_code == 200
    assert resp.get_json()["success"] is True

    # Query inside a context
    with client.application.app_context():
        updated = User.query.get(sample_user.id)
        assert updated.username == "new_username"


def test_verify_password_success(client, test_app, sample_admin):
    """Test successful password verification."""
    from application.config import TestingConfig

    login_as_admin(client, sample_admin)

    # Test with correct password using the logged-in admin
    with patch(
        "application.routes.admin_routes.admin_pass",
        TestingConfig.ADMIN_PASSWORD,
    ):
        # We MUST provide user_id, otherwise the backend tries to find user by IP (127.0.0.1)
        # which fails in testing, causing the AttributeError seen in logs.
        response = client.post(
            "/admin/verify_password",
            data={
                "password": TestingConfig.ADMIN_PASSWORD,
                "username": "verified_username",
                "user_id": sample_admin.id
            },
        )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True

    # Verify username was updated
    with test_app.app_context():
        updated_user = User.query.get(sample_admin.id)
        assert updated_user.username == "verified_username"


def test_verify_password_failure(client, sample_admin):
    """Test failed password verification."""
    login_as_admin(client, sample_admin)

    response = client.post(
        "/admin/verify_password",
        data={
            "password": "wrong_password",
            "username": "any_username",
            "user_id": sample_admin.id
        },
    )

    assert response.status_code == 401
    data = json.loads(response.data)
    assert data["success"] is False


def test_dashboard(client, sample_admin, sample_configuration):
    """Test accessing the admin dashboard."""
    login_as_admin(client, sample_admin)

    response = client.get("/admin/dashboard")
    assert response.status_code == 200


def test_toggle_ai(client, test_app, sample_configuration, sample_admin):
    """Test toggling AI teacher functionality."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        initial_state = sample_configuration.ai_teacher_enabled

        response = client.post("/admin/toggle-ai")
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

        response = client.post("/admin/toggle-message-sending")
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data["success"] is True

        updated_config = Configuration.query.first()
        assert updated_config.message_sending_enabled != initial_state


def test_clear_partial_history(client, test_app, init_db, sample_admin):
    """Test clearing partial conversation history."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        old_date = datetime.utcnow() - timedelta(days=40)
        new_date = datetime.utcnow() - timedelta(days=10)

        old_conv = Conversation(created_at=old_date, title="Old Conversation")
        new_conv = Conversation(created_at=new_date, title="New Conversation")
        db.session.add_all([old_conv, new_conv])
        db.session.commit()

        old_id = old_conv.id
        new_id = new_conv.id

        response = client.post("/admin/clear-partial-history")
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data["success"] is True

        assert Conversation.query.get(old_id) is None
        assert Conversation.query.get(new_id) is not None

        db.session.delete(new_conv)
        db.session.commit()


def test_add_banned_word(client, sample_admin, test_app):
    """Test adding a banned word."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        response = client.post(
            "/admin/add-banned-word",
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
            "/admin/add-banned-word", data={"word": "testbadword"}
        )
        assert response.status_code == 400

        db.session.delete(banned_word)
        db.session.commit()


def test_strike_message(client, sample_admin, sample_message):
    """Test striking a message."""
    login_as_admin(client, sample_admin)

    response = client.post(
        f"/admin/strike_message/{sample_message.id}"
    )
    data = json.loads(response.data)

    assert response.status_code == 200
    assert data["success"] is True

    struck_message = Message.query.get(sample_message.id)
    assert struck_message.is_struck is True

    response = client.post("/admin/strike_message/99999")
    assert response.status_code == 404


def test_adjust_ducks(client, sample_admin, sample_user, test_app):
    """Test adjusting a user's duck balance."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        initial_ducks = sample_user.duck_balance

        response = client.post(
            "/admin/adjust_ducks",
            data={"username": sample_user.username, "amount": 50},
        )
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data["success"] is True

        updated_user = User.query.get(sample_user.id)
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
                "/admin/trade_action",
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
            "/admin/trade_action",
            data={"trade_id": sample_duck_trade.id, "action": "reject"},
        )

        data = json.loads(response.data)
        assert response.status_code == 200
        assert data["status"] == "success"
        mock_reject.assert_called_once()


def test_reset_password(client, sample_admin, sample_user, test_app, init_db):
    """Test resetting a user's password."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        with patch.object(User, "set_password") as mock_set_password:
            response = client.post(
                "/admin/reset_password",
                json={"username": sample_user.username, "new_password": "newpassword"},
            )
            data = json.loads(response.data)

            assert response.status_code == 200
            assert data["success"] is True
            mock_set_password.assert_called_once_with("newpassword")

        response = client.post(
            "/admin/reset_password",
            json={"username": "nonexistent_user", "new_password": "newpassword"},
        )
        assert response.status_code == 404


def test_duck_transactions_data(client, sample_admin):
    """Test retrieving duck transaction data."""
    login_as_admin(client, sample_admin)

    response = client.get("/admin/duck_transactions_data")
    data = json.loads(response.data)

    assert response.status_code == 200
    assert "labels" in data
    assert "earned" in data


def test_get_users(client, test_app, sample_users, sample_admin, init_db):
    """Test the /users route properly returns user data."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        response = client.get(url_for("admin.get_users"))

        assert response.status_code == 200
        users_data = json.loads(response.data)
        assert len(users_data) >= len(sample_users)

        user_data = next(
            u for u in users_data if u["username"] == sample_users[0].username
        )
        assert user_data["username"] == sample_users[0].username


def test_set_username_proper_case_handling(client, test_app, sample_user, sample_admin):
    """Test that usernames are properly converted to lowercase per the User model."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        mixed_case_username = "MixedCaseUsername"

        response = client.post(
            url_for("admin.set_username_route"),
            data={"user_id": sample_user.id, "username": mixed_case_username},
        )

        assert response.status_code == 200
        json_response = json.loads(response.data)
        assert json_response["success"] is True

        updated_user = User.query.get(sample_user.id)
        assert updated_user.username == mixed_case_username.lower()