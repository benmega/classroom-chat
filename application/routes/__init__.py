"""
File: __init__.py
Type: py
Summary: Blueprint registration for application route modules.
"""

from flask import Flask

from application.routes.notes_routes import notes
from .achievement_routes import achievements
from .admin_advanced_routes import init_admin
from .admin_routes import admin
from .ai_routes import ai
from .api_achievements import achievements_api
from .api_webhooks import webhooks_api
from .challenge_routes import challenge
from .duck_trade_routes import duck_trade
from .general_routes import general
from .message_routes import message
from .server_info_routes import server_info
from .session_routes import session
from .upload_routes import upload
from .user_routes import user


def register_blueprints(app: Flask):
    init_admin(app)
    app.register_blueprint(user, url_prefix="/user")
    app.register_blueprint(ai, url_prefix="/ai")
    app.register_blueprint(admin, url_prefix="/admin")
    app.register_blueprint(upload, url_prefix="/upload")
    app.register_blueprint(message, url_prefix="/message")
    app.register_blueprint(duck_trade, url_prefix="/duck_trade")
    app.register_blueprint(achievements, url_prefix="/achievements")
    app.register_blueprint(session, url_prefix="/session")
    app.register_blueprint(notes, url_prefix="/notes")
    app.register_blueprint(achievements_api)
    app.register_blueprint(webhooks_api)
    app.register_blueprint(challenge)
    app.register_blueprint(general)
    app.register_blueprint(server_info)
