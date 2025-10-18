import os
import socket

from flask import Flask, session, g, jsonify
from datetime import timedelta

from flask_cors import CORS
from flask_limiter import RateLimitExceeded
from werkzeug.exceptions import RequestEntityTooLarge

from application.models.configuration import Configuration
from application.extensions import db, socketio, limiter, scheduler
from application.models import setup_models
from application.routes import register_blueprints
from application.models.user import User
from . import socket_events  # This import registers the event handlers
from application.config import DevelopmentConfig, TestingConfig, ProductionConfig
import logging
from flask_wtf.csrf import CSRFProtect

from .license_checker import load_license


# def create_app(config_class=None):
#
#     # Configure logging
#     logging.basicConfig(level=logging.INFO)
#     logger = logging.getLogger(__name__)
#
#     # Dynamically select config if not explicitly passed
#     if config_class is None:
#         env = os.getenv('FLASK_ENV', 'development').lower()
#         logger.info(f"Configuring app for environment: {env}")
#         if env == 'production':
#             config_class = ProductionConfig
#         elif env == 'testing':
#             config_class = TestingConfig
#         else:
#             config_class = DevelopmentConfig
#
#     template_folder = getattr(config_class, "TEMPLATE_FOLDER", "templates")
#     static_folder = getattr(config_class, "STATIC_FOLDER", "static")
#     app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
#     app.config.from_object(config_class)
#
#     # For communication with Tauri
#     CORS(app)
#
#     # Configure session timeout
#     app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=10)
#     base_dir = os.path.abspath(os.path.dirname(__file__))
#     license_dir = os.path.abspath(os.path.join(base_dir, "..", "license"))
#
#     public_key_path = os.path.join(license_dir, "public_key.pem")
#     license_path = os.path.join(license_dir, "license.lic")
#
#     # Load license (early)
#     license_data = load_license(
#         public_key_path=public_key_path,
#         license_path=license_path
#     )
#     app.config["IS_PREMIUM"] = license_data["is_premium"]
#     app.config["LICENSEE"] = license_data.get("licensee", "Unknown")
#
#     # Initialize extensions
#     db.init_app(app)
#     socketio.init_app(app, cors_allowed_origins="*", async_mode=app.config.get('SOCKETIO_ASYNC_MODE', 'threading'))
#     limiter.init_app(app)
#
#     socketio.init_app(app, cors_allowed_origins="*", async_mode='threading') # previously app.config.get('SOCKETIO_ASYNC_MODE', 'threading')
#     scheduler.init_app(app)
#
#
#     # Initialize CSRF protection
#     csrf = CSRFProtect(app)
#
#     # Register blueprints
#     register_blueprints(app)
#
#     scheduler.start()
#     # Setup models and configuration
#     with app.app_context():
#         setup_models()  # Import all models to register them with SQLAlchemy
#         db.create_all()  # Create the database schema if it doesn't exist
#         db.session.commit()
#         ensure_default_configuration()  # Populate default configuration data if needed
#
#     # Load user for the request lifecycle
#     @app.before_request
#     def load_user():
#         user_id = session.get('user')
#         g.user = User.query.filter_by(username=user_id).first() if user_id else None
#
#     # Inject user into templates
#     @app.context_processor
#     def inject_user():
#         return {'user': g.get('user')}
#
#     @app.errorhandler(RequestEntityTooLarge)
#     def handle_large_request(error):
#         return jsonify({'error': 'Request body too large'}), 413
#
#     @app.errorhandler(RateLimitExceeded)
#     def ratelimit_handler(e):
#         return jsonify({
#             "error": "Rate limit exceeded",
#             "message": "You're sending messages too quickly. Please wait a bit!",
#             "retry_after": e.description  # Often includes the seconds to wait
#         }), 429
#
#     return app
def create_app(config_class=None):
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    # Dynamically select config if not explicitly passed
    if config_class is None:
        env = os.getenv('FLASK_ENV', 'development').lower()
        logger.info(f"Configuring app for environment: {env}")
        if env == 'production':
            config_class = ProductionConfig
        elif env == 'testing':
            config_class = TestingConfig
        else:
            config_class = DevelopmentConfig

    template_folder = getattr(config_class, "TEMPLATE_FOLDER", "templates")
    static_folder = getattr(config_class, "STATIC_FOLDER", "static")
    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
    app.config.from_object(config_class)

    # For communication with Tauri
    CORS(app)

    # Configure session timeout
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=10)
    base_dir = os.path.abspath(os.path.dirname(__file__))
    license_dir = os.path.abspath(os.path.join(base_dir, "..", "license"))

    public_key_path = os.path.join(license_dir, "public_key.pem")
    license_path = os.path.join(license_dir, "license.lic")

    # Load license (early)
    license_data = load_license(
        public_key_path=public_key_path,
        license_path=license_path
    )
    app.config["IS_PREMIUM"] = license_data["is_premium"]
    app.config["LICENSEE"] = license_data.get("licensee", "Unknown")

    # Initialize extensions
    db.init_app(app)
    # Remove duplicate socketio initialization - keep only one
    socketio.init_app(app, cors_allowed_origins="*", async_mode=app.config.get('SOCKETIO_ASYNC_MODE', 'threading'))
    limiter.init_app(app)
    scheduler.init_app(app)

    # Initialize CSRF protection
    csrf = CSRFProtect(app)

    # Register blueprints
    register_blueprints(app)

    # Import tasks to register them with the scheduler (IMPORTANT!)
    from . import tasks
    tasks.set_app_instance(app)

    # Setup models and configuration
    with app.app_context():
        setup_models()  # Import all models to register them with SQLAlchemy
        db.create_all()  # Create the database schema if it doesn't exist
        db.session.commit()
        ensure_default_configuration()  # Populate default configuration data if needed

        # Start scheduler after app context is set up
        scheduler.start()

    # Load user for the request lifecycle
    @app.before_request
    def load_user():
        user_id = session.get('user')
        g.user = User.query.filter_by(id=user_id).first() if user_id else None

    # Inject user into templates
    @app.context_processor
    def inject_user():
        return {'user': g.get('user')}

    @app.errorhandler(RequestEntityTooLarge)
    def handle_large_request(error):
        return jsonify({'error': 'Request body too large'}), 413

    @app.errorhandler(RateLimitExceeded)
    def ratelimit_handler(e):
        return jsonify({
            "error": "Rate limit exceeded",
            "message": "You're sending messages too quickly. Please wait a bit!",
            "retry_after": e.description  # Often includes the seconds to wait
        }), 429

    return app


def ensure_default_configuration():
    if Configuration.query.first() is None:
        default_config = Configuration(ai_teacher_enabled=False)
        db.session.add(default_config)
        db.session.commit()
