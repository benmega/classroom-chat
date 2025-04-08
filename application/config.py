import os
import sys
from dotenv import load_dotenv
import appdirs

# Load environment variables
load_dotenv()


def get_base_dir():
    """Get the base directory for the application"""
    if getattr(sys, 'frozen', False):  # Running as bundled .exe
        # Use sys._MEIPASS for accessing bundled resources
        return sys._MEIPASS
    else:
        # Use the parent directory of the current file
        return os.path.abspath(os.path.dirname(os.path.dirname(__file__)))


def get_writable_dir():
    """Get a writable directory for the application data"""
    if getattr(sys, 'frozen', False):
        # Use a user-specific data directory when bundled
        app_name = "ClassroomChat"  # Replace with your app name
        return appdirs.user_data_dir(app_name)
    else:
        # In development, use the instance folder
        return os.path.join(get_base_dir(), 'instance')


class Config:
    # Base directory for read-only resources (templates, static files)
    BASE_DIR = get_base_dir()

    # Directory for writable data (database, uploads, etc.)
    DATA_DIR = get_writable_dir()

    # Ensure data directory exists
    os.makedirs(DATA_DIR, exist_ok=True)

    # Read-only resource paths
    STATIC_FOLDER = os.path.join(BASE_DIR, 'static')
    TEMPLATE_FOLDER = os.path.join(BASE_DIR, 'templates')

    # Writable resources
    INSTANCE_FOLDER = os.path.join(DATA_DIR, 'instance')
    os.makedirs(INSTANCE_FOLDER, exist_ok=True)

    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(INSTANCE_FOLDER, 'dev_users.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False

    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-default-secret-key')
    SESSION_TYPE = 'filesystem'

    # Move uploads to user-writable location
    UPLOAD_FOLDER = os.path.join(DATA_DIR, 'uploads', 'profile_pictures')
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    MAX_CONTENT_LENGTH = 500 * 1024 * 1024
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

    ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'ben')
    ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', '1234')

    SOCKETIO_ASYNC_MODE = 'threading'


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DEV_DATABASE_URI',
        f"sqlite:///{os.path.join(Config.INSTANCE_FOLDER, 'dev_users.db')}"
    )
    WTF_CSRF_ENABLED = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_ECHO = False
    WTF_CSRF_ENABLED = False


class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        f"sqlite:///{os.path.join(Config.INSTANCE_FOLDER, 'prod_users.db')}"
    )