"""
File: __init__.py
Type: py
Summary: Flask application factory and core app initialization.
"""

import logging
import os
from datetime import timedelta

from flask import Flask, session, g, jsonify
from flask_cors import CORS
from flask_limiter import RateLimitExceeded
from flask_wtf.csrf import CSRFProtect
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.middleware.proxy_fix import ProxyFix

from application.config import DevelopmentConfig, TestingConfig, ProductionConfig
from application.extensions import db, socketio, limiter, scheduler
from application.models import setup_models
from application.models.configuration import Configuration
from application.models.user import User
from application.routes import register_blueprints
from . import socket_events
from .license_checker import load_license


def create_app(config_class=None):
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    # Dynamically select config if not explicitly passed
    if config_class is None:
        env = os.getenv("FLASK_ENV", "development").lower()
        logger.info(f"Configuring app for environment: {env}")
        if env == "production":
            config_class = ProductionConfig
        elif env == "testing":
            config_class = TestingConfig
        else:
            config_class = DevelopmentConfig

    template_folder = getattr(config_class, "TEMPLATE_FOLDER", "templates")
    static_folder = getattr(config_class, "STATIC_FOLDER", "static")
    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
    app.config.from_object(config_class)

    CORS(
        app,
        origins=["https://codecombat.com", "https://www.ozaria.com"],
        supports_credentials=True,
    )
    # x_for=1 tells Flask to trust the first X-Forwarded-For header
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

    # Configure session timeout
    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(minutes=10)
    base_dir = os.path.abspath(os.path.dirname(__file__))
    license_dir = os.path.abspath(os.path.join(base_dir, "..", "license"))

    public_key_path = os.path.join(license_dir, "public_key.pem")
    license_path = os.path.join(license_dir, "license.lic")

    license_data = load_license(
        public_key_path=public_key_path, license_path=license_path
    )
    app.config["IS_PREMIUM"] = license_data["is_premium"]
    app.config["LICENSEE"] = license_data.get("licensee", "Unknown")

    db.init_app(app)
    socketio.init_app(
        app,
        cors_allowed_origins="*",
        async_mode=app.config.get("SOCKETIO_ASYNC_MODE", "threading"),
    )
    limiter.init_app(app)
    scheduler.init_app(app)

    csrf = CSRFProtect(app)
    register_blueprints(app)

    from . import tasks

    tasks.set_app_instance(app)

    with app.app_context():
        setup_models()
        if not os.path.exists(
            os.path.join(app.config["INSTANCE_FOLDER"], "dev_users.db")
        ):
            db.create_all()
            ensure_default_configuration()

        scheduler.start()

    @app.before_request
    def load_user():
        user_id = session.get("user")
        g.user = User.query.filter_by(id=user_id).first() if user_id else None

    @app.context_processor
    def inject_user():
        return {"user": g.get("user")}

    @app.errorhandler(RequestEntityTooLarge)
    def handle_large_request(error):
        return jsonify({"error": "Request body too large"}), 413

    @app.errorhandler(RateLimitExceeded)
    def ratelimit_handler(e):
        return (
            jsonify(
                {
                    "error": "Rate limit exceeded",
                    "message": "You're sending messages too quickly. Please wait a bit!",
                    "retry_after": e.description,
                }
            ),
            429,
        )

    return app


def ensure_default_configuration():
    if Configuration.query.first() is None:
        default_config = Configuration(ai_teacher_enabled=False)
        db.session.add(default_config)
        db.session.commit()
