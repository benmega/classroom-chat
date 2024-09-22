from flask import Flask

from application.models.configuration import Configuration
from application.extensions import db, socketio  # , socketio
from application.config import Config
from application.models import setup_models
from application.routes import register_blueprints
from . import socket_events  # This import registers the event handlers


def create_app():
    app = Flask(__name__, template_folder=Config.TEMPLATE_FOLDER, static_folder=Config.STATIC_FOLDER)
    app.config.from_object(Config)

    db.init_app(app)
    # socketio.init_app(app, cors_allowed_origins="*", async_mode='eventlet')
    socketio.init_app(app, cors_allowed_origins="*", async_mode='threading')

    register_blueprints(app)  # Register all blueprints

    setup_models()

    with app.app_context():
        db.create_all()
        ensure_default_configuration()

    return app


def ensure_default_configuration():
    if Configuration.query.first() is None:
        default_config = Configuration(ai_teacher_enabled=False)
        db.session.add(default_config)
        db.session.commit()
