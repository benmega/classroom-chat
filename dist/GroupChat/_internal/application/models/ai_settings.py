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

    # Ensure that this function is being called within an app context
    with db.session.begin():
        db_settings = AISettings.query.all()  # Query the database for AI settings
        for setting in db_settings:
            settings[setting.key] = setting.value

    return {
        'role': settings.get('role', default_role),
        'username': settings.get('username', 'AI Teacher'),
        'chat_bot_enabled': settings.get('chat_bot_enabled', 'False').lower() in ['true', '1', 't']
    }
