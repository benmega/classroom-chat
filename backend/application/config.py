

import os
from typing import ClassVar

from dotenv import load_dotenv

load_dotenv()

# Browser origins allowed to call the API with credentials (CORS and Socket.IO).
# Localhost origins are defaults only outside production.
DEFAULT_DEV_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:4173",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:4173",
    "http://127.0.0.1:8000",
]
DEFAULT_PROD_CORS_ORIGINS = [
    "https://blossom.benmega.com",
    "https://d2pa3ix3n5behv.cloudfront.net",
]
# Sites the CodeCombat/Ozaria bookmarklet posts from (/challenge/submit only).
BOOKMARKLET_ORIGINS = [
    "https://codecombat.com",
    "https://www.codecombat.com",
    "https://ozaria.com",
    "https://www.ozaria.com",
]


def split_csv(value):
    """Split a comma-separated string, trimming whitespace and dropping empty entries."""
    return [item.strip() for item in value.split(",") if item.strip()]


def cors_origins_from_env(default):
    """Origins from the CORS_ORIGINS env var, or a copy of ``default`` when it is unset or blank."""
    return split_csv(os.getenv("CORS_ORIGINS", "")) or list(default)


# backend/instance: the SQLite databases and the application log (app.log) live here.
INSTANCE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "instance")
)


