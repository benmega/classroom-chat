from sqlalchemy.testing import db

from application.models.ai_settings import AISettings, get_ai_settings


def test_create_ai_setting(init_db):
    setting = AISettings(key="role", value="AI Teacher")
    db.session.add(setting)
    db.session.commit()

    # Check if AISetting was created
    ai_setting = AISettings.query.filter_by(key="role").first()
    assert ai_setting is not None
    assert ai_setting.value == "AI Teacher"


def test_read_ai_settings(init_db):
    setting = AISettings(key="role", value="AI Teacher")
    db.session.add(setting)
    db.session.commit()

    # Test the `get_ai_settings` function
    settings = get_ai_settings()
    assert settings['role'] == 'AI Teacher'


def test_update_ai_setting(init_db):
    setting = AISettings(key="role", value="AI Teacher")
    db.session.add(setting)
    db.session.commit()

    # Update the setting
    setting.value = "AI Assistant"
    db.session.commit()

    # Ensure the value is updated
    ai_setting = AISettings.query.filter_by(key="role").first()
    assert ai_setting.value == "AI Assistant"


def test_delete_ai_setting(init_db):
    setting = AISettings(key="role", value="AI Teacher")
    db.session.add(setting)
    db.session.commit()

    # Delete the setting
    db.session.delete(setting)
    db.session.commit()

    # Ensure it's deleted
    ai_setting = AISettings.query.filter_by(key="role").first()
    assert ai_setting is None
