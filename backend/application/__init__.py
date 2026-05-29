import logging
import os
from datetime import timedelta

from flask import Flask, session, g, jsonify
from flask_cors import CORS
from flask_limiter import RateLimitExceeded
from sqlalchemy import inspect
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.middleware.proxy_fix import ProxyFix

from application.config import DevelopmentConfig, TestingConfig, ProductionConfig
from application.extensions import db, socketio, limiter, scheduler, csrf, migrate
from application.models import setup_models
from application.models.configuration import Configuration
from application.models.user import User
from application.routes import register_blueprints
from application.constants import (
    GLOBAL_CLASSROOM_ID as GLOBAL_CLASSROOM_ID,
)  # imported for side-effect availability

from .license_checker import load_license
from application.utilities.helper_functions import format_number
from application.utilities.schema_check import check_for_schema_drift
from flask_wtf.csrf import generate_csrf


def create_app(config_class=None):
    log_formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_formatter)

    log_dir = os.path.join(
        os.path.abspath(os.path.dirname(os.path.dirname(__file__))), "instance"
    )
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    file_handler = logging.FileHandler(os.path.join(log_dir, "app.log"))
    file_handler.setFormatter(log_formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    logger = logging.getLogger(__name__)

    # Dynamically select config if not explicitly passed
    if config_class is None:
        env = os.getenv("FLASK_ENV", "development").lower()
        logger.info(f"Configuring app for environment: {env}")
        if env == "production":
            config_class = ProductionConfig
        elif env == "testing":
            config_class = TestingConfig
        else:
            config_class = DevelopmentConfig

    template_folder = getattr(config_class, "TEMPLATE_FOLDER", "templates")
    static_folder = getattr(config_class, "STATIC_FOLDER", "static")
    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
    app.config.from_object(config_class)

    # In production, TEMPLATE_FOLDER points to the built frontend/dist.
    # We add frontend/templates as a fallback so Flask-Admin templates are still found.
    from jinja2 import ChoiceLoader, FileSystemLoader

    app.jinja_loader = ChoiceLoader(
        [
            app.jinja_loader,
            FileSystemLoader(
                os.path.join(app.config.get("BASE_DIR", ""), "frontend", "templates")
            ),
        ]
    )

    cors_origins = getattr(
        config_class,
        "CORS_ORIGINS",
        [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "http://localhost:8000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:5175",
            "http://127.0.0.1:8000",
        ],
    )
    CORS(
        app,
        origins=cors_origins,
        supports_credentials=True,
    )

    # x_for=1 tells Flask to trust the first X-Forwarded-For header
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(hours=10)

    base_dir = os.path.abspath(os.path.dirname(__file__))
    license_dir = os.path.abspath(os.path.join(base_dir, "..", "license"))

    public_key_path = os.path.join(license_dir, "public_key.pem")
    license_path = os.path.join(license_dir, "license.lic")

    license_data = load_license(
        public_key_path=public_key_path, license_path=license_path
    )
    app.config["IS_PREMIUM"] = license_data["is_premium"]
    app.config["LICENSEE"] = license_data.get("licensee", "Unknown")

    db.init_app(app)
    migrate.init_app(app, db)
    # cors_allowed_origins must match cors_origins exactly — using "*" alongside
    # withCredentials:true on the client causes browsers to block the handshake.
    socketio.init_app(
        app,
        cors_allowed_origins=cors_origins,
        async_mode=app.config.get("SOCKETIO_ASYNC_MODE"),
    )
    limiter.init_app(app)
    scheduler.init_app(app)

    from . import socket_events as socket_events  # noqa: F401 - needed for side effects

    csrf.init_app(app)
    register_blueprints(app)

    from . import tasks

    tasks.set_app_instance(app)

    with app.app_context():
        setup_models()

        # Only use create_all in non-production environments to avoid schema drift issues.
        # Production should use migrations via 'flask db upgrade'.
        if app.config.get("ENV") != "production":
            db.create_all()
            if app.config.get("ENV") == "development":
                check_for_schema_drift(app)
        inspector = inspect(db.engine)
        if not inspector.has_table("users"):
            # This part is now redundant for create_all, but we still want to ensure default config if it was a fresh DB
            ensure_default_configuration()
            logger.info("Database initialized for the first time.")
        else:
            # Still check if we need to ensure default configuration even if users exists
            ensure_default_configuration()

        scheduler.start()

        # Ensure global classroom + conversation exist and update the
        # in-process GLOBAL_CONVERSATION_ID constant.
        seed_global_data()

    @app.before_request
    def load_user():
        user_id = session.get("user")
        g.user = User.query.filter_by(id=user_id).first() if user_id else None

    @app.context_processor
    def inject_user():
        return {"user": g.get("user")}

    @app.errorhandler(RequestEntityTooLarge)
    def handle_large_request(error):
        return jsonify({"error": "Request body too large"}), 413

    @app.errorhandler(RateLimitExceeded)
    def ratelimit_handler(e):
        return (
            jsonify(
                {
                    "error": "Rate limit exceeded",
                    "message": "You're sending messages too quickly. Please wait a bit!",
                    "retry_after": e.description,
                }
            ),
            429,
        )

    @app.template_filter("format_number")
    def format_number_filter(value, precision=0):
        return format_number(value, precision)

    @app.after_request
    def set_csrf_cookie(response):
        # We set the CSRF cookie so the frontend (Axios) can read it and send it back in headers.
        # This is safe because it's only accessible to our own frontend via SameSite=Lax/Strict.
        response.set_cookie(
            "csrf_token_v2",
            generate_csrf(),
            domain=app.config.get("WTF_CSRF_DOMAIN") or app.config.get("SESSION_COOKIE_DOMAIN"),
            samesite=app.config.get("SESSION_COOKIE_SAMESITE", "Lax"),
            secure=app.config.get("SESSION_COOKIE_SECURE", False),
            httponly=False
        )
        return response

    return app


def ensure_default_configuration():
    if Configuration.query.first() is None:
        default_config = Configuration(ai_teacher_enabled=False)
        db.session.add(default_config)
        db.session.commit()


def seed_global_data():
    """
    Idempotently ensure the reserved classrooms and global conversation exist.
    Populates application.constants.GLOBAL_CONVERSATION_ID in-process so
    routes can import it as a constant without hitting the DB every request.

    Skips gracefully if the schema is not yet migrated (e.g. during
    'flask db upgrade' before the conversations table has classroom_id).
    """
    import application.constants as _constants
    from application.models.classroom import Classroom
    from application.models.conversation import Conversation

    logger = logging.getLogger(__name__)

    # Guard: skip seeding if the schema hasn't been migrated yet.
    # This allows 'flask db upgrade' to load the app without crashing.
    import sys
    if "db" in sys.argv:
        logger.info("seed_global_data: skipping — 'flask db' command detected.")
        return

    inspector = inspect(db.engine)
    if inspector.has_table("conversations"):
        conv_cols = {c["name"] for c in inspector.get_columns("conversations")}
        if "classroom_id" not in conv_cols:
            logger.warning(
                "seed_global_data: skipping — conversations.classroom_id missing. "
                "Run 'flask db upgrade' first."
            )
            return

    try:
        # 1. Ensure 'global' classroom exists
        if not db.session.get(Classroom, _constants.GLOBAL_CLASSROOM_ID):
            db.session.add(
                Classroom(
                    id=_constants.GLOBAL_CLASSROOM_ID,
                    name="Global Announcements",
                    language="python",
                    url="global",
                )
            )
            db.session.flush()
            logger.info("Seeded 'global' classroom.")

        # 2. Ensure 'archive' classroom exists
        if not db.session.get(Classroom, "archive"):
            db.session.add(
                Classroom(
                    id="archive", name="Archive", language="python", url="archive"
                )
            )
            db.session.flush()
            logger.info("Seeded 'archive' classroom.")

        # 3. Ensure the canonical global conversation exists
        global_conv = Conversation.query.filter_by(
            classroom_id=_constants.GLOBAL_CLASSROOM_ID
        ).first()

        if not global_conv:
            global_conv = Conversation(
                title="Global Announcements",
                classroom_id=_constants.GLOBAL_CLASSROOM_ID,
                is_locked=False,
                slow_mode_delay=0,
            )
            db.session.add(global_conv)
            db.session.flush()
            logger.info(f"Seeded global conversation id={global_conv.id}.")

        db.session.commit()

        # 4. Populate the in-process constant
        _constants.GLOBAL_CONVERSATION_ID = global_conv.id
        logger.info(f"GLOBAL_CONVERSATION_ID = {global_conv.id}")

    except Exception as exc:
        db.session.rollback()
        logger.error(f"seed_global_data failed: {exc}")
        raise
