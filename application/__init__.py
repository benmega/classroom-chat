from flask import Flask
from application.models.user import db
from application.config import Config
from application.views.user_routes import user_bp
from application.views.ai_routes import ai_bp
from application.views.admin_routes import admin_bp
from application.views.general_routes import general_bp

def create_app():
    app = Flask(__name__, template_folder=Config.TEMPLATE_FOLDER, static_folder=Config.STATIC_FOLDER)
    app.config.from_object(Config)
    print("Template folder is set to:", app.template_folder)
    db.init_app(app)

    app.register_blueprint(user_bp, url_prefix='/user')
    app.register_blueprint(ai_bp, url_prefix='/ai')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(general_bp)


    with app.app_context():
        db.create_all()

    return app
