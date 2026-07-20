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
        import sys
        if app.config.get("ENV") != "production" and "db" not in sys.argv:
            db.create_all()
            if app.config.get("ENV") == "development":
                check_for_schema_drift(app)
        inspector = inspect(db.engine)
        if "db" not in sys.argv:
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
    from application.models.store_item import StoreItem
    import logging

    logger = logging.getLogger(__name__)
    import sqlalchemy

    # Guard: skip seeding if the schema hasn't been migrated yet.
    # This allows 'flask db upgrade' to load the app without crashing.
    import sys
    if "db" in sys.argv:
        logger.info("seed_global_data: skipping — 'flask db' command detected.")
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

        # 3. Ensure store items exist
        default_store_items = [
            {"name": "Chat Font Color", "description": "Unlock the ability to change the color of your chat messages.", "base_price": 0.008},
            {"name": "Animated Profile Border", "description": "Stand out with an animated border around your profile picture.", "base_price": 0.01},
            {"name": "Custom Profile Wallpaper", "description": "Set a custom wallpaper for your user profile page.", "base_price": 0.015},
            {"name": "Auto Bitshift", "description": "Automatically perform bitshift operations on your packets.", "base_price": 0.025},
            {"name": "Auto Challenge Claimer", "description": "Automatically claim rewards from completed challenges.", "base_price": 0.018},
            {"name": "Permanent Double Duck", "description": "Permanently double all your duck earnings! This stacks with global multipliers.", "base_price": 0.05},
        ]

        for item_data in default_store_items:
            item = StoreItem.query.filter_by(name=item_data["name"]).first()
            if not item:
                db.session.add(StoreItem(**item_data))
                logger.info(f"Seeded store item '{item_data['name']}'.")

        # 4. Ensure default project templates exist
        from application.models.project_template import ProjectTemplate
        default_templates = [
            {
                "name": "CS1 Capstone",
                "description": "Students create a custom Python project utilizing Turtle graphics to design artwork, draw shapes, and build animations. They learn how to control turtle movement, use variables, loops, and conditions to structure their drawing logic, and organize code into functions. By the end, students understand coordinate systems, color maps, and procedural drawing."
            },
            {
                "name": "CS2 Capstone",
                "description": "Students design and build a 2D interactive game or simulation using conditional logic, keyboard controls, and collision detection. They learn to manage game state, implement loops, handle player input, and dynamically update game elements on screen. By the end, students understand key game design principles and state-driven program flow."
            },
            {
                "name": "Tabula Rasa",
                "description": "In this project students create a CodeCombat game level from scratch by spawning all the objects enemies and goals needed to make the game playable. They learn how to use coordinates to position items on the grid set object properties to control behavior and define victory conditions through goals."
            },
            {
                "name": "Text-Based Adventure",
                "description": "In this project students create a text-based adventure game where players navigate through different scenarios solving puzzles and making choices that affect the outcome. The game introduces basic coding concepts such as variables loops and conditionals. It offers an interactive and engaging way to learn programming while creating a fun story-driven experience."
            },
            {
                "name": "Dangerous Skies",
                "description": "Create an obstacle course using for and while loops based on player performance. Learning Goals: Use for and while loops to build an obstacle course. Concepts Covered: Data Types For Loops Iteration Nesting While Loops"
            }
        ]

        for template_data in default_templates:
            template = ProjectTemplate.query.filter_by(name=template_data["name"]).first()
            if not template:
                db.session.add(ProjectTemplate(**template_data))
                logger.info(f"Seeded project template '{template_data['name']}'.")

        db.session.commit()

    except sqlalchemy.exc.OperationalError as exc:
        db.session.rollback()
        logger.warning(f"seed_global_data skipped due to OperationalError (schema drift?): {exc}")
    except Exception as exc:
        db.session.rollback()
        logger.error(f"seed_global_data failed: {exc}")
        raise
