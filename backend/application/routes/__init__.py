"""
File: __init__.py
Type: py
Summary: Blueprint registration for application route modules.
"""

import os

from application.routes.notes_routes import notes_bp
from flask import Flask
from flask_swagger_ui import get_swaggerui_blueprint

from .achievement_routes import achievements
from .activity_routes import activity_bp
from .admin_routes import admin_bp
from .ai_routes import ai
from .api_achievements import achievements_api
from .api_webhooks import webhooks_api
from .challenge_routes import challenge
from .classroom_routes import classroom_bp
from .cognito_routes import cognito_bp
from .course_request_routes import course_request_bp
from .duck_trade_routes import duck_trade
from .general_routes import general
from .message_routes import message
from .parent_routes import parent
from .project_template_routes import project_templates_bp
from .server_info_routes import server_info
from .session_routes import session
from .shop_routes import shop_bp
from .submission_routes import submission_bp
from .track_request_routes import track_request_bp
from .upload_routes import upload
from .user_routes import user


def register_blueprints(app: Flask):
    app.register_blueprint(activity_bp, url_prefix="/api/me")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(parent, url_prefix="/api/parents")
    app.register_blueprint(user, url_prefix="/user")
    app.register_blueprint(project_templates_bp, url_prefix="/api/project-templates")
    app.register_blueprint(ai, url_prefix="/ai")
    app.register_blueprint(upload, url_prefix="/upload")
    app.register_blueprint(message, url_prefix="/message")
    app.register_blueprint(duck_trade, url_prefix="/duck_trade")
    app.register_blueprint(achievements, url_prefix="/achievements")
    app.register_blueprint(achievements_api)
    app.register_blueprint(session, url_prefix="/api/session")
    app.register_blueprint(cognito_bp, url_prefix="/api/auth/cognito")
    app.register_blueprint(notes_bp, url_prefix="/notes")
    app.register_blueprint(webhooks_api)
    app.register_blueprint(challenge)
    app.register_blueprint(general)
    app.register_blueprint(server_info)
    app.register_blueprint(shop_bp, url_prefix="/api/shop")
    app.register_blueprint(submission_bp, url_prefix="/api/submissions")
    app.register_blueprint(track_request_bp)
    app.register_blueprint(course_request_bp)
    app.register_blueprint(classroom_bp, url_prefix="/api/classroom")

    # ── Swagger UI ───────────────────────────────────────────────────────────
    SWAGGER_URL = "/api/docs"
    API_URL = "/static/swagger.json"
    swaggerui_blueprint = get_swaggerui_blueprint(
        SWAGGER_URL, API_URL, config={"app_name": "Classroom Chat API"}
    )
    app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)

    # ── Development-only shortcut ────────────────────────────────────────────
    # /dev-login is never registered in production; the blueprint itself also
    # enforces its own guards, providing defence-in-depth.
    if os.getenv("FLASK_ENV", "development").lower() != "production":
        from .dev_login_routes import dev_login

        app.register_blueprint(dev_login)
