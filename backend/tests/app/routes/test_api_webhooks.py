import pytest
from unittest.mock import patch
from application.extensions import db
from application.models.project import Project

@pytest.fixture
def mock_webhook_secret():
    with patch.dict("os.environ", {"WEBHOOK_SECRET": "secret123"}):
        yield "secret123"

def test_webhook_unauthorized(client):
    # No secret set or invalid secret
    resp = client.post("/api/webhooks/youtube", json={"project_id": 1, "video_id": "123"})
    assert resp.status_code == 401
    assert resp.json["error"] == "Unauthorized"

def test_webhook_youtube_missing_fields(client, mock_webhook_secret):
    resp = client.post("/api/webhooks/youtube", 
                       json={"project_id": 1}, 
                       headers={"X-API-KEY": mock_webhook_secret})
    assert resp.status_code == 400

def test_webhook_youtube_project_not_found(client, mock_webhook_secret, init_db):
    resp = client.post("/api/webhooks/youtube", 
                       json={"project_id": 9999, "video_id": "123"}, 
                       headers={"X-API-KEY": mock_webhook_secret})
    assert resp.status_code == 404

def test_webhook_youtube_success(client, mock_webhook_secret, sample_user):
    p = Project(name="Test Proj", user_id=sample_user.id)
    db.session.add(p)
    db.session.commit()

    resp = client.post("/api/webhooks/youtube", 
                       json={"project_id": p.id, "video_id": "xyz123"}, 
                       headers={"X-API-KEY": mock_webhook_secret})
    assert resp.status_code == 200
    assert resp.json["success"] is True

    db.session.refresh(p)
    assert p.video_url == "https://youtu.be/xyz123"
    assert "xyz123" in p.image_url

def test_webhook_transcribe_success(client, mock_webhook_secret, sample_user):
    p = Project(name="Test Proj", user_id=sample_user.id)
    db.session.add(p)
    db.session.commit()

    # Unauthorized test
    resp = client.post("/api/webhooks/transcribe", json={"project_id": p.id, "transcript": "some text"})
    assert resp.status_code == 401

    resp = client.post("/api/webhooks/transcribe", 
                       json={"project_id": p.id}, 
                       headers={"X-API-KEY": mock_webhook_secret})
    assert resp.status_code == 400

    resp = client.post("/api/webhooks/transcribe", 
                       json={"project_id": 9999, "transcript": "some text"}, 
                       headers={"X-API-KEY": mock_webhook_secret})
    assert resp.status_code == 404

    resp = client.post("/api/webhooks/transcribe", 
                       json={"project_id": p.id, "transcript": "hello world transcript"}, 
                       headers={"X-API-KEY": mock_webhook_secret})
    assert resp.status_code == 200
    assert resp.json["success"] is True

    db.session.refresh(p)
    assert p.video_transcript == "hello world transcript"
