"""
File: config.py
Type: py
Summary: Configuration classes and settings for different environments.
"""

import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))

    INSTANCE_FOLDER = os.path.join(BASE_DIR, "instance")
    STATIC_FOLDER = os.path.join(BASE_DIR, "static")
    TEMPLATE_FOLDER = os.path.join(BASE_DIR, "templates")

    SQLALCHEMY_DATABASE_URI = (
        f'sqlite:///{os.path.join(INSTANCE_FOLDER, "dev_users.db")}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    SECRET_KEY = os.getenv("SECRET_KEY", "your-default-secret-key")
    SESSION_TYPE = "filesystem"

    UPLOAD_FOLDER = os.path.join(BASE_DIR, "userData")
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}

    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "1234")


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DEV_DATABASE_URI",
        f'sqlite:///{os.path.join(Config.INSTANCE_FOLDER, "dev_users.db")}',
    )
    WTF_CSRF_ENABLED = False
    RATELIMIT_STORAGE_URL = "memory://"


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
    SERVER_NAME = "192.168.1.1356:5000"
    SESSION_COOKIE_SAMESITE = "None"
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_DOMAIN = "benmega.com"
