"""
File: config.py
Type: py
Summary: Configuration classes and settings for different environments.
"""

import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    # BASE_DIR is classroom-chat/
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".."))

    INSTANCE_FOLDER = os.path.join(BASE_DIR, "backend", "instance")
    STATIC_FOLDER = os.path.join(BASE_DIR, "frontend", "static")
    TEMPLATE_FOLDER = os.path.join(BASE_DIR, "frontend", "templates")

    SQLALCHEMY_DATABASE_URI = (
        f'sqlite:///{os.path.join(INSTANCE_FOLDER, "dev_users.db")}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    SECRET_KEY = os.getenv("SECRET_KEY")
    if not SECRET_KEY:
        # Generate a random one for dev if not provided, but don't allow this in production
        if os.getenv("FLASK_ENV") == "production":
            raise RuntimeError("SECRET_KEY must be set in production environment!")
        SECRET_KEY = "dev-secret-key-change-me"

    UPLOAD_FOLDER = os.path.join(BASE_DIR, "userData")
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}

    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
    if not ADMIN_PASSWORD:
        if os.getenv("FLASK_ENV") == "production":
            raise RuntimeError("ADMIN_PASSWORD must be set in production environment!")
        ADMIN_PASSWORD = "admin-dev-password" # Slightly better than 1234


    # SocketIO configuration
    SOCKETIO_ASYNC_MODE = "gevent"


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DEV_DATABASE_URI",
        f'sqlite:///{os.path.join(Config.INSTANCE_FOLDER, "dev_users.db")}',
    )
    WTF_CSRF_ENABLED = False
    RATELIMIT_STORAGE_URI = "memory://"


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False
    SERVER_NAME = "localhost:8000"
    WTF_CSRF_ENABLED = False
    RATELIMIT_ENABLED = False


class ProductionConfig(Config):

    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f'sqlite:///{os.path.join(Config.INSTANCE_FOLDER, "prod_users.db")}',
    )
    SESSION_COOKIE_SAMESITE = "None"
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None  # Sessions are short, don't expire tokens separately

    # Build folders for Vite
    TEMPLATE_FOLDER = os.path.join(Config.BASE_DIR, "frontend", "dist")
    STATIC_FOLDER = os.path.join(Config.BASE_DIR, "frontend", "dist")

    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else [
        "https://codecombat.com",
        "https://www.ozaria.com",
        "https://benmega.com",
        "https://www.benmega.com",
    ]
