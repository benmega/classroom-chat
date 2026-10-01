from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from application.extensions import db
from application.models.session_log import SessionLog
from application.models.user import User
from application.utilities.session_cleanup import close_stale_sessions


@pytest.fixture
def logged_in_client_with_session(client, sample_user):
    # Log in
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
        sess["_user_id"] = str(sample_user.id)
    # Start a session log
    SessionLog.start_session(sample_user.id)
    return client


def test_heartbeat_unauthenticated(client):
    resp = client.post("/api/session/heartbeat")
    assert resp.status_code == 400
    assert resp.json["success"] is False


@patch("application.routes.session_routes.get_cloudwatch_client")
@patch("application.routes.session_routes.requests.get")
def test_heartbeat_authenticated(
    mock_get, mock_cw_client, logged_in_client_with_session
):
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"instanceId": "i-test12345", "region": "us-west-2"}
    mock_get.return_value = mock_resp

    mock_cw = MagicMock()
    mock_cw_client.return_value = mock_cw

    resp = logged_in_client_with_session.post("/api/session/heartbeat")
    assert resp.status_code == 200
    assert resp.json["success"] is True
    assert "timestamp" in resp.json

    mock_cw.put_metric_data.assert_called_once()


@patch("application.routes.session_routes.get_cloudwatch_client")
def test_heartbeat_cloudwatch_error(mock_cw_client, logged_in_client_with_session):
    # Simulate a CloudWatch failure
    mock_cw = MagicMock()
    mock_cw.put_metric_data.side_effect = Exception("CloudWatch down")
    mock_cw_client.return_value = mock_cw

    resp = logged_in_client_with_session.post("/api/session/heartbeat")
    assert resp.status_code == 200
    assert resp.json["success"] is True


@patch("application.routes.session_routes.get_cloudwatch_client")
def test_heartbeat_refreshes_last_seen_of_the_open_session(mock_cw_client, logged_in_client_with_session, sample_user):
    log = SessionLog.query.filter_by(user_id=sample_user.id, end_time=None).one()
    log.last_seen = datetime.utcnow() - timedelta(minutes=5)
    db.session.commit()

    resp = logged_in_client_with_session.post("/api/session/heartbeat")

    assert resp.status_code == 200
    db.session.expire_all()
    assert SessionLog.query.filter_by(user_id=sample_user.id, end_time=None).one().last_seen > (
        datetime.utcnow() - timedelta(minutes=1)
    )


@patch("application.routes.session_routes.get_cloudwatch_client")
def test_heartbeat_reopens_session_the_cleanup_job_closed(mock_cw_client, client, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
    # The user was away long enough for close_stale_sessions to end their session
    log = SessionLog.start_session(sample_user.id)
    sample_user.is_online = True
    log.last_seen = datetime.utcnow() - timedelta(minutes=30)
    db.session.commit()
    assert close_stale_sessions(timeout_minutes=10) == 1
    assert db.session.get(User, sample_user.id).is_online is False

    resp = client.post("/api/session/heartbeat")

    assert resp.status_code == 200
    assert resp.json["success"] is True
    db.session.expire_all()
    assert db.session.get(User, sample_user.id).is_online is True
    open_logs = SessionLog.query.filter_by(user_id=sample_user.id, end_time=None).all()
    assert len(open_logs) == 1
    assert open_logs[0].id != log.id
