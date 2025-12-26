"""
File: test_ai_settings.py
Type: py
Summary: Unit tests for ai settings model.
"""

from application import db
from application.models.ai_settings import get_ai_settings, AISettings


def test_ai_settings_model(init_db):
    """Test creating and querying AISettings model."""
    setting = AISettings(key="test_key", value="test_value")
    db.session.add(setting)
    db.session.commit()

    retrieved_setting = AISettings.query.filter_by(key="test_key").first()
    assert retrieved_setting is not None
    assert retrieved_setting.key == "test_key"
    assert retrieved_setting.value == "test_value"


def test_get_ai_settings_with_db_values(test_app, sample_ai_settings):
    """Test get_ai_settings function when database contains values."""
    with test_app.app_context():
        settings = get_ai_settings()
    assert settings["role"] == "Custom AI role"
    assert settings["username"] == "AI Teacher"
    assert settings["chat_bot_enabled"]


def test_get_ai_settings_with_defaults(init_db):
    """Test get_ai_settings function when no database values exist."""
    settings = get_ai_settings()
    assert (
        settings["role"]
        == """
        Answer computer science questions about Python.
        The students are learning using the programs Code Combat and Ozaria.
    """
    )
    assert settings["username"] == "AI Teacher"
    assert settings["chat_bot_enabled"] is True


def test_get_ai_settings_partial_db_values(init_db):
    """Test get_ai_settings function when some database values exist."""
    setting = AISettings(key="role", value="Custom AI role")
    db.session.add(setting)
    db.session.commit()

    settings = get_ai_settings()
    assert settings["role"] == "Custom AI role"
    assert settings["username"] == "AI Teacher"  # Default
    assert settings["chat_bot_enabled"] is True  # Default
