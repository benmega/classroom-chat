"""
File: __init__.py
Type: py
Summary: Blueprint registration for application route modules.
"""

import os

from flask import Flask
from flask_swagger_ui import get_swaggerui_blueprint


from application.routes.notes_routes import notes_bp
from .achievement_routes import achievements
from .admin_routes import admin_bp
from .ai_routes import ai
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
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(user, url_prefix="/user")
    app.register_blueprint(ai, url_prefix="/ai")
    app.register_blueprint(upload, url_prefix="/upload")
    app.register_blueprint(message, url_prefix="/message")
    app.register_blueprint(duck_trade, url_prefix="/duck_trade")
    app.register_blueprint(achievements, url_prefix="/api/achievements")
    app.register_blueprint(session, url_prefix="/api/session")
    app.register_blueprint(notes_bp, url_prefix="/notes")
    app.register_blueprint(webhooks_api)
    app.register_blueprint(challenge)
    app.register_blueprint(general)
    app.register_blueprint(server_info)

    # ── Swagger UI ───────────────────────────────────────────────────────────
    SWAGGER_URL = '/api/docs'
    API_URL = '/static/swagger.json'
    swaggerui_blueprint = get_swaggerui_blueprint(
        SWAGGER_URL,
        API_URL,
        config={'app_name': "Classroom Chat API"}
    )
    app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)

    # ── Development-only shortcut ────────────────────────────────────────────
    # /dev-login is never registered in production; the blueprint itself also
    # enforces its own guards, providing defence-in-depth.
    if os.getenv("FLASK_ENV", "development").lower() != "production":
        from .dev_login_routes import dev_login
        app.register_blueprint(dev_login)
