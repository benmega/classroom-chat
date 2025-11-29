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


def test_get_users_requires_auth(client, sample_user):
    """Test that the users endpoint requires authentication."""
    client.environ_base = {'REMOTE_ADDR': sample_user.ip_address}
    response = client.get('/admin/users')
    assert response.status_code == 403
    assert b'Forbidden' in response.data


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

def test_set_username_route(client, sample_user, auth_headers):
    # no need for explicit app_context here
    client.environ_base = {'REMOTE_ADDR': '127.0.0.1'}
    resp = client.post('/admin/set_username',
                       data={'user_id': sample_user.id, 'username': 'new_username'}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True

    # Query inside a context
    with client.application.app_context():
        updated = User.query.get(sample_user.id)
        assert updated.username == 'new_username'



def test_verify_password_success(client, test_app,auth_headers):
    """Test successful password verification."""
    from application.config import TestingConfig

    # Make sure we have tables created in this test context
    with test_app.app_context():
        # Ensure all tables are created
        db.create_all()

        try:
            # Create a test user with the admin's IP address for testing
            user = User(username='test_user', ip_address='127.0.0.1')
            user.set_password('test_password')  # Use the set_password method
            db.session.add(user)
            db.session.commit()

            # Set up the test environment
            client.environ_base = {'REMOTE_ADDR': '127.0.0.1'}

            # Test with correct password
            with patch('application.routes.admin_routes.admin_pass', TestingConfig.ADMIN_PASSWORD):
                response = client.post(
                    '/admin/verify_password',
                    data={'password': TestingConfig.ADMIN_PASSWORD, 'username': 'verified_username'},
                    headers=auth_headers
                )

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] is True

            # Verify username was updated
            updated_user = User.query.filter_by(ip_address='127.0.0.1').first()
            assert updated_user.username == 'verified_username'
        finally:
            # Clean up - make sure this runs even if there's an error
            try:
                user = User.query.filter_by(username='verified_username').first()
                if user:
                    db.session.delete(user)
                    db.session.commit()
            except:
                pass  # If cleanup fails, don't crash the test

def test_verify_password_failure(client,auth_headers):
    """Test failed password verification."""
    response = client.post(
        '/admin/verify_password',
        data={'password': 'wrong_password', 'username': 'any_username'},
        headers=auth_headers
    )

    assert response.status_code == 401
    data = json.loads(response.data)
    assert data['success'] is False


def test_dashboard(client, auth_headers, sample_user, sample_configuration, sample_banned_words):
    """Test accessing the admin dashboard."""
    # Make the test user online
    with patch.object(User, 'is_online', True):
        response = client.get('/admin/dashboard', headers=auth_headers)

    assert response.status_code == 200
    # We're just testing that the route returns successfully,
    # since we can't easily test template rendering


def test_toggle_ai(client, test_app, sample_configuration, auth_headers):
    """Test toggling AI teacher functionality."""
    with test_app.app_context():
        initial_state = sample_configuration.ai_teacher_enabled

        # Test toggle
        response = client.post('/admin/toggle-ai', headers=auth_headers)
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['success'] is True

        # Verify configuration was toggled
        updated_config = Configuration.query.first()
        assert updated_config.ai_teacher_enabled != initial_state


def test_toggle_message_sending(client, test_app, sample_configuration, auth_headers):
    """Test toggling message sending functionality."""
    with test_app.app_context():
        initial_state = sample_configuration.message_sending_enabled

        # Test toggle
        response = client.post('/admin/toggle-message-sending', headers=auth_headers)
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['success'] is True

        # Verify configuration was toggled
        updated_config = Configuration.query.first()
        assert updated_config.message_sending_enabled != initial_state


def test_clear_partial_history(client, test_app, init_db, auth_headers):
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
        response = client.post('/admin/clear-partial-history', headers=auth_headers)
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
        initial_ducks = sample_user.duck_balance

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
        assert updated_user.duck_balance == initial_ducks + 50

def test_trade_action_approve(client, auth_headers, sample_user, sample_duck_trade, test_app, init_db):
    with test_app.app_context():
        sample_user.duck_balance = 100
        db.session.commit()

        trade_id = sample_duck_trade.id

        with patch.object(DuckTradeLog, 'approve') as mock_approve:
            response = client.post(
                '/admin/trade_action',
                data={
                    'trade_id': str(trade_id),
                    'action': 'approve'
                },
                headers=auth_headers,
                content_type='application/x-www-form-urlencoded'
            )

            data = json.loads(response.data)
            assert response.status_code == 200
            assert data['status'] == 'success'
            mock_approve.assert_called_once()




def test_trade_action_reject(client, auth_headers, sample_duck_trade, init_db):
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

def test_reset_password(client, auth_headers, sample_user, test_app, init_db):
    """Test resetting a user's password."""
    with test_app.app_context():
        # Mock the set_password method
        with patch.object(User, 'set_password') as mock_set_password:
            # Send JSON data instead of form data
            response = client.post(
                '/admin/reset_password',
                json={'username': sample_user.username, 'new_password': 'newpassword'},
                headers=auth_headers
            )
            data = json.loads(response.data)

            assert response.status_code == 200
            assert data['success'] is True
            mock_set_password.assert_called_once_with('newpassword')

        # Test with non-existent user - also using JSON data
        response = client.post(
            '/admin/reset_password',
            json={'username': 'nonexistent_user', 'new_password': 'newpassword'},
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


def test_get_users(client, test_app, sample_users, sample_admin, init_db, auth_headers):
    """Test the /users route properly returns user data."""
    with test_app.app_context():
        # Create basic auth credentials
        response = client.get(
            url_for('admin.get_users'),
            headers=auth_headers
        )

        assert response.status_code == 200
        users_data = json.loads(response.data)
        assert len(users_data) >= len(sample_users)

        # Check that user data contains expected fields
        user_data = next(u for u in users_data if u['username'] == sample_users[0].username)
        assert 'id' in user_data
        assert 'username' in user_data
        assert user_data['username'] == sample_users[0].username



def test_set_username_proper_case_handling(client, test_app, sample_user,auth_headers):
    """Test that usernames are properly converted to lowercase per the User model."""
    with test_app.app_context():
        mixed_case_username = "MixedCaseUsername"

        response = client.post(
            url_for('admin.set_username_route'),
            data={'user_id': sample_user.id, 'username': mixed_case_username},
            headers=auth_headers
        )

        assert response.status_code == 200
        json_response = json.loads(response.data)
        assert json_response['success'] is True

        # Verify username was stored in lowercase
        updated_user = User.query.get(sample_user.id)
        assert updated_user.username == mixed_case_username.lower()