import pytest
from unittest.mock import patch, MagicMock
from application.extensions import db
from application.models.user import User
from application.models.ai_settings import AISettings

def set_ai_bot_enabled(enabled: bool):
    val_str = "True" if enabled else "False"
    setting = AISettings.query.filter_by(key="chat_bot_enabled").first()
    if not setting:
        setting = AISettings(key="chat_bot_enabled", value=val_str)
        db.session.add(setting)
    else:
        setting.value = val_str
    db.session.commit()

@pytest.fixture
def enable_ai(init_db):
    set_ai_bot_enabled(True)

@pytest.fixture
def disable_ai(init_db):
    set_ai_bot_enabled(False)

def test_ai_disabled(client, disable_ai, sample_user):
    resp = client.post("/ai/get_ai_response", data={"message": "hello", "username": sample_user.username})
    assert resp.status_code == 200
    assert resp.json["success"] is True
    assert "disabled" in resp.json["ai_response"]

def test_ai_user_not_found(client, enable_ai):
    resp = client.post("/ai/get_ai_response", data={"message": "hello", "username": "nonexistent_user"})
    assert resp.status_code == 200
    assert "User not found" in resp.json["ai_response"]

@patch("application.ai.ai_teacher.requests.post")
def test_ai_teacher_success(mock_post, client, enable_ai, sample_user):
    # Mock Ollama response
    mock_resp = MagicMock()
    mock_resp.ok = True
    mock_resp.json.return_value = {"response": "I am your teacher."}
    mock_post.return_value = mock_resp

    resp = client.post("/ai/get_ai_response", data={"message": "hello", "username": sample_user.username})
    assert resp.status_code == 200
    assert resp.json["success"] is True
    assert resp.json["ai_response"] == "I am your teacher."

    # Verify that AI teacher user was created in DB
    ai_teacher = db.session.get(User, 0)
    assert ai_teacher is not None

@patch("application.ai.ai_teacher.requests.post")
def test_ai_teacher_ollama_failure(mock_post, client, enable_ai, sample_user):
    # Mock Ollama API returning 500 error
    mock_resp = MagicMock()
    mock_resp.ok = False
    mock_resp.status_code = 500
    mock_resp.text = "Internal error"
    mock_post.return_value = mock_resp

    resp = client.post("/ai/get_ai_response", data={"message": "hello", "username": sample_user.username})
    assert resp.status_code == 200
    assert "Error:" in resp.json["ai_response"]
