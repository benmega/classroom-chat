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
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(INSTANCE_FOLDER, "users.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False  # Log SQL queries, helpful for debugging

    # Environment variables for sensitive values
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-default-secret-key')  # Default for local dev (should be overridden in prod)
    SESSION_TYPE = 'filesystem'

    # File upload settings
    UPLOAD_FOLDER = os.path.join(STATIC_FOLDER, 'uploads', 'profile_pictures')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # Max 16MB upload size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

    # Admin user configuration: Ideally, use hashed passwords in production, not plaintext
    ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'ben')  # Use environment variable for flexibility
    ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', '1234')  # Never store plaintext passwords in code

    # Add any general session or lifetime configuration here
    # PERMANENT_SESSION_LIFETIME = timedelta(minutes=1)

class DevelopmentConfig(Config):
    # Enable development-specific settings
    DEBUG = True
    # Override database URI for development purposes
    SQLALCHEMY_DATABASE_URI = os.getenv('DEV_DATABASE_URI', f'sqlite:///{os.path.join(Config.INSTANCE_FOLDER, "dev_users.db")}')


class TestingConfig(Config):
    # Enable testing-specific settings
    TESTING = True
    # Use an in-memory SQLite database for fast tests
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    # Override or add any test-specific configuration here, e.g., disable logging
    SQLALCHEMY_ECHO = False


class ProductionConfig(Config):
    # Production settings that ensure high performance and security
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', f'sqlite:///{os.path.join(Config.INSTANCE_FOLDER, "prod_users.db")}')
    # More production settings can be added, e.g., cache, logging, etc.





# import os
# from dotenv import load_dotenv
#
# # Ensure environment variables are loaded
# load_dotenv()
#
#
# class Config:
#     # Use a more robust method to set the BASE_DIR relative to this file's location
#     BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
#
#     # Update paths based on the new structure
#     INSTANCE_FOLDER = os.path.join(BASE_DIR, 'instance')
#     STATIC_FOLDER = os.path.join(BASE_DIR, 'static')
#     TEMPLATE_FOLDER = os.path.join(BASE_DIR, 'templates')
#
#     # Configure database URI to be more flexible and correct the path setup
#     SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(INSTANCE_FOLDER, "users.db")}'
#     SQLALCHEMY_TRACK_MODIFICATIONS = False
#
#     # Securely manage API keys and secret keys from environment variables
#     OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
#     SECRET_KEY = os.getenv('SECRET_KEY', 'your-default-secret-key')
#     SESSION_TYPE = 'filesystem'
#     admin_pass = '1234'  # Global variable for admin password. This should be securely fetched or better yet, use hashed passwords
#     adminUsername = 'ben'
#     UPLOAD_FOLDER = 'static/uploads/profile_pictures'
#     MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # Max 2MB
#     ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
#     # PERMANENT_SESSION_LIFETIME = timedelta(minutes=1)
#     SQLALCHEMY_ECHO = False
#
# class DevelopmentConfig(Config):
#     DEBUG = True
#
#
# class TestingConfig(Config):
#     TESTING = True
#     SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
#
#
# class ProductionConfig(Config):
#     DEBUG = False
