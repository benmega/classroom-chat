"""
File: conftest.py
Type: py
Summary: Pytest configuration and fixtures (Restored + New Helpers).
"""

import base64
import os
import random
import socket
import string
import tempfile
import threading
import uuid
from io import BytesIO
from unittest.mock import patch
from wsgiref.simple_server import make_server

import pytest
from PIL import Image
from flask_login import LoginManager

from application import create_app
from application.config import TestingConfig
from application.extensions import db
from application.models.achievements import UserAchievement, Achievement
from application.models.ai_settings import AISettings
from application.models.banned_words import BannedWords
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.configuration import Configuration
from application.models.conversation import Conversation
from application.models.course import Course
from application.models.message import Message
from application.models.project import Project
from application.models.skill import Skill
from application.models.user import User

db_fd, db_path = tempfile.mkstemp(suffix=".db")

# ============================================================================
# ORIGINAL CORE FIXTURES (RESTORED)
# ============================================================================


@pytest.fixture(scope="module", autouse=True)
def setup_directories():
    os.makedirs("userData/image", exist_ok=True)
    os.makedirs("userData/pdfs", exist_ok=True)
    os.makedirs("userData/other", exist_ok=True)


@pytest.fixture(scope="session")
def test_app():
    app = create_app(TestingConfig)

    # --- CRITICAL FIX ---
    # Overwrite the in-memory DB with a file-based DB so threads can share it
    app.config.update(
        {
            "TESTING": True,
            "WTF_CSRF_ENABLED": False,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{db_path}",
        }
    )
    # --------------------

    if not hasattr(app, "login_manager"):
        login_manager = LoginManager()
        login_manager.init_app(app)
        app.login_manager = login_manager

        @login_manager.user_loader
        def load_user(user_id):
            return User.query.get(int(user_id))

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


# Ensure we clean up the temp file after all tests are done
@pytest.fixture(scope="session", autouse=True)
def cleanup_temp_db(request):
    def remove_db():
        os.close(db_fd)
        if os.path.exists(db_path):
            os.remove(db_path)

    request.addfinalizer(remove_db)


# ============================================================================
# NEW HELPERS & OVERRIDES
# ============================================================================


# 1. Alias fixture: pytest-flask specifically looks for a fixture named "app"
@pytest.fixture(scope="session")
def app(test_app):
    return test_app


# 2. License Fix: Create a dummy license file so the app doesn't complain
@pytest.fixture(scope="session", autouse=True)
def create_dummy_license():
    license_dir = os.path.join(os.getcwd(), "license")
    os.makedirs(license_dir, exist_ok=True)
    license_path = os.path.join(license_dir, "license.lic")

    # Only create if it doesn't exist
    if not os.path.exists(license_path):
        with open(license_path, "w") as f:
            f.write("DUMMY_LICENSE_FOR_TESTING")

    yield
    # Optional: cleanup after tests if you want
    # if os.path.exists(license_path):
    #     os.remove(license_path)


# 3. OVERRIDE: Custom live_server for Windows compatibility
@pytest.fixture(scope="session")
def live_server(test_app):  # <--- CHANGED: Request 'test_app' explicitly
    """
    Runs the Flask app in a background thread to avoid Windows
    multiprocessing pickle errors.
    """
    # Find a free port
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("localhost", 0))
    port = sock.getsockname()[1]
    sock.close()

    # Create the server using the Flask app object from test_app fixture
    server = make_server("localhost", port, test_app)

    # Start the server in a thread
    thread = threading.Thread(target=server.serve_forever)
    thread.daemon = True
    thread.start()

    # Return an object compatible with pytest-flask
    class ServerInfo:
        url = f"http://localhost:{port}"
        app = test_app  # <--- Assign the actual Flask object

    yield ServerInfo()

    # Teardown
    server.shutdown()
    thread.join()


@pytest.fixture
def client(test_app):
    return test_app.test_client()


@pytest.fixture
def logged_in_client(client, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.username
        sess["_user_id"] = str(sample_user.id)
    return client


@pytest.fixture
def init_db(test_app):
    with test_app.app_context():
        db.create_all()
        yield db
        db.session.rollback()
        db.drop_all()


def generate_random_slug(length=10):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=length))


@pytest.fixture
def add_sample_user(init_db):
    def _add_user(
        username, password, earned_ducks=0, profile_picture="Default_pfp.jpg"
    ):
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            db.session.delete(existing_user)
            db.session.commit()

        user = User(
            username=username,
            password_hash=password,
            earned_ducks=earned_ducks,
            duck_balance=earned_ducks,
            profile_picture=profile_picture,
        )
        db.session.add(user)
        db.session.commit()
        return user

    return _add_user


