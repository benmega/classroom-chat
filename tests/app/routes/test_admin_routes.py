import pytest
from flask import url_for

from application import User
from application.models.banned_words import BannedWords
from application.models.conversation import Conversation


# Test the /users route
def test_get_users(test_client, sample_users, sample_admin):
    # Simulate logging in as an admin
    response = test_client.get(url_for('admin_bp.get_users'), auth=(sample_admin.username, sample_admin.password_hash))

    assert response.status_code == 200
    users_data = response.get_json()
    assert len(users_data) == len(sample_users) + 1 # For the sample_admin
    assert users_data[0]['username'] == sample_users[0].username


# Test the /users/<int:user_id> route for updating user data
def test_update_user(test_client, sample_user, sample_admin):
    new_username = "UpdatedUser"
    response = test_client.put(
        url_for('admin_bp.update_user', user_id=sample_user.id),
        data={'username': new_username},
        auth=(sample_admin.username, sample_admin.password_hash)
    )

    assert response.status_code == 200
    json_response = response.get_json()
    assert json_response['success'] is True

    updated_user = User.query.get(sample_user.id)
    assert updated_user.username == new_username.lower() # usernames should be stored in lower case


# Test the /set_username route
def test_set_username(test_client, sample_user):
    new_username = "NewUsername"
    response = test_client.post(
        url_for('admin_bp.set_username_route'),
        data={'user_id': sample_user.id, 'username': new_username}
    )

    assert response.status_code == 200
    json_response = response.get_json()
    assert json_response['success'] is True

    updated_user = User.query.get(sample_user.id)
    assert updated_user.username == new_username.lower() # usernames should be stored in lower case


# Test the /clear-history route
def test_clear_history(test_client, sample_conversation, sample_admin):
    response = test_client.post(url_for('admin_bp.clear_history'), auth=(sample_admin.username, 'hashedpassword'))

    assert response.status_code == 302  # Redirect after clearing history

    conversations = Conversation.query.all()
    assert len(conversations) == 0


# Test the /add-banned-word route
def test_add_banned_word(test_client, sample_admin):
    word = "testword"
    response = test_client.post(
        url_for('admin_bp.add_banned_word'),
        data={'word': word},
        auth=(sample_admin.username, 'hashedpassword')
    )

    assert response.status_code == 302  # Redirect to dashboard

    banned_word = BannedWords.query.filter_by(word=word).first()
    assert banned_word is not None
    assert banned_word.word == word
