import pytest
from unittest.mock import patch, MagicMock
from application.models.session_log import SessionLog

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
def test_heartbeat_authenticated(mock_get, mock_cw_client, logged_in_client_with_session):
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