@pytest.fixture
def sample_user_with_ducks(test_app):
    with test_app.app_context():
        db.create_all()
        try:
            user = User(
                username="user_with_ducks",
                password_hash="test_password",
                earned_ducks=50,
                duck_balance=50,
            )
            db.session.add(user)
            db.session.commit()
            yield user
        except Exception as e:
            db.session.rollback()
            raise e
        finally:
            try:
                user_to_delete = (
                    db.session.query(User).filter_by(username="user_with_ducks").first()
                )
                if user_to_delete:
                    db.session.delete(user_to_delete)
                    db.session.commit()
            except Exception:
                db.session.rollback()


@pytest.fixture
def sample_challenge(init_db):
    slug = f"sample-challenge-{generate_random_slug()}"
    challenge = Challenge(
        name=f"Sample Challenge-{generate_random_slug()}",
        slug=slug,
        domain="Test Domain",
        difficulty="medium",
        value=10,
        is_active=True,
    )
    db.session.add(challenge)
    db.session.commit()
    return challenge


@pytest.fixture
def sample_user(init_db):
    username = f"user_{uuid.uuid4().hex[:8]}"
    user = User(username=username, password_hash="hashedpassword")
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def sample_admin(init_db):
    username = TestingConfig.ADMIN_USERNAME
    password = TestingConfig.ADMIN_PASSWORD
    admin_user = User(
        username=username, password_hash=password, earned_ducks=0, duck_balance=0
    )
    db.session.add(admin_user)
    db.session.commit()
    return admin_user


