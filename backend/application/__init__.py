import contextlib
import logging
import os
from datetime import timedelta

from application.config import DevelopmentConfig, ProductionConfig, TestingConfig
from application.constants import (
    GLOBAL_CLASSROOM_ID as GLOBAL_CLASSROOM_ID,
)  # imported for side-effect availability
from application.extensions import csrf, db, limiter, migrate, scheduler, socketio
from application.models import setup_models
from application.models.configuration import Configuration
from application.models.user import User
from application.routes import register_blueprints
from application.utilities.helper_functions import format_number
from application.utilities.schema_check import check_for_schema_drift
from flask import Flask, g, jsonify, session
from flask_cors import CORS
from flask_limiter import RateLimitExceeded
from flask_talisman import Talisman
from flask_wtf.csrf import generate_csrf
from sqlalchemy import inspect
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.middleware.proxy_fix import ProxyFix


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

    is_prod = os.getenv("FLASK_ENV", "development").lower() == "production"
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    if is_prod:
        app.config["SESSION_COOKIE_SECURE"] = True

    csp = {
        'default-src': [
            '\'self\'',
            '\'unsafe-inline\'',
            '\'unsafe-eval\'',
            'data:',
            'blob:',
            'http:',
            'https:',
            'ws:',
            'wss:'
        ]
    }
    Talisman(app, force_https=is_prod, content_security_policy=csp, session_cookie_secure=is_prod, session_cookie_http_only=True)

    # x_for=1 tells Flask to trust the first X-Forwarded-For header.
    # Only trust proxy headers in production, where nginx sets them. Trusting
    # them in development would let anyone on the network spoof
    # X-Forwarded-For: 127.0.0.1 and pass dev-login's localhost-only guard.
    if os.getenv("FLASK_ENV", "development").lower() == "production":
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(hours=10)

    db.init_app(app)
    migrate.init_app(app, db)
    # cors_allowed_origins must match cors_origins exactly — using "*" alongside
    # withCredentials:true on the client causes browsers to block the handshake.
    limiter.init_app(app)
    with contextlib.suppress(Exception):
        socketio.init_app(
            app,
            cors_allowed_origins=cors_origins,
            async_mode=app.config.get("SOCKETIO_ASYNC_MODE"),
        )
    with contextlib.suppress(Exception):
        scheduler.init_app(app)

    from . import socket_events as socket_events

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

        try:
            if not getattr(scheduler, "running", False):
                scheduler.start()
        except Exception:
            pass

        # Ensure global classroom + conversation exist and update the
        # in-process GLOBAL_CONVERSATION_ID constant.
        seed_global_data()

    @app.before_request
    def load_user():
        user_id = session.get("user")
        g.user = User.query.filter_by(id=user_id).first() if user_id else None

    @app.context_processor
    def inject_user():
        return {"user": getattr(g, "user", None)}

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
                    "retry_after": getattr(e, "description", str(e)),
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
            domain=app.config.get("WTF_CSRF_DOMAIN")
            or app.config.get("SESSION_COOKIE_DOMAIN"),
            samesite=app.config.get("SESSION_COOKIE_SAMESITE", "Lax"),
            secure=app.config.get("SESSION_COOKIE_SECURE", False),
            httponly=False,
        )
        return response

    from application.commands.seed import seed_command

    app.cli.add_command(seed_command)

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
    import logging

    import application.constants as _constants
    from application.models.classroom import Classroom
    from application.models.store_item import StoreItem

    logger = logging.getLogger(__name__)
    # Guard: skip seeding if the schema hasn't been migrated yet.
    # This allows 'flask db upgrade' to load the app without crashing.
    import sys

    import sqlalchemy

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
                )
            )
            db.session.flush()
            logger.info("Seeded 'global' classroom.")

        # 2. Ensure 'archive' classroom exists
        if not db.session.get(Classroom, "archive"):
            db.session.add(Classroom(id="archive", name="Archive", language="python"))
            db.session.flush()
            logger.info("Seeded 'archive' classroom.")

        # 3. Ensure store items exist
        default_store_items = [
            {
                "name": "Chat Font Color",
                "description": "Unlock the ability to change the color of your chat messages.",
                "base_price": 0.008,
            },
            {
                "name": "Animated Profile Border",
                "description": "Stand out with an animated border around your profile picture.",
                "base_price": 0.01,
            },
            {
                "name": "Custom Profile Wallpaper",
                "description": "Set a custom wallpaper for your user profile page.",
                "base_price": 0.015,
            },
            {
                "name": "Auto Bitshift",
                "description": "Automatically perform bitshift operations on your packets.",
                "base_price": 0.025,
            },
            {
                "name": "Auto Challenge Claimer",
                "description": "Automatically claim rewards from completed challenges.",
                "base_price": 0.018,
            },
            {
                "name": "Permanent Double Duck",
                "description": "Permanently double all your duck earnings! This stacks with global multipliers.",
                "base_price": 0.05,
            },
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
                "name": "Text-Based Adventure",
                "description": "In this project students create a text-based adventure game where players navigate through different scenarios solving puzzles and making choices that affect the outcome. The game introduces basic coding concepts such as variables loops and conditionals. It offers an interactive and engaging way to learn programming while creating a fun story-driven experience.",
                "chapter": "Computer Science 2",
            },
            {
                "name": "Practical Programming",
                "description": "In this project students designed and built a practical program to solve a real-life problem or simplify a daily task. They brainstormed ideas identified a need and used their coding skills to create a tool or script that met this need. The project encouraged creative thinking and helped students apply what they learned in class. By the end they had a functional program that could be used beyond the classroom showing how coding can make everyday tasks easier.",
                "chapter": None,
            },
            {
                "name": "Dangerous Skies",
                "description": "Create an obstacle course using for and while loops based on player performance. Learning Goals: Use for and while loops to build an obstacle course. Concepts Covered: Data Types For Loops Iteration Nesting While Loops",
                "chapter": "Ozaria Chapter 3",
            },
            {
                "name": "Turtle Dragon",
                "description": "This project helps students practice key programming concepts like objects, methods, and arguements all while expressing their creativity. Each student will design and code their own unique dragon bringing it to life through code.",
                "chapter": "Introduction to Computer Science",
            },
            {
                "name": "Simulation",
                "description": "In this capstone project students will create a simulation of their choosing. The project emphasizes applying the Engineering Design Process: defining the problem designing a solution building the simulation revising based on user feedback and reflecting on the process. Students are encouraged to use tools and resources including randomization or other functions to create dynamic simulations. Peer collaboration is key as students will test each other's simulations and provide constructive feedback to improve the final project.",
                "chapter": "Computer Science 3",
            },
            {
                "name": "bolt.new",
                "description": "In this project students utilize bolt.new—an AI-powered web development environment—to prompt iterate and deploy a full-stack web application using natural language commands.",
                "chapter": None,
            },
            {
                "name": "Tabula Rasa",
                "description": "In this project students create a CodeCombat game level from scratch by spawning all the objects enemies and goals needed to make the game playable. They learn how to use coordinates to position items on the grid set object properties to control behavior and define victory conditions through goals. By the end students understand how a game world is built programmatically—how each element is placed configured and connected to form a complete functional level.",
                "chapter": "Game Development 1",
            },
            {
                "name": "Gauntlet",
                "description": "In this challenge students must program their hero to survive a gauntlet of enemies and traps. The project focuses on refining movement logic timing and debugging code to ensure the hero completes the course safely.",
                "chapter": "Sky Mountain",
            },
            {
                "name": "Game Dev 1 Final Project",
                "description": "In this project students create a CodeCombat game level from scratch by spawning all the objects enemies and goals needed to make the game playable. They learn how to use coordinates to position items on the grid set object properties to control behavior and define victory conditions through goals.",
                "chapter": "Game Development 1",
            },
            {
                "name": "Story Maker",
                "description": "Students use event handling and conditionals to create an interactive story. This project focuses on capturing user input to create branching narratives allowing players to choose different paths through the storyline.",
                "chapter": "Ozaria Chapter 2",
            },
            {
                "name": "Wanted Poster",
                "description": "Students apply their knowledge of layout and positioning to design a digital Wanted Poster. This project emphasizes the use of coordinates (or HTML/CSS) to arrange text and images in a visually appealing format.",
                "chapter": "Web Development 1",
            },
            {
                "name": "Game Dev 2 Final Project",
                "description": "Students build a complex game level that introduces user input handling. They learn to create event listeners for keyboard or mouse actions allowing for interactive character movement and game mechanics.",
                "chapter": "Game Development 2",
            },
            {
                "name": "Quizlet",
                "description": "Students create a quiz application using data structures like arrays and dictionaries. The focus is on storing questions and answers paired together checking user input against the stored data and tracking the score.",
                "chapter": "Web Development 2",
            },
            {
                "name": "Game Dev 3",
                "description": "In this advanced game development project students implement complex game logic including multiple levels scoring systems and enemy AI behavior. It requires mastering functions and state management.",
                "chapter": "Game Development 3",
            },
            {
                "name": "Arcade Card or Board Game",
                "description": "Students design and program a digital version of a classic arcade card or board game. This project emphasizes object-oriented programming principles game physics and complex logic flow.",
                "chapter": "Computer Science 4",
            },
            {
                "name": "Curiosity Sandbox",
                "description": "Students utilize advanced logic and creative coding tools to build an open-ended simulation or interactive art piece. The project encourages experimentation with loops and variables to generate dynamic visual effects.",
                "chapter": "Ozaria 4",
            },
            {
                "name": "Binary Search & Algorithms",
                "description": "Students explore computer science fundamentals by implementing efficient search and sorting algorithms to solve complex data problems.",
                "chapter": "Computer Science 5",
            },
            {
                "name": "Capstone Challenge",
                "description": "The final challenge where students combine all learned skills to solve complex algorithmic puzzles or build a comprehensive software application from scratch.",
                "chapter": "Computer Science 6",
            },
            {
                "name": "Group Roblox Game",
                "description": "Our class has completed our first group project '” their very own Roblox game! By working together, they were able to build something much bigger than they could have achieved individually. While the game itself still has a lot of work ahead, this project has been a fantastic experience in teamwork, collaboration, and real-world development.",
                "chapter": "Ozaria 4",
            },
            {
                "name": "Favorite Animal Page",
                "description": "",
                "chapter": "Web Development 1",
            },
            {
                "name": "Profile Page",
                "description": "Students put their knowledge of HTML, CSS, and JS to work by creating their very own profile page! This will be a starting point for a future portfolio/resume page where they can show off all their accomplishments.",
                "chapter": "Web Development 2",
            },
            {
                "name": "CS1 Capstone",
                "description": "Students create a custom Python project utilizing Turtle graphics to design artwork, draw shapes, and build animations. They learn how to control turtle movement, use variables, loops, and conditions to structure their drawing logic, and organize code into functions. By the end, students understand coordinate systems, color maps, and procedural drawing.",
                "chapter": "Computer Science 1",
            },
            {
                "name": "CS2 Capstone",
                "description": "Students design and build a 2D interactive game or simulation using conditional logic, keyboard controls, and collision detection. They learn to manage game state, implement loops, handle player input, and dynamically update game elements on screen. By the end, students understand key game design principles and state-driven program flow.",
                "chapter": "Computer Science 2",
            },
        ]

        for template_data in default_templates:
            template = ProjectTemplate.query.filter_by(
                name=template_data["name"]
            ).first()
            if not template:
                db.session.add(ProjectTemplate(**template_data))
                logger.info(f"Seeded project template '{template_data['name']}'.")
            else:
                if template.chapter != template_data.get("chapter"):
                    template.chapter = template_data.get("chapter")
                    logger.info(f"Updated chapter for project template '{template_data['name']}'.")

        db.session.commit()

    except sqlalchemy.exc.OperationalError as exc:
        db.session.rollback()
        logger.warning(
            f"seed_global_data skipped due to OperationalError (schema drift?): {exc}"
        )
    except Exception as exc:
        db.session.rollback()
        logger.exception(f"seed_global_data failed: {exc}")
        raise
