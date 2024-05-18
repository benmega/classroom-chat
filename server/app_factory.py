from flask import Flask
from server.models import db
from config import Config
from server.routes.user_routes import user_bp
from server.routes.ai_routes import ai_bp
from server.routes.admin_routes import admin_bp
from server.routes.general_routes import general_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    app.register_blueprint(user_bp, url_prefix='/user')
    app.register_blueprint(ai_bp, url_prefix='/ai')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(general_bp)

    with app.app_context():
        db.create_all()

    return app