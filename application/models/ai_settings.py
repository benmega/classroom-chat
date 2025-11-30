"""
File: ai_settings.py
Type: py
Summary: SQLAlchemy model for AI teacher-related settings.
"""

from application.extensions import db


class AISettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50))
    value = db.Column(db.String(1000))

def get_ai_settings():
    default_role = '''
        Answer computer science questions about Python.
        The students are learning using the programs Code Combat and Ozaria.
    '''
    settings = {
        'role': default_role,
        'username': 'AI Teacher',
        'chat_bot_enabled': 'True'
    }

    # Just query the settings without beginning a new transaction
    db_settings = AISettings.query.all()
    for setting in db_settings:
        settings[setting.key] = setting.value

    return {
        'role': settings.get('role', default_role),
        'username': settings.get('username', 'AI Teacher'),
        'chat_bot_enabled': settings.get('chat_bot_enabled', 'False').lower() in ['true', '1', 't']
    }
