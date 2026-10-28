"""
Unit tests for schema drift checking utility.
"""

from unittest.mock import patch

from application.extensions import db
from application.utilities.schema_check import (
    SUMMARY_MAX_DIFFS,
    check_for_schema_drift,
    log_schema_drift_summary,
)


def test_schema_check_no_drift(test_app):
    with patch("application.utilities.schema_check.compare_metadata", return_value=[]):
        check_for_schema_drift(test_app)


def test_schema_check_with_drift(test_app):
    diff_data = [("add_table", "test_table")]
    with patch("application.utilities.schema_check.compare_metadata", return_value=diff_data):
        with patch("application.utilities.schema_check.logger.warning") as mock_log_warn:
            check_for_schema_drift(test_app)
            mock_log_warn.assert_called_once_with(
                "Database schema drift detected. The report above says how to sync."
            )


def test_schema_check_exception(test_app):
    with patch.object(db.engine, "connect", side_effect=Exception("DB connection error")):
        with patch("application.utilities.schema_check.logger.exception") as mock_log_exc:
            check_for_schema_drift(test_app)
            mock_log_exc.assert_called_once()


def test_schema_check_closes_its_connection_when_the_comparison_fails(test_app):
    real_connect = db.engine.connect
    opened = []

    def connect():
        connection = real_connect()
        opened.append(connection)
        return connection

    with patch.object(db.engine, "connect", side_effect=connect), patch(
        "application.utilities.schema_check.compare_metadata",
        side_effect=RuntimeError("comparison failed"),
    ):
        check_for_schema_drift(test_app)

    # The list keeps the connection alive, so garbage collection cannot hide a leak
    assert len(opened) == 1
    assert opened[0].closed


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


def _report_for(test_app):
    diff_data = [("add_table", "test_table")]
    with patch("application.utilities.schema_check.compare_metadata", return_value=diff_data):
        with patch("application.utilities.schema_check.logger.error") as mock_log_error:
            check_for_schema_drift(test_app)
    return mock_log_error.call_args.args[0]


def _commands(report):
    """The commands the report tells the developer to run, in order, with a marker
    where the advice turns to a model change of the developer's own."""
    found = []
    for line in report.splitlines():
        if line.startswith("        flask db "):
            found.append(line.strip())
        elif "You changed a model yourself" in line:
            found.append("You changed a model yourself")
    return found


def test_report_for_a_database_built_by_create_all_says_delete_or_stamp(test_app):
    """The test database is such a database: Alembic has no revision for it, so
    neither 'flask db upgrade' nor 'flask db migrate' can be run on it as it is."""
    report = _report_for(test_app)

    assert "This database has no Alembic revision" in report
    assert "delete the database file" in report
    # Stamp before upgrade, and a new migration only for a change of your own
    assert _commands(report) == [
        "flask db stamp <revision>",
        "flask db upgrade",
        "You changed a model yourself",
        'flask db migrate -m "describe the change"',
        "flask db upgrade",
    ]
    assert "docs/infrastructure_and_devops.md, section 8" in report


def test_report_for_a_stamped_database_says_upgrade(test_app):
    with patch(
        "application.utilities.schema_check.MigrationContext.get_current_heads",
        return_value=("abc123def456",),
    ):
        report = _report_for(test_app)

    assert "This database is at Alembic revision abc123def456." in report
    assert "flask db stamp" not in report
    assert "delete the database file" not in report
    # Applying a pulled migration comes first; a new one is for a change of your own
    assert _commands(report) == [
        "flask db upgrade",
        "You changed a model yourself",
        'flask db migrate -m "describe the change"',
        "flask db upgrade",
    ]


def test_schema_check_without_drift_does_not_ask_for_the_revision(test_app):
    with patch("application.utilities.schema_check.compare_metadata", return_value=[]):
        with patch(
            "application.utilities.schema_check.MigrationContext.get_current_heads"
        ) as heads:
            check_for_schema_drift(test_app)

    heads.assert_not_called()


# log_schema_drift_summary: the production start-up line


def _summary_for(test_app, diff, heads=()):
    with patch("application.utilities.schema_check.compare_metadata", return_value=diff):
        with patch(
            "application.utilities.schema_check.MigrationContext.get_current_heads",
            return_value=heads,
        ):
            with patch("application.utilities.schema_check.logger") as log:
                log_schema_drift_summary(test_app)
    return log


def test_summary_without_drift_is_one_info_line(test_app):
    log = _summary_for(test_app, [])

    log.info.assert_called_once_with("The database schema matches the models.")
    log.error.assert_not_called()
    log.warning.assert_not_called()


def test_summary_with_drift_is_one_error_line_that_names_the_revision_and_the_commands(test_app):
    log = _summary_for(test_app, [("add_table", "t1"), ("remove_column", None, "users", "x")], heads=("abc123def456",))

    log.error.assert_called_once()
    template, count, revision, shown, more = log.error.call_args.args
    line = template % (count, revision, shown, more)
    assert "2 difference(s)" in line
    assert "Alembic revision: abc123def456" in line
    assert "flask db check" in line
    assert "flask db upgrade" in line
    assert "('add_table', 't1')" in shown
    assert more == ""
    # The long developer report (delete the database, stamp it) is not for production
    assert "DATABASE SCHEMA DRIFT DETECTED" not in line
    assert "delete the database" not in line


def test_summary_of_an_unstamped_database_says_so(test_app):
    log = _summary_for(test_app, [("add_table", "t1")])

    assert log.error.call_args.args[2] == "none"


def test_summary_lists_only_the_first_differences(test_app):
    diff = [("add_table", f"table_{n}") for n in range(SUMMARY_MAX_DIFFS + 7)]

    log = _summary_for(test_app, diff)

    _, count, _, shown, more = log.error.call_args.args
    assert count == SUMMARY_MAX_DIFFS + 7
    assert shown.count("add_table") == SUMMARY_MAX_DIFFS
    assert more == "; ... and 7 more"


def test_summary_never_raises_and_logs_the_failure(test_app):
    with patch.object(db.engine, "connect", side_effect=Exception("DB connection error")):
        with patch("application.utilities.schema_check.logger.exception") as log_exception:
            assert log_schema_drift_summary(test_app) is None

    log_exception.assert_called_once()
    assert "DB connection error" in log_exception.call_args.args[0]


def test_summary_stays_quiet_for_a_database_with_no_tables(test_app):
    with patch("application.utilities.schema_check.inspect") as inspector:
        inspector.return_value.get_table_names.return_value = []
        with patch("application.utilities.schema_check.compare_metadata") as compare:
            with patch("application.utilities.schema_check.logger") as log:
                log_schema_drift_summary(test_app)

    compare.assert_not_called()
    log.info.assert_not_called()
    log.error.assert_not_called()


def test_summary_closes_its_connection_when_the_comparison_fails(test_app):
    real_connect = db.engine.connect
    opened = []

    def connect():
        connection = real_connect()
        opened.append(connection)
        return connection

    with patch.object(db.engine, "connect", side_effect=connect), patch(
        "application.utilities.schema_check.compare_metadata",
        side_effect=RuntimeError("comparison failed"),
    ):
        log_schema_drift_summary(test_app)

    assert len(opened) == 1
    assert opened[0].closed
