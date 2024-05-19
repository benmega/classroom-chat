from flask import Flask

from application.models.database import Configuration
from application.extensions import db
from application.config import Config
from application.views.user_routes import user_bp
from application.views.ai_routes import ai_bp
from application.views.admin_routes import admin_bp
from application.views.general_routes import general_bp
from application.models import setup_models  # This will setup your models

def create_app():
    app = Flask(__name__, template_folder=Config.TEMPLATE_FOLDER, static_folder=Config.STATIC_FOLDER)
    app.config.from_object(Config)


    app.register_blueprint(user_bp, url_prefix='/user')
    app.register_blueprint(ai_bp, url_prefix='/ai')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(general_bp)

    db.init_app(app)

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
