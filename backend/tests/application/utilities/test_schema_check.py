"""
Unit tests for schema drift checking utility.
"""

from unittest.mock import patch

from application.extensions import db
from application.utilities.schema_check import check_for_schema_drift


def test_schema_check_no_drift(test_app):
    with patch("application.utilities.schema_check.compare_metadata", return_value=[]):
        check_for_schema_drift(test_app)


def test_schema_check_with_drift(test_app):
    diff_data = [("add_table", "test_table")]
    with patch("application.utilities.schema_check.compare_metadata", return_value=diff_data):
        with patch("application.utilities.schema_check.logger.warning") as mock_log_warn:
            check_for_schema_drift(test_app)
            mock_log_warn.assert_called_once_with(
                "Database schema drift detected. Run migrations to sync."
            )


def test_schema_check_exception(test_app):
    with patch.object(db.engine, "connect", side_effect=Exception("DB connection error")):
        with patch("application.utilities.schema_check.logger.exception") as mock_log_exc:
            check_for_schema_drift(test_app)
            mock_log_exc.assert_called_once()


def test_schema_check_with_drift_logs_the_report_instead_of_printing(test_app, capsys):
    diff_data = [("add_table", "test_table")]
    with patch("application.utilities.schema_check.compare_metadata", return_value=diff_data):
        with patch("application.utilities.schema_check.logger.error") as mock_log_error:
            check_for_schema_drift(test_app)

    assert capsys.readouterr().out == ""
    mock_log_error.assert_called_once()
    report = mock_log_error.call_args.args[0]
    assert "DATABASE SCHEMA DRIFT DETECTED" in report
    assert "flask db upgrade" in report
    assert "  - ('add_table', 'test_table')" in report
