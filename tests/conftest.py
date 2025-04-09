import base64
import os
import random
import string
import uuid
from io import BytesIO
from PIL import Image
import pytest

from application import create_app
from application.models.ai_settings import AISettings
from application.models.banned_words import BannedWords
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.configuration import Configuration
from application.extensions import db
from application.models.conversation import Conversation
from application.models.course import Course
from application.models.message import Message
from application.models.project import Project
from application.models.skill import Skill
from application.models.trade import Trade
from application.models.user import User
from application.config import TestingConfig
from sqlalchemy import inspect

@pytest.fixture(scope="module", autouse=True)
def setup_directories():
    os.makedirs('userData/image', exist_ok=True)
    os.makedirs('userData/pdfs', exist_ok=True)
    os.makedirs('userData/other', exist_ok=True)



@pytest.fixture(scope='session')
def test_app():
    app = create_app(TestingConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(test_app):
    return test_app.test_client()


@pytest.fixture
def init_db(test_app):
    """Provide a transactional database session for the test."""
    with test_app.app_context():
        db.create_all()  # Create tables in the test database
        yield db  # Yield the database instance to the test
        db.session.rollback()  # Rollback after the test
        db.drop_all()  # Clean up the database


def generate_random_slug(length=10):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


@pytest.fixture
def add_sample_user(init_db):
    """Adds a unique user to the database."""

    def _add_user(username, password, ducks=0, profile_picture='Default_pfp.jpg'):
        # Ensure the username does not exist in the database already
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            db.session.delete(existing_user)
            db.session.commit()

        # Add the new user with optional ducks and profile picture
        user = User(username=username, password_hash=password, ducks=ducks, profile_picture=profile_picture)
        db.session.add(user)
        db.session.commit()
        return user

    return _add_user


@pytest.fixture
def sample_challenge(init_db):
    """Fixture to add a sample challenge with a unique slug."""
    slug = f"sample-challenge-{generate_random_slug()}"
    challenge = Challenge(
        name=f"Sample Challenge-{generate_random_slug()}",
        slug=slug,
        domain="Test Domain",
        difficulty="medium",
        value=10,
        is_active=True
    )
    db.session.add(challenge)
    db.session.commit()
    return challenge


@pytest.fixture
def sample_user(init_db):
    """Fixture to create a sample user with dynamic data."""
    username = f"user_{uuid.uuid4().hex[:8]}"
    user = User(username=username, password_hash="hashedpassword", ducks=0)
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def sample_admin(init_db):
    """Fixture to create a sample admin user with dynamic data."""
    username = TestingConfig.ADMIN_USERNAME
    password = TestingConfig.ADMIN_PASSWORD
    admin_user = User(username=username, password_hash=password, ducks=0)
    db.session.add(admin_user)
    db.session.commit()
    return admin_user


@pytest.fixture
def sample_challenge_log(init_db):
    """Fixture for adding a sample ChallengeLog entry with unique values."""
    unique_username = f"user_{uuid.uuid4()}"
    unique_challenge_name = f"challenge_{uuid.uuid4()}"

    challenge_log = ChallengeLog(
        username=unique_username,
        domain="CodeCombat",
        challenge_name=unique_challenge_name,
        course_id="12345",
        course_instance="spring2025"
    )
    db.session.add(challenge_log)
    db.session.commit()
    return challenge_log


@pytest.fixture
def sample_ai_settings(test_app):
    # Ensure the database schema is created
    with test_app.app_context():
        # Create the tables (if they haven't been created yet)
        db.create_all()

        # Add sample data to the database
        settings = [
            AISettings(key='role', value='Custom AI role'),
            AISettings(key='username', value='AI Teacher'),
            AISettings(key='chat_bot_enabled', value='True')
        ]
        db.session.add_all(settings)
        db.session.commit()

        yield settings  # This will be available in the test function

        # Cleanup after the test
        db.session.remove()
        db.drop_all()  # Drop all tables after the test


@pytest.fixture
def sample_banned_words(init_db):
    """Fixture to populate the database with sample BannedWords."""
    words = [
        BannedWords(word='forbidden', reason='Inappropriate language', active=True),
        BannedWords(word='bannedword', reason='General ban', active=False),
    ]
    db.session.add_all(words)
    db.session.commit()
    return words

@pytest.fixture
def sample_configuration(init_db):
    """Fixture to create a sample Configuration entry."""
    config = Configuration(
        ai_teacher_enabled=True,
        message_sending_enabled=True
    )
    db.session.add(config)
    db.session.commit()
    return config


@pytest.fixture
def sample_users(init_db):
    """Fixture to create sample users."""
    user1 = User(username=f"User_{uuid.uuid4().hex[:8]}", password_hash="test")
    user2 = User(username=f"User_{uuid.uuid4().hex[:8]}", password_hash="test")
    db.session.add_all([user1, user2])
    db.session.commit()
    return [user1, user2]


@pytest.fixture
def sample_conversation(init_db, sample_users):
    """Fixture to create a sample Conversation with users."""
    conversation = Conversation(title=f"Sample Conversation {uuid.uuid4().hex[:8]}")
    conversation.users.extend(sample_users)
    db.session.add(conversation)
    db.session.commit()
    return conversation


@pytest.fixture
def sample_course(init_db):
    """Fixture to create a sample Course."""
    course = Course(
        id=f"course_{uuid.uuid4().hex[:8]}",
        name="Intro to Programming",
        domain="CodeCombat",
        description="Learn the basics of programming.",
        is_active=True
    )
    db.session.add(course)
    db.session.commit()
    return course


@pytest.fixture
def sample_message(init_db, sample_user, sample_conversation):
    """Fixture to create a sample message."""
    message = Message(
        conversation_id=sample_conversation.id,
        user_id=sample_user.id,
        content="This is a test message.",
        message_type="text"
    )
    db.session.add(message)
    db.session.commit()
    return message


@pytest.fixture
def sample_project(init_db, sample_user):
    """Fixture to create a sample project."""
    project = Project(
        name=f"Project_{uuid.uuid4().hex[:8]}",
        description="This is a sample project description.",
        link="http://example.com",
        user_id=sample_user.id
    )
    db.session.add(project)
    db.session.commit()
    return project


@pytest.fixture
def sample_skill(init_db, sample_user):
    """Fixture to create a sample skill."""
    skill = Skill(
        name="Python",
        user_id=sample_user.id
    )
    db.session.add(skill)
    db.session.commit()
    return skill

@pytest.fixture
def sample_image_data():
    """Fixture to provide a sample image data URL."""
    image = Image.new('RGB', (100, 100), color=(73, 109, 137))
    img_io = BytesIO()
    image.save(img_io, 'PNG')
    img_io.seek(0)
    image_data = base64.b64encode(img_io.read()).decode('utf-8')
    return f"data:image/png;base64,{image_data}"


@pytest.fixture
def sample_user_with_ducks(test_app):
    """Fixture that creates a user with ducks and cleans up afterward."""
    with test_app.app_context():
        try:
            user = User(username='user_with_ducks', password_hash='test_password', ducks=50)
            db.session.add(user)
            db.session.commit()
            yield user
        except Exception as e:
            db.session.rollback()  # Rollback if there's any error
            raise e  # Reraise the exception to fail the test
        finally:
            # Cleanup: Delete user and commit changes
            try:
                db.session.delete(user)
                db.session.commit()
            except Exception as cleanup_error:
                db.session.rollback()  # In case of an error during cleanup
                raise cleanup_error

# @pytest.fixture
# def sample_user_with_few_ducks(test_app):
#     with test_app.app_context():
#         user = User(username='user_with_few_ducks', ducks=5)
#         db.session.add(user)
#         db.session.commit()
#         yield user
#         db.session.delete(user)
#         db.session.commit()

@pytest.fixture
def sample_trade(test_app, sample_user_with_ducks):
    with test_app.app_context():
        trade = Trade(
            user_id=sample_user_with_ducks.id,
            digital_ducks=10,
            duck_type='bit',
            status='pending'
        )
        db.session.add(trade)
        db.session.commit()
        yield trade
        db.session.delete(trade)
        db.session.commit()

@pytest.fixture
def auth_headers(sample_admin):
    """Create basic auth headers for admin authentication."""
    import base64
    from application.config import TestingConfig

    credentials = f"{TestingConfig.ADMIN_USERNAME}:{TestingConfig.ADMIN_PASSWORD}"
    encoded = base64.b64encode(credentials.encode()).decode('utf-8')
    return {'Authorization': f'Basic {encoded}'}


@pytest.fixture
def sample_duck_trade(test_app, sample_user):
    """Create a sample duck trade for testing."""
    with test_app.app_context():
        from application.models.duck_trade import DuckTradeLog

        trade = DuckTradeLog(
            username=sample_user.username,
            digital_ducks=1,
            bit_ducks=[1,0,0,0,0,0,0],      # ← satisfy NOT NULL
            byte_ducks=[0,0,0,0,0,0,0],     # ← satisfy NOT NULL
            status='pending'
        )
        db.session.add(trade)
        db.session.commit()
        return trade
