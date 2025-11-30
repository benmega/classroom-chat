"""
File: test_message.py
Type: py
Summary: Unit tests for message model.
"""

import random
import string
from datetime import datetime

from application import db
from application.models.message import Message


def test_message_creation(init_db, sample_user, sample_conversation):
    """Test creating a message."""
    content = "Hello, this is a dynamically generated message!"
    message = Message(
        conversation_id=sample_conversation.id,
        user_id=sample_user.id,
        content=content,
        message_type="text"
    )
    db.session.add(message)
    db.session.commit()

    retrieved_message = Message.query.first()
    assert retrieved_message is not None
    assert retrieved_message.content == content
    assert retrieved_message.message_type == "text"
    assert isinstance(retrieved_message.created_at, datetime)


def test_message_repr(sample_message):
    """Test the __repr__ method of Message."""
    message = sample_message
    expected_repr = f"<Message(id={message.id}, conversation_id={message.conversation_id}, user_id={message.user_id})>"
    assert repr(message) == expected_repr


def test_message_types(init_db, sample_user, sample_conversation):
    """Test creating messages with different message types."""
    message_types = ["text", "link", "code_snippet"]
    for msg_type in message_types:
        content = f"This is a {msg_type} message."
        message = Message(
            conversation_id=sample_conversation.id,
            user_id=sample_user.id,
            content=content,
            message_type=msg_type
)
        db.session.add(message)
        db.session.commit()

        retrieved_message = Message.query.filter_by(message_type=msg_type).first()
        assert retrieved_message.content == content
        assert retrieved_message.message_type == msg_type


def test_message_strike_flag(sample_message):
    """Test toggling the is_struck flag."""
    message = sample_message
    assert not message.is_struck

    message.is_struck = True
    db.session.commit()

    updated_message = Message.query.get(message.id)
    assert updated_message.is_struck is True


def test_message_edit(sample_message):
    """Test editing a message."""
    message = sample_message
    new_content = "Updated content for the message."
    message.content = new_content
    message.edited_at = datetime.utcnow()
    db.session.commit()

    updated_message = Message.query.get(message.id)
    assert updated_message.content == new_content
    assert updated_message.edited_at is not None


def test_message_soft_delete(sample_message):
    """Test soft-deleting a message by setting deleted_at."""
    message = sample_message
    deletion_time = datetime.utcnow()
    message.deleted_at = deletion_time
    db.session.commit()

    deleted_message = Message.query.get(message.id)
    assert deleted_message.deleted_at == deletion_time


def test_dynamic_message_generation(init_db, sample_user, sample_conversation):
    """Test creating messages with random data to simulate real-world conditions."""
    for _ in range(10):  # Generate 10 random messages
        content = ''.join(random.choices(string.ascii_letters + string.digits, k=50))
        msg_type = random.choice(["text", "link", "code_snippet"])
        message = Message(
            conversation_id=sample_conversation.id,
            user_id=sample_user.id,
            content=content,
            message_type=msg_type
)
        db.session.add(message)
    db.session.commit()

    messages = Message.query.all()
    assert len(messages) == 10
    assert all(isinstance(msg, Message) for msg in messages)
