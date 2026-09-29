"""
File: test_message_routes.py
Type: py
Summary: Unit tests for message routes Flask routes.
"""

import json

from application import db
from application.constants import GLOBAL_CLASSROOM_ID
from application.models.classroom import Classroom
from application.models.conversation import Conversation


def test_http_send_message_route_removed(client, sample_user):
    """Chat is Socket.IO only; the legacy HTTP send route no longer exists."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
    response = client.post("/message/send_message", data={"message": "Hello!"})
    assert response.status_code in (404, 405)


def test_start_conversation(client, init_db, sample_admin):
    """Test starting a new conversation (Admin only)."""
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    # Ensure classroom exists
    if not db.session.get(Classroom, GLOBAL_CLASSROOM_ID):
        db.session.add(Classroom(id=GLOBAL_CLASSROOM_ID, name="Global", language="python", url="http://test"))
        db.session.commit()

    response = client.post(
        "/message/start_conversation", 
        data={"title": "Test Conversation", "classroom_id": GLOBAL_CLASSROOM_ID}
    )


    assert response.status_code == 201
    data = json.loads(response.data)
    assert "conversation_id" in data
    assert data["title"] == "Test Conversation"


def test_set_active_conversation(client, init_db, sample_user):
    """Test setting active conversation."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # Create a conversation
    conversation = Conversation(title="Test Conversation", classroom_id=GLOBAL_CLASSROOM_ID)
    db.session.add(conversation)
    db.session.commit()

    response = client.post(
        "/message/set_active_conversation", json={"conversation_id": conversation.id}
    )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["conversation_id"] == conversation.id


def test_set_active_conversation_not_found(client, init_db, sample_user):
    """Test setting active conversation with an invalid ID."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post(
        "/message/set_active_conversation", json={"conversation_id": 999}
    )

    assert response.status_code == 404
    assert b"Conversation not found" in response.data


def test_get_current_conversation(client, init_db, sample_user):
    """Test retrieving the current conversation."""
    # Create a conversation
    conversation = Conversation(title="Test Conversation", classroom_id=GLOBAL_CLASSROOM_ID)
    db.session.add(conversation)
    db.session.commit()

    # Set session for user
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
        sess["conversation_id"] = conversation.id

    response = client.get("/message/get_current_conversation", headers={"Accept": "application/json"})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "conversation_id" in data["conversation"]
    assert data["conversation"]["title"] == conversation.title


def test_get_historical_conversation(client, init_db, sample_user):
    """Test retrieving historical conversation."""
    # Create a conversation
    conversation = Conversation(title="Test Historical Conversation", classroom_id=GLOBAL_CLASSROOM_ID)
    db.session.add(conversation)
    db.session.commit()

    # Set session for user
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
        sess["conversation_id"] = conversation.id

    response = client.get("/message/get_historical_conversation", headers={"Accept": "application/json"})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["conversation"]["conversation_id"] == conversation.id


def test_end_conversation(client, sample_user):
    """Test ending a conversation."""
    # Set up session
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
        sess["conversation_id"] = 12345


    response = client.post("/message/end_conversation", headers={"Accept": "application/json"})
    assert response.status_code == 200
    assert b"Conversation ended" in response.data


def test_get_conversation(client, init_db):
    """Test retrieving conversation by session."""
    conversation = Conversation(title="Test Conversation", classroom_id=GLOBAL_CLASSROOM_ID)
    db.session.add(conversation)
    db.session.commit()

    # Set session
    with client.session_transaction() as sess:
        sess["user"] = 1 # Any user ID for this test since it's simple
        sess["conversation_id"] = conversation.id

    response = client.get("/message/get_conversation", headers={"Accept": "application/json"})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["conversation"]["conversation_id"] == conversation.id


def test_conversation_history(client, init_db, sample_user):
    """Test conversation history page."""
    # Create a conversation and associate it with the sample_user
    conversation = Conversation(title="User Conversation", classroom_id=GLOBAL_CLASSROOM_ID)
    conversation.users.append(sample_user)
    db.session.add(conversation)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/message/conversation_history", headers={"Accept": "application/json"})
    assert response.status_code == 200
    assert b"User Conversation" in response.data


def test_get_conversation_history(client, init_db, sample_user):
    """Test retrieving conversation history for a user."""
    # Create a conversation and associate it with the sample_user
    conversation = Conversation(title="User Conversation", classroom_id=GLOBAL_CLASSROOM_ID)
    conversation.users.append(sample_user)
    db.session.add(conversation)
    db.session.commit()

    # Call the API endpoint
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get(
        f"/message/api/conversations/{sample_user.id}",
        headers={"Accept": "application/json"},
    )
    assert response.status_code == 200

    # Parse the response data
    data = json.loads(response.data)
    assert len(data) > 0
    assert data[0]["title"] == "User Conversation"


def test_view_conversation(client, init_db, sample_user):
    """Test viewing conversation details."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    conversation = Conversation(title="Detailed Conversation", classroom_id=GLOBAL_CLASSROOM_ID)

    db.session.add(conversation)
    db.session.commit()

    response = client.get(f"/message/view_conversation/{conversation.id}", headers={"Accept": "application/json"})
    assert response.status_code == 200
    assert b"Detailed Conversation" in response.data
