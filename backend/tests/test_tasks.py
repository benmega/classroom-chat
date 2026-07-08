import pytest
from unittest.mock import patch
from application.tasks import set_app_instance, scheduled_cleanup

def test_set_app_instance(app):
    set_app_instance(app)
    from application.tasks import _app_instance as current_instance
    assert current_instance is app

def test_scheduled_cleanup_no_app_instance():
    # Set instance to None
    set_app_instance(None)
    
    with patch("application.tasks.logger") as mock_logger:
        scheduled_cleanup()
        mock_logger.error.assert_called_with("App instance not set for scheduler")

def test_scheduled_cleanup_success(app):
    set_app_instance(app)
    
    # 1. Stale sessions closed > 0
    with patch("application.tasks.close_stale_sessions", return_value=3) as mock_cleanup, \
         patch("application.tasks.logger") as mock_logger:
        scheduled_cleanup()
        mock_cleanup.assert_called_once()
        mock_logger.info.assert_any_call("Closed 3 stale sessions")

    # 2. No stale sessions found
    with patch("application.tasks.close_stale_sessions", return_value=0) as mock_cleanup, \
         patch("application.tasks.logger") as mock_logger:
        scheduled_cleanup()
        mock_cleanup.assert_called_once()
        mock_logger.info.assert_any_call("No stale sessions found")

def test_scheduled_cleanup_exception(app):
    set_app_instance(app)
    
    with patch("application.tasks.close_stale_sessions", side_effect=ValueError("Test Error")), \
         patch("application.tasks.logger") as mock_logger:
        with pytest.raises(ValueError, match="Test Error"):
            scheduled_cleanup()
        mock_logger.error.assert_called_with("Error in scheduled cleanup: Test Error")