class Config:
    # BASE_DIR is classroom-chat/
    BASE_DIR = os.path.abspath(
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "..")
    )

    INSTANCE_FOLDER = INSTANCE_DIR
    STATIC_FOLDER = os.path.join(BASE_DIR, "frontend", "static")
    TEMPLATE_FOLDER = os.path.join(BASE_DIR, "frontend", "dist")

    SQLALCHEMY_DATABASE_URI = (
        f"sqlite:///{os.path.join(INSTANCE_FOLDER, 'dev_users.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False

    SECRET_KEY = os.getenv("SECRET_KEY")
    if not SECRET_KEY:
        # Generate a random one for dev if not provided, but don't allow this in production
        if os.getenv("FLASK_ENV") == "production":
            raise RuntimeError("SECRET_KEY must be set in production environment!")
        SECRET_KEY = "dev-secret-key-change-me"

    UPLOAD_FOLDER = os.path.join(BASE_DIR, "userData")
    # Global request body cap, just above SUBMISSION_MAX_BYTES. Project video
    # uploads need far more, so the endpoints in LARGE_UPLOAD_ENDPOINTS get
    # LARGE_UPLOAD_MAX_CONTENT_LENGTH instead (see create_app).
    MAX_CONTENT_LENGTH = 25 * 1024 * 1024
    LARGE_UPLOAD_MAX_CONTENT_LENGTH = 500 * 1024 * 1024
    LARGE_UPLOAD_ENDPOINTS: ClassVar[set[str]] = {"user.new_project", "user.edit_project"}
    ALLOWED_EXTENSIONS: ClassVar[set[str]] = {"png", "jpg", "jpeg", "gif", "webp"}
    SUBMISSION_ALLOWED_EXTENSIONS: ClassVar[set[str]] = {
        "png", "jpg", "jpeg", "gif", "webp", "pdf", "doc", "docx", "txt", "ppt", "pptx", "zip"
    }
    SUBMISSION_MAX_BYTES = 20 * 1024 * 1024  # 20MB

    # Image uploads (application/utilities/image_upload.py). Each cap sits under
    # MAX_CONTENT_LENGTH, which is enforced on the request body before a route runs.
    IMAGE_MAX_BYTES_AVATAR = 5 * 1024 * 1024
    IMAGE_MAX_BYTES_WALLPAPER = 10 * 1024 * 1024
    IMAGE_MAX_BYTES_PROJECT = 10 * 1024 * 1024
    IMAGE_MAX_BYTES_NOTE = 10 * 1024 * 1024
    IMAGE_MAX_BYTES_BADGE = 2 * 1024 * 1024
    MAX_IMAGE_PIXELS = 25_000_000  # width * height
    IMAGE_MAX_FRAMES = 100  # animated GIF / WebP / APNG


    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
    if not ADMIN_PASSWORD:
        if os.getenv("FLASK_ENV") == "production":
            raise RuntimeError("ADMIN_PASSWORD must be set in production environment!")
        ADMIN_PASSWORD = "admin-dev-password"  # Slightly better than 1234

    # Cognito OAuth configuration
    COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")
    COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")
    COGNITO_CLIENT_SECRET = os.getenv("COGNITO_CLIENT_SECRET")
    COGNITO_DOMAIN = os.getenv("COGNITO_DOMAIN")
    COGNITO_REDIRECT_URI = os.getenv("COGNITO_REDIRECT_URI")
    COGNITO_REGION = os.getenv("COGNITO_REGION", "us-east-1")

    # SES Email configuration
    SES_REGION = os.getenv("AWS_SES_REGION", "ap-southeast-1")
    SES_SENDER_EMAIL = os.getenv("SES_SENDER_EMAIL", "noreply@benmega.com")
    ADMIN_EMAIL_ADDRESS = os.getenv("ADMIN_EMAIL_ADDRESS")

    # S3 storage (notes images and project videos). The defaults are the production values.
    AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-1")
    S3_NOTES_BUCKET = os.getenv("S3_NOTES_BUCKET", "classroom-chat-student-notes")
    S3_UPLOAD_BUCKET = os.getenv(
        "S3_UPLOAD_BUCKET", "youtube-upload-source-classroom-chat"
    )

    # SocketIO configuration. main.py reads the same variable to decide whether
    # to gevent-monkey-patch, so the two always agree.
    SOCKETIO_ASYNC_MODE = os.getenv("SOCKETIO_ASYNC_MODE") or "gevent"

    # Rate limiter storage. The in-memory default is per process, which is only
    # correct while a single worker serves the app (see docs/infrastructure_and_devops.md).
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")

    # Background session cleanup (application/tasks.py). The scheduler must run in
    # exactly one process: set SCHEDULER_ENABLED=0 on every worker but one.
    SCHEDULER_ENABLED = os.getenv("SCHEDULER_ENABLED", "1").strip().lower() not in (
        "0",
        "false",
        "no",
    )
    SESSION_STALE_TIMEOUT_MINUTES = int(os.getenv("SESSION_STALE_TIMEOUT_MINUTES", 10))

    # Number of reverse proxies in front of the app whose X-Forwarded-* headers
    # are trusted (werkzeug ProxyFix). 0 ignores them.
    TRUSTED_PROXY_COUNT = int(os.getenv("TRUSTED_PROXY_COUNT", 0))


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DEV_DATABASE_URI",
        f"sqlite:///{os.path.join(Config.INSTANCE_FOLDER, 'dev_users.db')}",
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
        f"sqlite:///{os.path.join(Config.INSTANCE_FOLDER, 'prod_users.db')}",
    )
    # nginx is the one proxy in front of gunicorn.
    TRUSTED_PROXY_COUNT = int(os.getenv("TRUSTED_PROXY_COUNT", 1))

    SESSION_COOKIE_DOMAIN = ".benmega.com"
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    WTF_CSRF_DOMAIN = ".benmega.com"
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None  # Sessions are short, don't expire tokens separately
    WTF_CSRF_SSL_STRICT = (
        False  # Disable strict referer checking for cross-subdomain requests
    )

    # Build folders for Vite
    TEMPLATE_FOLDER = os.path.join(Config.BASE_DIR, "frontend", "dist")
    STATIC_FOLDER = os.path.join(Config.BASE_DIR, "frontend", "dist")

    CORS_ORIGINS = cors_origins_from_env(DEFAULT_PROD_CORS_ORIGINS)
