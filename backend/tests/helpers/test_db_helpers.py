"""
File: test_db_helpers.py
Type: py
Summary: Unit tests for db helpers.
"""

import pytest

from application.utilities.db_helpers import (
    get_user,
    save_message_to_db,
    generate_unique_username,
)


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


def test_save_message_to_db_basic(init_db, sample_user, client):
    user = sample_user
    with client.application.test_request_context("/"):
        result = save_message_to_db(user.id, message="Hello, world!", is_global=True)
        assert result["success"] is True
        assert result.get("message_id") is not None


def test_save_message_to_db_with_classroom(init_db, sample_user, sample_classroom, client):
    user = sample_user
    with client.application.test_request_context("/"):
        result = save_message_to_db(user.id, message="Hello again!", target_classrooms=[sample_classroom.id])
        assert result["success"] is True
        assert result.get("message_id") is not None
