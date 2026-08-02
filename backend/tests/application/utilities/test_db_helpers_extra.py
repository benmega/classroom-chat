from unittest.mock import MagicMock, patch

from application.utilities.db_helpers import get_canonical_course_slug, resolve_course_id, save_message_to_db


def test_resolve_course_id_none():
    assert resolve_course_id(None) is None
    assert resolve_course_id("") == ""

def test_get_canonical_course_slug_none():
    assert get_canonical_course_slug(None) is None
    assert get_canonical_course_slug("") == ""

def test_get_canonical_course_slug_map():
    assert get_canonical_course_slug("cs1") == "cs-1"
    assert get_canonical_course_slug("unknown") == "unknown"

@patch('application.utilities.db_helpers.db.session.get')
def test_save_message_to_db_no_user(mock_get):
    mock_get.return_value = None
    result = save_message_to_db(1, "Hello")
    assert result == {"success": False, "error": "User not found"}

@patch('application.utilities.db_helpers.db.session.get')
@patch('application.utilities.db_helpers.User.query')
@patch('application.utilities.db_helpers.db.session.add')
@patch('application.utilities.db_helpers.db.session.commit')
@patch('application.services.moderation_service.message_is_appropriate')
def test_save_message_to_db_success(mock_is_appropriate, mock_commit, mock_add, mock_query, mock_get):
    # Setup user
    mock_user = MagicMock()
    mock_user.is_admin = True
    mock_user.has_animated_border = False
    mock_user.animated_border_speed = "slow"
    mock_user.chat_font_color = "red"

    mock_get.return_value = mock_user

    # Setup target_live online users
    mock_online_user = MagicMock()
    mock_query.filter_by.return_value.all.return_value = [mock_online_user]

    # Run with target_live=True and target_user_ids=[2]
    result = save_message_to_db(
        user_id=1,
        message="Test message",
        target_live=True,
        target_user_ids=[2]
    )

    assert result["success"] is True

@patch('application.utilities.db_helpers.db.session.get')
@patch('application.utilities.db_helpers.db.session.rollback')
def test_save_message_to_db_exception(mock_rollback, mock_get):
    mock_get.side_effect = Exception("DB error")
    result = save_message_to_db(1, "Test")
    assert result == {"success": False, "error": "Failed to save message"}
    mock_rollback.assert_called_once()
