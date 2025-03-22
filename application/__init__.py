import os
from flask import Flask, session, g
from datetime import timedelta
from application.models.configuration import Configuration
from application.extensions import db, socketio
from application.models import setup_models
from application.routes import register_blueprints
from application.models.user import User
from . import socket_events  # This import registers the event handlers
from application.config import DevelopmentConfig, TestingConfig, ProductionConfig
import logging

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

    # Configure session timeout
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=10)

    # Initialize extensions
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*", async_mode=app.config.get('SOCKETIO_ASYNC_MODE', 'threading'))

    # Register blueprints
    register_blueprints(app)

    # Setup models and configuration
    with app.app_context():
        setup_models()  # Import all models to register them with SQLAlchemy
        db.create_all()  # Create the database schema if it doesn't exist
        db.session.commit()
        ensure_default_configuration()  # Populate default configuration data if needed

    # Load user for the request lifecycle
    @app.before_request
    def load_user():
        user_id = session.get('user')
        g.user = User.query.filter_by(username=user_id).first() if user_id else None

    # Inject user into templates
    @app.context_processor
    def inject_user():
        return {'user': g.get('user')}

    return app



def ensure_default_configuration():
    if Configuration.query.first() is None:
        default_config = Configuration(ai_teacher_enabled=False)
        db.session.add(default_config)
        db.session.commit()
