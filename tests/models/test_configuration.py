from application import db
from application.models.configuration import Configuration

def test_configuration_creation(init_db):
    """Test creating a Configuration entry."""
    config = Configuration(
        ai_teacher_enabled=False,
        message_sending_enabled=True
    )
    db.session.add(config)
    db.session.commit()

    retrieved_config = Configuration.query.first()
    assert retrieved_config is not None
    assert retrieved_config.ai_teacher_enabled is False
    assert retrieved_config.message_sending_enabled is True

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
    assert retrieved_config.message_sending_enabled is False

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
