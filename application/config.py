import os
from dotenv import load_dotenv


# Ensure environment variables are loaded
load_dotenv()

class Config:
    # Base directory setup: dynamically set based on file location
    BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))

    # Instance folder for storing app-specific data (separate from static)
    INSTANCE_FOLDER = os.path.join(BASE_DIR, 'instance')
    STATIC_FOLDER = os.path.join(BASE_DIR, 'static')
    TEMPLATE_FOLDER = os.path.join(BASE_DIR, 'templates')

    # Default database URI configuration
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(INSTANCE_FOLDER, "test_users.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False  # Log SQL queries, helpful for debugging

    # Environment variables for sensitive values
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-default-secret-key')  # Default for local dev (should be overridden in prod)
    SESSION_TYPE = 'filesystem'

    # File upload settings
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'userData')
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # Max 500MB upload size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

    # Admin user configuration: Ideally, use hashed passwords in production, not plaintext
    ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')  # Use environment variable for flexibility
    ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', '1234')  # Never store plaintext passwords in code

    # Add any general session or lifetime configuration here
    # PERMANENT_SESSION_LIFETIME = timedelta(minutes=1)

class DevelopmentConfig(Config):

    DEBUG = True
    # Override database URI for development purposes
    SQLALCHEMY_DATABASE_URI = os.getenv('DEV_DATABASE_URI', f'sqlite:///{os.path.join(Config.INSTANCE_FOLDER, "test_users.db")}')
    # SERVER_NAME = '192.168.1.136:5000' # Is this needed for testing? 3.22.25
    WTF_CSRF_ENABLED = False
    RATELIMIT_STORAGE_URL = "memory://"


class TestingConfig(Config):

    TESTING = True
    # Use an in-memory SQLite database for fast tests
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Override or add any test-specific configuration here, e.g., disable logging
    SQLALCHEMY_ECHO = False
    SERVER_NAME = 'localhost:5000'
    WTF_CSRF_ENABLED = False
    RATELIMIT_ENABLED = False


class ProductionConfig(Config):

    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', f'sqlite:///{os.path.join(Config.INSTANCE_FOLDER, "prod_users.db")}')
    SERVER_NAME = '192.168.1.1356:5000'