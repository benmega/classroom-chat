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


def test_get_users_requires_auth(client):
    """Test that the users endpoint requires authentication."""
    response = client.get('/admin/users')
    assert response.status_code == 401
    assert b'Unauthorized' in response.data


def test_get_users_with_auth(client, auth_headers, sample_users):
    """Test that the users endpoint returns users when authenticated."""
    response = client.get('/admin/users', headers=auth_headers)
    assert response.status_code == 200

    data = json.loads(response.data)
    assert len(data) >= 2  # At least the sample users we created

    # Verify the returned data contains the expected usernames
    usernames = [user['username'] for user in data]
    for user in sample_users:
        assert user.username in usernames


def test_set_username_route(client, sample_user, test_app):
    """Test setting a username via the set_username route."""
    with test_app.app_context():
        # Get the original username to verify change
        original_username = sample_user.username

        # Create a test environment
        client.environ_base = {'REMOTE_ADDR': sample_user.ip_address}

        # Make the request
        response = client.post(
            '/admin/set_username',
            data={'user_id': sample_user.id, 'username': 'new_username'}
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True

        # Verify username was updated
        updated_user = User.query.get(sample_user.id)
        assert updated_user.username == 'new_username'
        assert updated_user.username != original_username


def test_verify_password_success(client, test_app):
    """Test successful password verification."""
    from application.config import TestingConfig

    # Create a test user with the admin's IP address for testing
    with test_app.app_context():
        user = User(username='test_user', ip_address='127.0.0.1')
        db.session.add(user)
        db.session.commit()

        # Set up the test environment
        client.environ_base = {'REMOTE_ADDR': '127.0.0.1'}

        # Test with correct password
        with patch('application.admin.routes.admin_pass', TestingConfig.ADMIN_PASSWORD):
            response = client.post(
                '/admin/verify_password',
                data={'password': TestingConfig.ADMIN_PASSWORD, 'username': 'verified_username'}
            )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True

        # Verify username was updated
        updated_user = User.query.filter_by(ip_address='127.0.0.1').first()
        assert updated_user.username == 'verified_username'

        # Clean up
        db.session.delete(user)
        db.session.commit()


def test_verify_password_failure(client):
    """Test failed password verification."""
    response = client.post(
        '/admin/verify_password',
        data={'password': 'wrong_password', 'username': 'any_username'}
    )

    assert response.status_code == 401
    data = json.loads(response.data)
    assert data['success'] is False


def test_dashboard(client, auth_headers, sample_user, sample_configuration, sample_banned_words):
    """Test accessing the admin dashboard."""
    # Make the test user online
    with patch.object(sample_user, 'is_online', True):
        response = client.get('/admin/dashboard', headers=auth_headers)

    assert response.status_code == 200
    # We're just testing that the route returns successfully,
    # since we can't easily test template rendering


def test_toggle_ai(client, test_app):
    """Test toggling AI teacher functionality."""
    with test_app.app_context():
        # Ensure we have a configuration
        config = Configuration.query.first()
        if not config:
            config = Configuration(ai_teacher_enabled=False)
            db.session.add(config)
            db.session.commit()

        initial_state = config.ai_teacher_enabled

        # Test toggle
        response = client.post('/admin/toggle-ai')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['success'] is True

        # Verify configuration was toggled
        updated_config = Configuration.query.first()
        assert updated_config.ai_teacher_enabled != initial_state


def test_toggle_message_sending(client, test_app):
    """Test toggling message sending functionality."""
    with test_app.app_context():
        # Ensure we have a configuration
        config = Configuration.query.first()
        if not config:
            config = Configuration(message_sending_enabled=False)
            db.session.add(config)
            db.session.commit()

        initial_state = config.message_sending_enabled

        # Test toggle
        response = client.post('/admin/toggle-message-sending')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['success'] is True

        # Verify configuration was toggled
        updated_config = Configuration.query.first()
        assert updated_config.message_sending_enabled != initial_state


def test_clear_partial_history(client, test_app):
    """Test clearing partial conversation history."""
    with test_app.app_context():
        # Create old and new conversations
        old_date = datetime.utcnow() - timedelta(days=40)
        new_date = datetime.utcnow() - timedelta(days=10)

        old_conv = Conversation(created_at=old_date, title="Old Conversation")
        new_conv = Conversation(created_at=new_date, title="New Conversation")
        db.session.add_all([old_conv, new_conv])
        db.session.commit()

        old_id = old_conv.id
        new_id = new_conv.id

        # Test clearing history
        response = client.post('/admin/clear-partial-history')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['success'] is True

        # Verify old conversation was deleted but new one remains
        assert Conversation.query.get(old_id) is None
        assert Conversation.query.get(new_id) is not None

        # Clean up
        db.session.delete(new_conv)
        db.session.commit()


def test_add_banned_word(client, auth_headers, test_app):
    """Test adding a banned word."""
    with test_app.app_context():
        # Test adding a new banned word
        response = client.post(
            '/admin/add-banned-word',
            data={'word': 'testbadword', 'reason': 'testing purposes'},
            headers=auth_headers
        )
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['success'] is True

        # Verify word was added
        banned_word = BannedWords.query.filter_by(word='testbadword').first()
        assert banned_word is not None
        assert banned_word.reason == 'testing purposes'

        # Test adding duplicate word
        response = client.post(
            '/admin/add-banned-word',
            data={'word': 'testbadword'},
            headers=auth_headers
        )

        assert response.status_code == 400

        # Clean up
        db.session.delete(banned_word)
        db.session.commit()


def test_strike_message(client, auth_headers, sample_message):
    """Test striking a message."""
    # Test striking the message
    response = client.post(
        f'/admin/strike_message/{sample_message.id}',
        headers=auth_headers
    )
    data = json.loads(response.data)

    assert response.status_code == 200
    assert data['success'] is True

    # Verify message was struck
    struck_message = Message.query.get(sample_message.id)
    assert struck_message.is_struck is True

    # Test with non-existent message
    response = client.post(
        '/admin/strike_message/99999',
        headers=auth_headers
    )

    assert response.status_code == 404


def test_adjust_ducks(client, auth_headers, sample_user, test_app):
    """Test adjusting a user's duck balance."""
    with test_app.app_context():
        # Get initial duck balance
        initial_ducks = sample_user.ducks

        # Test adding ducks
        response = client.post(
            '/admin/adjust_ducks',
            data={'username': sample_user.username, 'amount': 50},
            headers=auth_headers
        )
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['success'] is True

        # Verify ducks were added
        updated_user = User.query.get(sample_user.id)
        assert updated_user.ducks == initial_ducks + 50


def test_trade_action_approve(client, auth_headers, sample_user, sample_duck_trade, test_app):
    """Test approving a duck trade."""
    with test_app.app_context():
        # Set initial ducks for the user
        sample_user.ducks = 100
        db.session.commit()

        # Test approving the trade
        with patch.object(DuckTradeLog, 'approve') as mock_approve:
            response = client.post(
                '/admin/trade_action',
                data={'trade_id': sample_duck_trade.id, 'action': 'approve'},
                headers=auth_headers
            )

            data = json.loads(response.data)
            assert response.status_code == 200
            assert data['status'] == 'success'
            mock_approve.assert_called_once()

            # Verify ducks were deducted
            updated_user = User.query.get(sample_user.id)
            assert updated_user.ducks == 50  # 100 - 50


def test_trade_action_reject(client, auth_headers, sample_duck_trade):
    """Test rejecting a duck trade."""
    # Test rejecting the trade
    with patch.object(DuckTradeLog, 'reject') as mock_reject:
        response = client.post(
            '/admin/trade_action',
            data={'trade_id': sample_duck_trade.id, 'action': 'reject'},
            headers=auth_headers
        )

        data = json.loads(response.data)
        assert response.status_code == 200
        assert data['status'] == 'success'
        mock_reject.assert_called_once()


def test_reset_password(client, auth_headers, sample_user, test_app):
    """Test resetting a user's password."""
    with test_app.app_context():
        # Test resetting password
        response = client.post(
            '/admin/reset_password',
            data={'username': sample_user.username, 'new_password': 'newpassword'},
            headers=auth_headers
        )
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['success'] is True

        # Verify password was changed
        updated_user = User.query.get(sample_user.id)
        assert updated_user.password == 'newpassword'

        # Test with non-existent user
        response = client.post(
            '/admin/reset_password',
            data={'username': 'nonexistent_user', 'new_password': 'newpassword'},
            headers=auth_headers
        )

        assert response.status_code == 404


def test_duck_transactions_data(client, auth_headers):
    """Test retrieving duck transaction data."""
    response = client.get('/admin/duck_transactions_data', headers=auth_headers)
    data = json.loads(response.data)

    assert response.status_code == 200
    assert 'labels' in data
    assert 'earned' in data
    assert 'spent' in data
    assert len(data['labels']) == 7  # 7 days of data


# Test the /users route
def test_get_users(client, sample_users, sample_admin):
    # Simulate logging in as an admin
    response = client.get('/admin/users', auth=(sample_admin.username, sample_admin.password_hash))
    assert response.status_code == 200
    users_data = response.get_json()
    assert len(users_data) == len(sample_users) + 1  # For the sample_admin
    assert users_data[0]['username'] == sample_users[0].username


# Test the /users/<int:user_id> route for updating user data
def test_update_user(client, sample_user, sample_admin):
    new_username = "UpdatedUser"
    response = client.put(
        url_for('admin_bp.update_user', user_id=sample_user.id),
        data={'username': new_username},
        auth=(sample_admin.username, sample_admin.password_hash)
    )

    assert response.status_code == 200
    json_response = response.get_json()
    assert json_response['success'] is True

    updated_user = User.query.get(sample_user.id)
    assert updated_user.username == new_username.lower()  # usernames should be stored in lower case


# Test the /set_username route
def test_set_username(client, sample_user):
    new_username = "NewUsername"
    response = client.post(
        url_for('admin_bp.set_username_route'),
        data={'user_id': sample_user.id, 'username': new_username}
    )

    assert response.status_code == 200
    json_response = response.get_json()
    assert json_response['success'] is True

    updated_user = User.query.get(sample_user.id)
    assert updated_user.username == new_username.lower()  # usernames should be stored in lower case