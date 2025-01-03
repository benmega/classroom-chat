from application import db
from application.models import Conversation

def test_conversation_creation(init_db):
    """Test creating a Conversation entry."""
    conversation = Conversation(title="Test Conversation")
    db.session.add(conversation)
    db.session.commit()

    retrieved_conversation = Conversation.query.first()
    assert retrieved_conversation is not None
    assert retrieved_conversation.title == "Test Conversation"
    assert isinstance(retrieved_conversation.created_at, datetime)

def test_conversation_default_title(init_db):
    """Test default title generation for a Conversation."""
    conversation = Conversation()
    db.session.add(conversation)
    db.session.commit()

    retrieved_conversation = Conversation.query.first()
    assert retrieved_conversation is not None
    assert "New Conversation" in retrieved_conversation.title

def test_conversation_users_relationship(sample_conversation):
    """Test the relationship between Conversation and User."""
    conversation = sample_conversation
    assert len(conversation.users) == 2
    assert conversation.users[0].username == "User1"
    assert conversation.users[1].username == "User2"

def test_conversation_messages_relationship(sample_conversation, init_db):
    """Test the relationship between Conversation and Message."""
    from application.models import Message  # Import Message model for the test

    conversation = sample_conversation
    message = Message(content="Test Message", conversation=conversation)
    db.session.add(message)
    db.session.commit()

    retrieved_conversation = Conversation.query.first()
    assert len(retrieved_conversation.messages) == 1
    assert retrieved_conversation.messages[0].content == "Test Message"

def test_conversation_repr(sample_conversation):
    """Test the __repr__ method of Conversation."""
    conversation = sample_conversation
    assert repr(conversation) == f"<Conversation {conversation.id}: {conversation.title}>"

def test_conversation_deletion_cascade(sample_conversation, init_db):
    """Test that deleting a Conversation also deletes its messages."""
    from application.models import Message

    conversation = sample_conversation
    message = Message(content="Message to be deleted", conversation=conversation)
    db.session.add(message)
    db.session.commit()

    db.session.delete(conversation)
    db.session.commit()

    assert Conversation.query.get(conversation.id) is None
    assert Message.query.first() is None
