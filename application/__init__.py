from flask import Flask, session

from application.models.configuration import Configuration
from application.extensions import db, socketio  # , socketio
from application.config import Config
from application.models import setup_models
from application.routes import register_blueprints
from models import User
from . import socket_events  # This import registers the event handlers
from datetime import timedelta

def create_app():
    app = Flask(__name__, template_folder=Config.TEMPLATE_FOLDER, static_folder=Config.STATIC_FOLDER)
    app.config.from_object(Config)

    # Set the session timeout
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=10)

    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*", async_mode='threading')

    register_blueprints(app)  # Register all blueprints

    setup_models()

    # Before request hook to mark users as offline
    # @app.before_request
    # def before_request():
    #     username = session.get('user')
    #     if username:
    #         # Use the application context for db queries
    #         with app.app_context():
    #             user = User.query.filter_by(username=username).first()
    #             if user:
    #                 # Check if the session has expired
    #                 if not session.get('user'):
    #                     user.set_online(user.id, online=False)  # Mark user as offline
    #                     db.session.commit()

    with app.app_context():
        db.create_all()
        ensure_default_configuration()

    return app


def ensure_default_configuration():
    if Configuration.query.first() is None:
        default_config = Configuration(ai_teacher_enabled=False)
        db.session.add(default_config)
        db.session.commit()
