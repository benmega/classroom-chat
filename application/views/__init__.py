
from flask import Flask
from .user_routes import user_bp
from .ai_routes import ai_bp
from .admin_routes import admin_bp
from .general_routes import general_bp

def register_blueprints(app: Flask):
    app.register_blueprint(user_bp, url_prefix='/user')
    app.register_blueprint(ai_bp, url_prefix='/ai')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(general_bp)  # Assuming no URL prefix is needed