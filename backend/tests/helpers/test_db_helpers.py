"""
File: test_db_helpers.py
Type: py
Summary: Unit tests for db helpers.
"""

from unittest.mock import patch

import pytest
from application.utilities.db_helpers import (
    find_user,
    get_user,
    save_message_to_db,
)
from sqlalchemy.exc import OperationalError
from werkzeug.exceptions import NotFound


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
    # A missing user is a 404, not a 500 wrapping the 404
    with pytest.raises(NotFound) as e:
        get_user("non_existent_user")
    assert e.value.code == 404
    assert e.value.description == "User not found."


def test_get_user_unknown_id_is_not_found(init_db):
    with pytest.raises(NotFound):
        get_user(987654)


def test_get_user_by_username_ignores_case_and_padding(init_db, add_sample_user):
    user = add_sample_user(username="mixedcase", password="password")
    assert get_user("MixedCase").id == user.id
    assert get_user("  MIXEDCASE ").id == user.id


def test_get_user_lets_database_errors_propagate(init_db):
    # Not turned into an abort(500) that would put the exception text in the response
    failure = OperationalError("SELECT secret FROM users", {}, Exception("db password"))
    with patch("application.utilities.db_helpers.db.session.get", side_effect=failure):
        with pytest.raises(OperationalError):
            get_user(1)


def test_find_user_by_id_and_username(init_db, add_sample_user):
    user = add_sample_user(username="findable", password="password")
    assert find_user(user.id).id == user.id
    assert find_user("findable").id == user.id
    assert find_user("FindABLE").id == user.id


def test_find_user_returns_none_instead_of_aborting(init_db):
    assert find_user("ghost") is None
    assert find_user(987654) is None
    assert find_user(None) is None


def test_find_user_does_not_treat_booleans_as_ids(init_db, add_sample_user):
    user = add_sample_user(username="idone", password="password")
    assert find_user(user.id) is not None
    # True == 1 in Python; it must not silently resolve to the user with id 1
    assert find_user(True) is None
    assert find_user(False) is None


def test_save_message_to_db_basic(init_db, sample_user, client):
    user = sample_user
    with client.application.test_request_context("/"):
        result = save_message_to_db(user.id, message="Hello, world!", is_global=True)
        assert result["success"] is True
        assert result.get("message_id") is not None


def test_save_message_to_db_with_classroom(
    init_db, sample_user, sample_classroom, client
):
    user = sample_user
    with client.application.test_request_context("/"):
        result = save_message_to_db(
            user.id, message="Hello again!", target_classrooms=[sample_classroom.id]
        )
        assert result["success"] is True
        assert result.get("message_id") is not None
