import logging
from unittest.mock import patch

import pytest
from application.extensions import db
from application.tasks import scheduled_cleanup, set_app_instance
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, ProgrammingError


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

    with (
        patch("application.tasks.close_stale_sessions", return_value=3) as mock_cleanup,
        patch("application.tasks.logger") as mock_logger,
    ):
        scheduled_cleanup()
        mock_cleanup.assert_called_once()
        mock_logger.info.assert_any_call("Closed 3 stale sessions")

    with (
        patch("application.tasks.close_stale_sessions", return_value=0) as mock_cleanup,
        patch("application.tasks.logger") as mock_logger,
    ):
        scheduled_cleanup()
        mock_cleanup.assert_called_once()
        # The no-op tick runs every minute: debug only, never info.
        mock_logger.debug.assert_any_call("No stale sessions found")
        mock_logger.info.assert_not_called()


def test_scheduled_cleanup_exception(app):
    set_app_instance(app)

    with (
        patch(
            "application.tasks.close_stale_sessions",
            side_effect=ValueError("Test Error"),
        ),
        patch("application.tasks.logger") as mock_logger,
    ):
        with pytest.raises(ValueError, match="Test Error"):
            scheduled_cleanup()
        mock_logger.exception.assert_called_with(
            "Error in scheduled cleanup: Test Error"
        )


def test_scheduled_cleanup_start_line_is_debug(app):
    set_app_instance(app)

    with (
        patch("application.tasks.close_stale_sessions", return_value=0),
        patch("application.tasks.logger") as mock_logger,
    ):
        scheduled_cleanup()
        mock_logger.debug.assert_any_call("Starting scheduled session cleanup")
        mock_logger.info.assert_not_called()


def test_scheduled_cleanup_logs_without_printing(app, capsys):
    set_app_instance(app)

    with patch("application.tasks.close_stale_sessions", return_value=2):
        scheduled_cleanup()
    with patch("application.tasks.close_stale_sessions", return_value=0):
        scheduled_cleanup()
    with (
        patch(
            "application.tasks.close_stale_sessions", side_effect=ValueError("boom")
        ),
        pytest.raises(ValueError),
    ):
        scheduled_cleanup()

    # Everything goes through the logger; nothing is printed a second time.
    assert capsys.readouterr().out == ""


def test_scheduled_cleanup_passes_configured_timeout(app):
    set_app_instance(app)
    app.config["SESSION_STALE_TIMEOUT_MINUTES"] = 42

    try:
        with patch(
            "application.tasks.close_stale_sessions", return_value=0
        ) as mock_cleanup:
            scheduled_cleanup()
        mock_cleanup.assert_called_once_with(timeout_minutes=42)
    finally:
        app.config["SESSION_STALE_TIMEOUT_MINUTES"] = 10


def test_scheduled_cleanup_default_timeout_is_ten_minutes(app):
    set_app_instance(app)

    with patch(
        "application.tasks.close_stale_sessions", return_value=0
    ) as mock_cleanup:
        scheduled_cleanup()

    mock_cleanup.assert_called_once_with(timeout_minutes=10)


def test_scheduled_cleanup_rolls_back_before_reraising(app):
    set_app_instance(app)

    with (
        patch(
            "application.tasks.close_stale_sessions",
            side_effect=ValueError("Test Error"),
        ),
        patch.object(db.session, "rollback") as mock_rollback,
        pytest.raises(ValueError, match="Test Error"),
    ):
        scheduled_cleanup()

    mock_rollback.assert_called_once()


@pytest.mark.parametrize(
    "error",
    [
        OperationalError("SELECT 1", {}, Exception("no such table: session_logs")),
        ProgrammingError("SELECT 1", {}, Exception('relation "session_logs" does not exist')),
    ],
)
def test_scheduled_cleanup_skips_when_schema_not_ready(app, error):
    set_app_instance(app)

    with (
        patch("application.tasks.close_stale_sessions", side_effect=error),
        patch.object(db.session, "rollback") as mock_rollback,
        patch("application.tasks.logger") as mock_logger,
    ):
        # No exception: APScheduler would otherwise log its own traceback every minute.
        assert scheduled_cleanup() is None

    mock_rollback.assert_called_once()
    mock_logger.warning.assert_called_once()
    assert "schema not ready" in mock_logger.warning.call_args.args[0]
    mock_logger.exception.assert_not_called()


def test_scheduled_cleanup_survives_a_missing_schema(app, caplog):
    set_app_instance(app)
    db.session.execute(text("DROP TABLE session_logs"))
    db.session.commit()

    with caplog.at_level(logging.INFO, logger="application.tasks"):
        # The real "no such table" error from the database does not propagate.
        scheduled_cleanup()

    assert "Session cleanup skipped (schema not ready)" in caplog.text
    assert "Error in scheduled cleanup" not in caplog.text
