from unittest.mock import patch, MagicMock
from application.models.session_log import SessionLog

def test_heartbeat_no_user(client):
    response = client.post("/api/session/heartbeat")
    assert response.status_code == 400
    assert response.json["success"] is False
    assert response.json["error"] == "Missing username"

def test_heartbeat_success(client, init_db, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
        
    from application.extensions import db
    from datetime import datetime
    log = SessionLog(user_id=sample_user.id, start_time=datetime.utcnow())
    db.session.add(log)
    db.session.commit()

    with patch("application.routes.session_routes.get_ec2_metadata") as mock_ec2, \
         patch("application.routes.session_routes.get_cloudwatch_client") as mock_cw:
        
        mock_ec2.return_value = ("test-instance-id", "test-region")
        mock_cw_client = MagicMock()
        mock_cw.return_value = mock_cw_client
        
        response = client.post("/api/session/heartbeat")
        assert response.status_code == 200
        assert response.json["success"] is True
        assert "timestamp" in response.json
        
        mock_cw_client.put_metric_data.assert_called_once()
        
        updated_log = SessionLog.query.get(log.id)
        assert updated_log.last_seen is not None

def test_heartbeat_cloudwatch_error(client, init_db, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
        
    from application.extensions import db
    from datetime import datetime
    log = SessionLog(user_id=sample_user.id, start_time=datetime.utcnow())
    db.session.add(log)
    db.session.commit()

    with patch("application.routes.session_routes.get_ec2_metadata") as mock_ec2, \
         patch("application.routes.session_routes.get_cloudwatch_client") as mock_cw:
        
        mock_ec2.return_value = ("test-instance-id", "test-region")
        mock_cw_client = MagicMock()
        mock_cw_client.put_metric_data.side_effect = Exception("CW Error")
        mock_cw.return_value = mock_cw_client
        
        response = client.post("/api/session/heartbeat")
        assert response.status_code == 200
        assert response.json["success"] is True

def test_heartbeat_no_active_session_log(client, init_db, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
        
    response = client.post("/api/session/heartbeat")
    assert response.status_code == 200
    assert response.json["success"] is True

def test_get_ec2_metadata_success():
    import application.routes.session_routes as session_routes
    session_routes._ec2_metadata_cache = None
    
    with patch("application.routes.session_routes.requests.get") as mock_get:
        mock_response = MagicMock()
        mock_response.json.return_value = {"instanceId": "i-123456", "region": "us-west-2"}
        mock_get.return_value = mock_response
        
        instance_id, region = session_routes.get_ec2_metadata()
        assert instance_id == "i-123456"
        assert region == "us-west-2"

def test_get_ec2_metadata_failure():
    import application.routes.session_routes as session_routes
    session_routes._ec2_metadata_cache = None
    
    with patch("application.routes.session_routes.requests.get") as mock_get:
        mock_get.side_effect = Exception("Connection timeout")
        
        instance_id, region = session_routes.get_ec2_metadata()
        assert instance_id == "i-03afac811de461a56"
        assert region == "ap-southeast-1"

def test_get_cloudwatch_client():
    import application.routes.session_routes as session_routes
    session_routes._ec2_metadata_cache = ("test-id", "test-region")
    
    with patch("application.routes.session_routes.boto3.client") as mock_boto:
        session_routes.get_cloudwatch_client()
        mock_boto.assert_called_with("cloudwatch", region_name="test-region")
