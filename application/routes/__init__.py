
from flask import Flask

from .duck_trade_routes import duck_trade_bp
from .user_routes import user_bp
from .ai_routes import ai_bp
from .admin_routes import admin_bp
from .general_routes import general_bp
from .message_routes import message_bp
from .upload_routes import upload_bp

def register_blueprints(app: Flask):
    app.register_blueprint(user_bp, url_prefix='/user')
    app.register_blueprint(ai_bp, url_prefix='/ai')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(upload_bp, url_prefix='/upload')
    app.register_blueprint(message_bp, url_prefix='/message')
    app.register_blueprint(duck_trade_bp, url_prefix='/duck_trade')
    app.register_blueprint(general_bp)  # Assuming no URL prefix is needed