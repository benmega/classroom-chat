"""
File: test_configuration.py
Type: py
Summary: Unit tests for the Configuration model.
"""

from application import db
from application.models.configuration import Configuration


def test_configuration_to_dict_has_no_ai_teacher_flag(init_db):
    """The AI teacher was removed along with its ai_teacher_enabled column."""
    config = Configuration()
    db.session.add(config)
    db.session.commit()

    assert config.to_dict() == {
        "id": config.id,
        "message_sending_enabled": True,
        "duck_multiplier": 1,
    }


def test_get_current_does_not_create_a_row(init_db):
    Configuration.query.delete()
    db.session.commit()

    assert Configuration.get_current() is None
    assert Configuration.query.count() == 0


def test_get_or_create_creates_the_defaults_once(init_db):
    Configuration.query.delete()
    db.session.commit()

    first = Configuration.get_or_create()

    assert first.id is not None  # flushed, so callers can rely on the row
    assert first.message_sending_enabled is True
    assert first.duck_multiplier == 1.0
    db.session.commit()

    assert Configuration.get_or_create().id == first.id
    assert Configuration.query.count() == 1


def test_configuration_lookups_pick_the_oldest_row_when_duplicates_exist(init_db):
    Configuration.query.delete()
    older = Configuration(duck_multiplier=2.0)
    newer = Configuration(duck_multiplier=3.0)
    db.session.add(older)
    db.session.commit()
    db.session.add(newer)
    db.session.commit()

    assert Configuration.get_current().id == older.id
    assert Configuration.get_or_create().id == older.id
    assert Configuration.query.count() == 2
