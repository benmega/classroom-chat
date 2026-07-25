from unittest.mock import MagicMock, patch

import pytest
from application.extensions import db
from application.models.ai_settings import AISettings
from application.models.user import User


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


def _login(client, user):
    with client.session_transaction() as sess:
        sess["user"] = user.id


def test_ai_requires_login(client, enable_ai):
    resp = client.post("/ai/get_ai_response", data={"message": "hello"})
    assert resp.status_code in (302, 401)


def test_ai_disabled(client, disable_ai, sample_user):
    _login(client, sample_user)
    resp = client.post("/ai/get_ai_response", data={"message": "hello"})
    assert resp.status_code == 200
    assert resp.json["success"] is True
    assert "disabled" in resp.json["ai_response"]


def test_ai_ignores_client_supplied_username(
    client, enable_ai, sample_user, sample_admin
):
    """The endpoint must always act as the logged-in user, never the
    client-supplied 'username' field — otherwise anyone could impersonate
    another student when posting to the AI teacher / global feed."""
    _login(client, sample_user)
    resp = client.post(
        "/ai/get_ai_response",
        data={"message": "hello", "username": sample_admin.username},
    )
    assert resp.status_code == 200

    from application.models.message import Message

    last_message = (
        Message.query.filter_by(user_id=sample_user.id)
        .order_by(Message.id.desc())
        .first()
    )
    assert last_message is not None
    assert last_message.content == "hello"


@patch("application.ai.ai_teacher.requests.post")
def test_ai_teacher_success(mock_post, client, enable_ai, sample_user):
    mock_resp = MagicMock()
    mock_resp.ok = True
    mock_resp.json.return_value = {"response": "I am your teacher."}
    mock_post.return_value = mock_resp

    _login(client, sample_user)
    resp = client.post("/ai/get_ai_response", data={"message": "hello"})
    assert resp.status_code == 200
    assert resp.json["success"] is True
    assert resp.json["ai_response"] == "I am your teacher."

    ai_teacher = db.session.get(User, 0)
    assert ai_teacher is not None


@patch("application.ai.ai_teacher.requests.post")
def test_ai_teacher_ollama_failure(mock_post, client, enable_ai, sample_user):
    mock_resp = MagicMock()
    mock_resp.ok = False
    mock_resp.status_code = 500
    mock_resp.text = "Internal error"
    mock_post.return_value = mock_resp

    _login(client, sample_user)
    resp = client.post("/ai/get_ai_response", data={"message": "hello"})
    assert resp.status_code == 200
    assert "Error:" in resp.json["ai_response"]
