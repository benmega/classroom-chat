"""
File: test_app_extension_startup.py
Type: py
Summary: create_app() stops when Socket.IO or the scheduler cannot start, except under test.

A production boot without websockets or without its scheduler used to come up green: the
failure was swallowed, /server/health passed and deploy.sh kept the release (issue #106).
"""

from unittest.mock import patch

import pytest
from application import create_app
from application.config import ProductionConfig, TestingConfig
from application.extensions import scheduler, socketio


@pytest.fixture
def keep_socketio_state(monkeypatch):
    """A failed SocketIO.init_app leaves its options behind on the shared object: put them back."""
    monkeypatch.setattr(socketio, "server_options", dict(socketio.server_options))
    monkeypatch.setattr(socketio, "server", socketio.server)


def _production_config(**overrides):
    return type("ExtensionStartupConfig", (ProductionConfig,), overrides)


def test_a_production_boot_stops_when_socketio_cannot_start(caplog):
    with (
        patch.object(scheduler, "start"),
        patch.object(socketio, "init_app", side_effect=ValueError("Invalid async_mode specified")),
        caplog.at_level("ERROR", logger="application"),
        pytest.raises(ValueError, match="Invalid async_mode"),
    ):
        create_app(_production_config())

    assert "Could not initialise Socket.IO" in caplog.text
    assert "Invalid async_mode specified" in caplog.text  # the traceback is logged too


def test_a_production_boot_stops_when_the_scheduler_cannot_start(caplog):
    with (
        patch.object(scheduler, "start"),
        patch.object(socketio, "init_app"),
        patch.object(scheduler, "init_app", side_effect=RuntimeError("scheduler broken")),
        caplog.at_level("ERROR", logger="application"),
        pytest.raises(RuntimeError, match="scheduler broken"),
    ):
        create_app(_production_config())

    assert "Could not initialise the scheduler" in caplog.text


def test_a_misspelt_socketio_async_mode_stops_a_production_boot(keep_socketio_state, caplog):
    config = _production_config(SOCKETIO_ASYNC_MODE="gevnet")

    with (
        patch.object(scheduler, "start"),
        caplog.at_level("ERROR", logger="application"),
        pytest.raises(ValueError, match="async_mode"),
    ):
        create_app(config)

    assert "Could not initialise Socket.IO" in caplog.text


def test_a_test_app_logs_the_failure_and_starts_without_socketio(caplog):
    with (
        patch.object(scheduler, "start"),
        patch.object(socketio, "init_app", side_effect=ValueError("no websockets here")),
        caplog.at_level("ERROR", logger="application"),
    ):
        app = create_app(TestingConfig)

    assert app.config["TESTING"]
    assert "Could not initialise Socket.IO" in caplog.text
    assert "no websockets here" in caplog.text
    assert app.test_client().get("/server/health").status_code == 200


def test_a_test_app_logs_the_failure_and_starts_without_the_scheduler(caplog):
    with (
        patch.object(socketio, "init_app"),
        patch.object(scheduler, "init_app", side_effect=RuntimeError("scheduler broken")),
        caplog.at_level("ERROR", logger="application"),
    ):
        app = create_app(TestingConfig)

    assert "Could not initialise the scheduler" in caplog.text
    assert app.test_client().get("/server/health").status_code == 200


def test_a_healthy_boot_logs_no_initialisation_error(caplog):
    with (
        patch.object(scheduler, "start"),
        patch.object(socketio, "init_app"),
        caplog.at_level("ERROR", logger="application"),
    ):
        create_app(TestingConfig)

    assert "Could not initialise" not in caplog.text
