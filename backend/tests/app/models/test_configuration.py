"""
File: test_configuration.py
Type: py
Summary: Unit tests for the Configuration model.
"""

from application import db
from application.models.configuration import Configuration


def test_configuration_to_dict_has_no_ai_teacher_flag(init_db):
    """The AI teacher was removed; the column is kept but no longer exposed."""
    config = Configuration()
    db.session.add(config)
    db.session.commit()

    assert config.to_dict() == {
        "id": config.id,
        "message_sending_enabled": True,
        "duck_multiplier": 1,
    }
