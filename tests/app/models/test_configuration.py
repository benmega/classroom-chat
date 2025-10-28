from application import db
from application.models.configuration import Configuration
from application.models.conversation import Conversation


def test_conversation_history(client, init_db, sample_user):
    """Test conversation history page."""
    # Create a conversation and associate it with the sample_user
    conversation = Conversation(title="User Conversation")
    conversation.users.append(sample_user)
    db.session.add(conversation)
    db.session.commit()

    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    response = client.get('/message/conversation_history')
    assert response.status_code == 200
    assert b'User Conversation' in response.data

def test_configuration_default_values(init_db):
    """Test the default values of Configuration fields."""
    config = Configuration()
    db.session.add(config)
    db.session.commit()

    retrieved_config = Configuration.query.first()
    assert retrieved_config is not None
    assert retrieved_config.ai_teacher_enabled is False
    assert retrieved_config.message_sending_enabled is False

def test_configuration_query(sample_configuration):
    """Test querying Configuration entries."""
    config = sample_configuration
    retrieved_config = Configuration.query.filter_by(ai_teacher_enabled=True).first()
    assert retrieved_config is not None
    assert retrieved_config.message_sending_enabled is True

def test_configuration_update(sample_configuration):
    """Test updating a Configuration entry."""
    config = sample_configuration
    config.message_sending_enabled = True
    db.session.commit()

    updated_config = Configuration.query.get(config.id)
    assert updated_config is not None
    assert updated_config.message_sending_enabled is True

def test_configuration_repr(sample_configuration):
    """Test the __repr__ method of Configuration."""
    config = sample_configuration
    assert repr(config) == f"<Configuration {config.id}>"
