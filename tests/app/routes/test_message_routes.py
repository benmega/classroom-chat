"""
File: test_message_routes.py
Type: py
Summary: Unit tests for message routes Flask routes.
"""

import json

from application import db, Configuration
from application.models.conversation import Conversation


def test_send_message(client, init_db, sample_admin):
    """Test sending a message."""
    # Set up session for user

    with client.session_transaction() as sess:
        sess["user"] = sample_admin.username

    # Create configuration
    config = Configuration(message_sending_enabled=True, ai_teacher_enabled=False)
    init_db.session.add(config)
    init_db.session.commit()

    # Mock dependencies
    from unittest.mock import patch

    with patch(
        "application.routes.message_routes.get_user", return_value=sample_admin
    ), patch(
        "application.routes.message_routes.message_is_appropriate", return_value=True
    ), patch(
        "application.routes.message_routes.save_message_to_db", return_value=True
    ):
        response = client.post("/message/send_message", data={"message": "Hello!"})
        print(response.data.decode())  # Output the response content for debugging
        assert response.status_code == 200
        assert b"success" in response.data


def test_send_empty_message(client, init_db, sample_admin):
    """Test sending an empty message."""
    # Set up session for user
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.username

    # Mock dependencies
    from unittest.mock import patch

    with patch(
        "application.routes.message_routes.get_user", return_value=sample_admin
    ):
        response = client.post("/message/send_message", data={"message": " "})
        assert response.status_code == 400
        assert b"Message content cannot be empty" in response.data


def test_send_message_no_session(client):
    """Test sending message with no active session."""
    response = client.post("/message/send_message", data={"message": "Hello!"})
    assert response.status_code == 400
    assert b"No session username found" in response.data


def test_send_message_inappropriate(client, init_db, sample_user, sample_configuration):
    """Test sending an inappropriate message."""
    # Set up session for user
    with client.session_transaction() as sess:
        sess["user"] = sample_user.username

    # Mock dependencies
    from unittest.mock import patch

    with patch(
        "application.routes.message_routes.message_is_appropriate", return_value=False
    ):
        response = client.post("/message/send_message", data={"message": "Poop!"})

    print(response.data.decode())  # Output the response content for debugging
    assert response.status_code == 403
    assert b"Inappropriate messages are not allowed" in response.data


def test_start_conversation(client, init_db):
    """Test starting a new conversation."""
    response = client.post(
        "/message/start_conversation", data={"title": "Test Conversation"}
    )
    assert response.status_code == 201
    data = json.loads(response.data)
    assert "conversation_id" in data
    assert data["title"] == "Test Conversation"


def test_set_active_conversation(client, init_db, sample_user):
    """Test setting active conversation."""
    # Create a conversation
    conversation = Conversation(title="Test Conversation")
    db.session.add(conversation)
    db.session.commit()

    response = client.post(
        "/message/set_active_conversation", json={"conversation_id": conversation.id}
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["conversation_id"] == conversation.id


def test_set_active_conversation_not_found(client, init_db):
    """Test setting active conversation with an invalid ID."""
    response = client.post(
        "/message/set_active_conversation", json={"conversation_id": 999}
    )
    assert response.status_code == 404
    assert b"Conversation not found" in response.data


def test_get_current_conversation(client, init_db, sample_user):
    """Test retrieving the current conversation."""
    # Create a conversation
    conversation = Conversation(title="Test Conversation")
    db.session.add(conversation)
    db.session.commit()

    # Set session for user
    with client.session_transaction() as sess:
        sess["conversation_id"] = conversation.id

    response = client.get("/message/get_current_conversation")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "conversation_id" in data["conversation"]
    assert data["conversation"]["title"] == conversation.title


def test_get_historical_conversation(client, init_db, sample_user):
    """Test retrieving historical conversation."""
    # Create a conversation
    conversation = Conversation(title="Test Historical Conversation")
    db.session.add(conversation)
    db.session.commit()

    # Set session for user
    with client.session_transaction() as sess:
        sess["conversation_id"] = conversation.id

    response = client.get("/message/get_historical_conversation")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["conversation"]["conversation_id"] == conversation.id


def test_end_conversation(client):
    """Test ending a conversation."""
    # Set up session
    with client.session_transaction() as sess:
        sess["conversation_id"] = 12345

    response = client.post("/message/end_conversation")
    assert response.status_code == 200
    assert b"Conversation ended" in response.data


def test_get_conversation(client, init_db):
    """Test retrieving conversation by session."""
    conversation = Conversation(title="Test Conversation")
    db.session.add(conversation)
    db.session.commit()

    # Set session
    with client.session_transaction() as sess:
        sess["conversation_id"] = conversation.id

    response = client.get("/message/get_conversation")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["conversation"]["conversation_id"] == conversation.id


def test_conversation_history(client, init_db, sample_user):
    """Test conversation history page."""
    # Create a conversation and associate it with the sample_user
    conversation = Conversation(title="User Conversation")
    conversation.users.append(sample_user)
    db.session.add(conversation)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/message/conversation_history")
    assert response.status_code == 200
    assert b"User Conversation" in response.data


def test_get_conversation_history(client, init_db, sample_user):
    """Test retrieving conversation history for a user."""
    # Create a conversation and associate it with the sample_user
    conversation = Conversation(title="User Conversation")
    conversation.users.append(sample_user)
    db.session.add(conversation)
    db.session.commit()

    # Call the API endpoint
    response = client.get(f"/message/api/conversations/{sample_user.id}")
    assert response.status_code == 200

    # Parse the response data
    data = json.loads(response.data)
    assert len(data) > 0
    assert data[0]["title"] == "User Conversation"


def test_view_conversation(client, init_db):
    """Test viewing conversation details."""
    conversation = Conversation(title="Detailed Conversation")
    db.session.add(conversation)
    db.session.commit()

    response = client.get(f"message/view_conversation/{conversation.id}")
    assert response.status_code == 200
    assert b"Detailed Conversation" in response.data
