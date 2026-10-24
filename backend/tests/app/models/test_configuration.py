"""
File: test_configuration.py
Type: py
Summary: Unit tests for the Configuration model.
"""

import pytest
from application import db
from application.models.configuration import Configuration
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from tests.factories import ConfigurationFactory


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


def test_a_second_configuration_row_is_refused_by_the_database(init_db):
    db.session.add(Configuration(duck_multiplier=2.0))
    db.session.commit()

    for second in (Configuration(duck_multiplier=3.0), Configuration(id=2)):
        db.session.add(second)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()

    # Not through SQL that bypasses the model either
    with pytest.raises(IntegrityError):
        db.session.execute(
            text("INSERT INTO configuration (id, duck_multiplier) VALUES (2, 3.0)")
        )
    db.session.rollback()
    with pytest.raises(IntegrityError):
        db.session.execute(text("UPDATE configuration SET id = 2"))
    db.session.rollback()

    assert Configuration.query.count() == 1
    assert Configuration.get_current().duck_multiplier == 2.0
    assert Configuration.get_or_create().duck_multiplier == 2.0


def test_the_configuration_row_always_has_id_one(init_db):
    first = Configuration.get_or_create()
    db.session.commit()
    assert first.id == Configuration.SINGLETON_ID == 1

    # Deleted and created again, it is still row 1
    db.session.delete(first)
    db.session.commit()
    assert Configuration.get_current() is None

    again = Configuration.get_or_create()
    db.session.commit()
    assert again.id == 1
    assert Configuration.query.count() == 1


def test_configuration_factory_sets_values_on_the_existing_row(init_db):
    created = ConfigurationFactory(duck_multiplier=2.0)
    assert (created.id, created.message_sending_enabled, created.duck_multiplier) == (
        1,
        True,
        2.0,
    )

    same = ConfigurationFactory(message_sending_enabled=False, duck_multiplier=3.0)

    assert same.id == created.id
    db.session.expire_all()
    current = Configuration.get_current()
    assert (current.message_sending_enabled, current.duck_multiplier) == (False, 3.0)
    assert Configuration.query.count() == 1
