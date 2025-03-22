import pytest
from flask import session
from application.models.user import User
from application.models.message import Message
from application.models.conversation import Conversation
from application.helpers.db_helpers import get_user, save_message_to_db, generate_unique_username


def test_get_user_by_username(init_db, add_sample_user):
    user = add_sample_user(username="test_user", password="password")
    result = get_user("test_user")
    assert result.id == user.id
    assert result.username == "test_user"


def test_get_user_by_id(init_db, add_sample_user):
    user = add_sample_user(username="test_user2", password="password")
    result = get_user(user.id)
    assert result.username == "test_user2"


def test_get_user_not_found(init_db):
    with pytest.raises(Exception) as e:
        get_user("non_existent_user")
    assert "User not found" in str(e.value)



def test_generate_unique_username():
    username1 = generate_unique_username()
    username2 = generate_unique_username()
    assert username1 != username2
    assert username1.startswith("user_")
    assert username2.startswith("user_")




def test_save_message_to_db_new_conversation(init_db, sample_user, client):
    user = sample_user
    with client.application.test_request_context('/'):
        with client.session_transaction() as sess:
            sess.pop('conversation_id', None)  # Ensure no active conversation

        result = save_message_to_db(user.id, "Hello, world!")
        assert result["success"] is True


def test_save_message_to_db_existing_conversation(init_db, sample_user, sample_conversation, client):
    user = sample_user
    conversation = sample_conversation

    with client.application.test_request_context('/'):
        with client.session_transaction() as sess:
            sess['conversation_id'] = conversation.id

        result = save_message_to_db(user.id, "Hello again!")
        assert result["success"] is True


def test_save_message_to_db_no_conversation_in_db(init_db, sample_user, client):
    user = sample_user

    with client.application.test_request_context('/'):
        with client.session_transaction() as sess:
            sess['conversation_id'] = 9999  # Non-existent conversation ID

        result = save_message_to_db(user.id, "This should succeed.")
        assert result["success"] is True
        assert result.get("message_id") is not None