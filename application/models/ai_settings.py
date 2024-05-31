from application.extensions import db


class AISettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50))
    value = db.Column(db.String(1000))

def get_ai_settings():
    # settings = {setting.key: setting.value for setting in AISettings.query.all()}

    defaultRole = '''
        Answer computer science questions about Python.
        The students are learning using the programs Code Combat and Ozaria.
    '''
    settings = {
        'role': defaultRole,
        'username': 'AI Teacher',
        'chat_bot_enabled': 'True'
    }
    return {
        'role': settings.get('role', defaultRole),
        'username': settings.get('username', 'AI Teacher'),
        'chat_bot_enabled': settings.get('chat_bot_enabled', 'False').lower() in ['true', '1', 't']
    }