@pytest.fixture
def logged_in_admin(client, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.username
    return client


@pytest.fixture
def sample_challenge_log(init_db):
    unique_username = f"user_{uuid.uuid4()}"
    unique_slug = f"challenge-slug-{uuid.uuid4()}"
    challenge_log = ChallengeLog(
        username=unique_username,
        domain="codecombat.com",
        challenge_slug=unique_slug,
        course_id="12345",
        course_instance="spring2025",
    )
    db.session.add(challenge_log)
    db.session.commit()
    return challenge_log


@pytest.fixture
def sample_ai_settings(test_app):
    with test_app.app_context():
        db.create_all()
        settings = [
            AISettings(key="role", value="Custom AI role"),
            AISettings(key="username", value="AI Teacher"),
            AISettings(key="chat_bot_enabled", value="True"),
        ]
        db.session.add_all(settings)
        db.session.commit()
        yield settings
        db.session.remove()
        db.drop_all()


@pytest.fixture
def sample_banned_words(init_db):
    words = [
        BannedWords(word="forbidden", reason="Inappropriate language", active=True),
        BannedWords(word="bannedword", reason="General ban", active=False),
    ]
    db.session.add_all(words)
    db.session.commit()
    return words


@pytest.fixture
def sample_configuration(init_db):
    config = Configuration(
        ai_teacher_enabled=True,
        message_sending_enabled=True,
        # Added multiplier here to support new tests without breaking old ones
        duck_multiplier=1,
    )
    db.session.add(config)
    db.session.commit()
    return config


@pytest.fixture
def sample_users(init_db):
    user1 = User(username=f"User_{uuid.uuid4().hex[:8]}", password_hash="test")
    user2 = User(username=f"User_{uuid.uuid4().hex[:8]}", password_hash="test")
    db.session.add_all([user1, user2])
    db.session.commit()
    return [user1, user2]


@pytest.fixture
def sample_conversation(init_db, sample_users):
    conversation = Conversation(title=f"Sample Conversation {uuid.uuid4().hex[:8]}")
    conversation.users.extend(sample_users)
    db.session.add(conversation)
    db.session.commit()
    return conversation


@pytest.fixture
def sample_course(init_db):
    course = Course(
        id=f"course_{uuid.uuid4().hex[:8]}",
        name="Intro to Programming",
        domain="codecombat.com",
        description="Learn the basics of programming.",
        is_active=True,
    )
    db.session.add(course)
    db.session.commit()
    return course


@pytest.fixture
def sample_message(init_db, sample_user, sample_conversation):
    message = Message(
        conversation_id=sample_conversation.id,
        user_id=sample_user.id,
        content="This is a test message.",
        message_type="text",
    )
    db.session.add(message)
    db.session.commit()
    return message


@pytest.fixture
def sample_project(init_db, sample_user):
    project = Project(
        name=f"Project_{uuid.uuid4().hex[:8]}",
        description="This is a sample project description.",
        link="http://example.com",
        user_id=sample_user.id,
    )
    db.session.add(project)
    db.session.commit()
    return project


@pytest.fixture
def sample_skill(init_db, sample_user):
    skill = Skill(name="Python", user_id=sample_user.id)
    db.session.add(skill)
    db.session.commit()
    return skill


@pytest.fixture
def sample_image_data():
    image = Image.new("RGB", (100, 100), color=(73, 109, 137))
    img_io = BytesIO()
    image.save(img_io, "PNG")
    img_io.seek(0)
    image_data = base64.b64encode(img_io.read()).decode("utf-8")
    return f"data:image/png;base64,{image_data}"


@pytest.fixture
def auth_headers(sample_admin):
    import base64
    from application.config import TestingConfig

    credentials = f"{TestingConfig.ADMIN_USERNAME}:{TestingConfig.ADMIN_PASSWORD}"
    encoded = base64.b64encode(credentials.encode()).decode("utf-8")
    return {"Authorization": f"Basic {encoded}"}


@pytest.fixture
def sample_duck_trade(init_db, sample_user):
    try:
        from application.models.duck_trade import DuckTradeLog

        sample_user.duck_balance = 100
        trade = DuckTradeLog(
            username=sample_user.username,
            digital_ducks=1,
            bit_ducks=[1, 0, 0, 0, 0, 0, 0],
            byte_ducks=[0, 0, 0, 0, 0, 0, 0],
            status="pending",
        )
        db.session.add(trade)
        db.session.commit()
        trade = DuckTradeLog.query.get(trade.id)
        return trade
    except ImportError:
        return None


@pytest.fixture
def sample_achievement(init_db):
    achievement = Achievement(
        name="Python Master",
        slug="python-basics",
        type="certificate",
        reward=100,
        description="Complete the Python basics course",
        requirement_value="100",
        source="codecombat.com",
    )
    db.session.add(achievement)
    db.session.commit()
    return achievement


@pytest.fixture
def sample_user_achievement(init_db, sample_user, sample_achievement):
    user_achievement = UserAchievement(
        user_id=sample_user.id, achievement_id=sample_achievement.id
    )
    db.session.add(user_achievement)
    db.session.commit()
    return user_achievement


@pytest.fixture
def sample_ducks_achievement(init_db):
    achievement = Achievement(
        name="Duck Collector",
        slug="duck-collector-50",
        type="ducks",
        reward=10,
        description="Collect 50 ducks",
        requirement_value="50",
    )
    db.session.add(achievement)
    db.session.commit()
    return achievement


@pytest.fixture
def sample_chat_achievement(init_db):
    achievement = Achievement(
        name="First Message",
        slug="first-message",
        type="chat",
        reward=10,
        description="Send your first message",
        requirement_value="1",
    )
    db.session.add(achievement)
    db.session.commit()
    return achievement


@pytest.fixture
def sample_new_achievements(init_db):
    achievements = [
        Achievement(
            name="First Message",
            slug="first-message",
            type="chat",
            reward=10,
            description="Send your first message",
            requirement_value="1",
        ),
        Achievement(
            name="Duck Collector",
            slug="duck-collector-10",
            type="ducks",
            reward=25,
            description="Collect 10 ducks",
            requirement_value="10",
        ),
        Achievement(
            name="Project Starter",
            slug="project-starter",
            type="project",
            reward=50,
            description="Create your first project",
            requirement_value="1",
        ),
    ]
    db.session.add_all(achievements)
    db.session.commit()
    return achievements


@pytest.fixture
def sample_multiple_achievements(init_db):
    achievements = [
        Achievement(
            id=1,
            name="Achievement One",
            slug="achievement-one",
            type="ducks",
            reward=10,
            description="First achievement",
            requirement_value="10",
        ),
        Achievement(
            id=2,
            name="Achievement Two",
            slug="achievement-two",
            type="chat",
            reward=20,
            description="Second achievement",
            requirement_value="5",
        ),
    ]
    for ach in achievements:
        db.session.add(ach)
    db.session.commit()
    return achievements


# ============================================================================
# NEW FIXTURES (REQUIRED FOR CHALLENGE TESTS)
# ============================================================================


@pytest.fixture
def sample_challenge_active(init_db):
    """Fixture to create an active challenge with known difficulty."""
    challenge = Challenge(
        name="Dungeons of Kithgard",
        slug="dungeons-of-kithgard",
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        is_active=True,
        course_id="intro-to-python",
    )
    db.session.add(challenge)
    db.session.commit()
    return challenge


@pytest.fixture
def sample_challenges_multi_domain(init_db):
    """Fixture to create active challenges across multiple domains."""
    c1 = Challenge(
        name="Dungeons of Kithgard",
        slug="dungeons-of-kithgard",
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        is_active=True,
        course_id="intro-to-python",
    )
    c2 = Challenge(
        name="Chapter 1: Sky Mountain",
        slug="chapter-1-sky-mountain",
        domain="ozaria.com",
        difficulty="hard",
        value=20,
        is_active=True,
        course_id="intro-to-coding",
    )
    db.session.add_all([c1, c2])
    db.session.commit()
    return [c1, c2]


@pytest.fixture
def mock_render_template(client):
    """
    Robust mock for render_template that captures message arguments.
    """

    def side_effect(template_name_or_list, **context):
        # 1. Check if 'message' was passed explicitly as a keyword argument
        if "message" in context:
            return context["message"]

        # 2. Check if it's inside a 'context' dict
        if "context" in context and isinstance(context["context"], dict):
            return context["context"].get("message", "Mocked Template Content")

        # 3. Fallback
        return "Mocked Template Content"

    with patch(
        "application.routes.challenge_routes.render_template", side_effect=side_effect
    ) as mock:
        yield mock
