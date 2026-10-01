"""
File: test_ai_settings.py
Type: py
Summary: Unit tests for ai settings model.
"""

from application import db
from application.models.ai_settings import AISettings


def test_ai_settings_model(init_db):
    """The deprecated table mapping stays usable until a drop migration lands."""
    setting = AISettings(key="test_key", value="test_value")
    db.session.add(setting)
    db.session.commit()

    retrieved_setting = AISettings.query.filter_by(key="test_key").first()
    assert retrieved_setting is not None
    assert retrieved_setting.key == "test_key"
    assert retrieved_setting.value == "test_value"
