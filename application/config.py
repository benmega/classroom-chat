import os
from datetime import timedelta

from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()


class Config:
    # Use a more robust method to set the BASE_DIR relative to this file's location
    BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))

    # Update paths based on the new structure
    INSTANCE_FOLDER = os.path.join(BASE_DIR, 'instance')
    STATIC_FOLDER = os.path.join(BASE_DIR, 'static')
    TEMPLATE_FOLDER = os.path.join(BASE_DIR, 'templates')

    # Configure database URI to be more flexible and correct the path setup
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(INSTANCE_FOLDER, "users.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Securely manage API keys and secret keys from environment variables
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-default-secret-key')
    SESSION_TYPE = 'filesystem'
    admin_pass = '1234'  # Global variable for admin password. This should be securely fetched or better yet, use hashed passwords
    adminUsername = 'ben'
    UPLOAD_FOLDER = 'static/uploads/profile_pictures'
    MAX_CONTENT_LENGTH = 2 * 1024 * 1024  # Max 2MB
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    # PERMANENT_SESSION_LIFETIME = timedelta(minutes=1)

class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'


class ProductionConfig(Config):
    DEBUG = False
