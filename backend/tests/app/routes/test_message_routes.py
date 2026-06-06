"""
File: test_message_routes.py
Type: py
Summary: Unit tests for message routes Flask routes.
"""

import json

from application import db, Configuration
from application.constants import GLOBAL_CLASSROOM_ID
from application.models.conversation import Conversation
from application.models.classroom import Classroom
from application.models.user import User


def test_send_message(client, init_db, sample_admin):
    """Test sending a message."""
    # Set up session for user

    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    # Create configuration
    config = Configuration(message_sending_enabled=True, ai_teacher_enabled=False)
    init_db.session.add(config)
    init_db.session.commit()

    # Create a non-locked conversation and enroll user
    classroom = Classroom(id="test-class", name="Test Class", language="python", url="http://test")
    db.session.add(classroom)
    # Re-fetch user to avoid detached instance issues if any
    db_user = db.session.get(User, sample_admin.id)
    classroom.users.append(db_user)
    
    conversation = Conversation(title="Test", classroom_id="test-class")
    db.session.add(conversation)
    db.session.commit()


    # Mock dependencies
    from unittest.mock import patch

    with patch(
        "application.routes.message_routes.message_is_appropriate", return_value=True
    ), patch(
        "application.routes.message_routes.save_message_to_db", return_value=True
    ):
        response = client.post("/message/send_message", data={"message": "Hello!", "conversation_id": conversation.id})
        print(response.data.decode())  # Output the response content for debugging
        assert response.status_code == 200
        assert b"success" in response.data


def test_send_message_no_session(client):
    """Test sending message with no active session."""
    response = client.post("/message/send_message", data={"message": "Hello!"})
    assert response.status_code == 400
    assert b"No session username found" in response.data


def test_send_message_inappropriate(client, init_db, sample_user, sample_configuration):
    """Test sending an inappropriate message."""
    # Set up session for user
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # Mock dependencies
    from unittest.mock import patch

    with patch(
        "application.routes.message_routes.message_is_appropriate", return_value=False
    ):
        # Create a non-locked conversation and enroll user
        classroom = Classroom(id="test-class-2", name="Test Class 2", language="python", url="http://test")
        db.session.add(classroom)
        db_user = db.session.get(User, sample_user.id)
        classroom.users.append(db_user)
        
        conversation = Conversation(title="Test 2", classroom_id="test-class-2")
        db.session.add(conversation)
        db.session.commit()

        
        response = client.post("/message/send_message", data={"message": "Poop!", "conversation_id": conversation.id})

    print(response.data.decode())  # Output the response content for debugging
    assert response.status_code == 403
    assert b"Inappropriate messages are not allowed" in response.data


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


def test_delete_message_as_admin(client, init_db, sample_admin):
    """Test message deletion by admin."""
    from application.models.message import Message

    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    conversation = Conversation(title="Delete Chat", classroom_id=GLOBAL_CLASSROOM_ID)
    db.session.add(conversation)
    db.session.commit()

    msg = Message(content="This message will be deleted", user_id=sample_admin.id, conversation_id=conversation.id)
    db.session.add(msg)
    db.session.commit()

    response = client.delete(f"/message/delete_message/{msg.id}")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True

    # Re-fetch from DB and verify is_struck
    updated_msg = db.session.get(Message, msg.id)
    assert updated_msg.is_struck is True


def test_delete_message_as_student_forbidden(client, init_db, sample_user, sample_admin):
    """Test message deletion by student returns 403."""
    from application.models.message import Message

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    conversation = Conversation(title="Delete Chat Student", classroom_id=GLOBAL_CLASSROOM_ID)
    db.session.add(conversation)
    db.session.commit()

    msg = Message(content="Should not be deleted by student", user_id=sample_admin.id, conversation_id=conversation.id)
    db.session.add(msg)
    db.session.commit()

    response = client.delete(f"/message/delete_message/{msg.id}")
    assert response.status_code == 403

