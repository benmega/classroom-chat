import base64
import os
import random
import string
import uuid
from io import BytesIO
from PIL import Image
import pytest

from application import create_app
from application.models.achievements import UserAchievement, Achievement
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
# from application.models.trade import Trade
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
    app.config.update({
        "TESTING": True,
        "WTF_CSRF_ENABLED": False
    })
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(test_app):
    return test_app.test_client()

@pytest.fixture
def logged_in_client(client, sample_user):
    """A Flask test client that is logged in as sample_user."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.id
    return client





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

    def _add_user(username, password, earned_ducks=0, profile_picture='Default_pfp.jpg'):
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            db.session.delete(existing_user)
            db.session.commit()

        user = User(
            username=username,
            password_hash=password,
            earned_ducks=earned_ducks,
            duck_balance=earned_ducks,  # keep balance in sync at creation
            profile_picture=profile_picture
        )
        db.session.add(user)
        db.session.commit()
        return user

    return _add_user


@pytest.fixture
def sample_user_with_ducks(test_app):
    """Fixture that creates a user with ducks and cleans up afterward."""
    with test_app.app_context():
        # Create tables if they don't exist
        db.create_all()

        try:
            user = User(
                username='user_with_ducks',
                password_hash='test_password',
                earned_ducks=50,
                duck_balance=50
            )
            db.session.add(user)
            db.session.commit()
            yield user
        except Exception as e:
            db.session.rollback()  # Rollback if there's any error
            raise e  # Reraise the exception to fail the test
        finally:
            # Cleanup: Delete user and commit changes
            try:
                user_to_delete = db.session.query(User).filter_by(username='user_with_ducks').first()
                if user_to_delete:
                    db.session.delete(user_to_delete)
                    db.session.commit()
            except Exception:
                db.session.rollback()  # In case of an error during cleanup
                # Don't raise the cleanup error, as it might mask the actual test error


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
    user = User(username=username, password_hash="hashedpassword")
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def sample_admin(init_db):
    """Fixture to create a sample admin user with dynamic data."""
    username = TestingConfig.ADMIN_USERNAME
    password = TestingConfig.ADMIN_PASSWORD
    admin_user = User(
        username=username,
        password_hash=password,
        earned_ducks=0,
        duck_balance=0
    )

    db.session.add(admin_user)
    db.session.commit()
    return admin_user

@pytest.fixture
def logged_in_admin(client, sample_user):
    """A Flask test client that is logged in as sample_user."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.id  # Use ID for correctness
    return client

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
def auth_headers(sample_admin):
    """Create basic auth headers for admin authentication."""
    import base64
    from application.config import TestingConfig

    credentials = f"{TestingConfig.ADMIN_USERNAME}:{TestingConfig.ADMIN_PASSWORD}"
    encoded = base64.b64encode(credentials.encode()).decode('utf-8')
    return {'Authorization': f'Basic {encoded}'}


@pytest.fixture
def sample_duck_trade(init_db, sample_user):
    """Create a sample duck trade for testing (bound to correct session)."""
    from application.models.duck_trade import DuckTradeLog
    sample_user.duck_balance = 100
    trade = DuckTradeLog(
        username=sample_user.username,
        digital_ducks=1,
        bit_ducks=[1, 0, 0, 0, 0, 0, 0],
        byte_ducks=[0, 0, 0, 0, 0, 0, 0],
        status='pending'
    )
    db.session.add(trade)
    db.session.commit()

    # Optional: re-fetch from session to ensure it's not detached
    trade = DuckTradeLog.query.get(trade.id)
    return trade


@pytest.fixture
def sample_achievement(init_db):
    """Fixture to create a sample achievement."""
    achievement = Achievement(
        name="Python Master",
        slug="python-basics",
        type="certificate",
        reward=100,
        description="Complete the Python basics course",
        requirement_value="100",
        source="CodeCombat"
    )
    db.session.add(achievement)
    db.session.commit()
    return achievement


@pytest.fixture
def sample_user_achievement(init_db, sample_user, sample_achievement):
    """Fixture to create a user achievement."""
    user_achievement = UserAchievement(
        user_id=sample_user.id,
        achievement_id=sample_achievement.id
    )
    db.session.add(user_achievement)
    db.session.commit()
    return user_achievement


@pytest.fixture
def sample_ducks_achievement(init_db):
    """Fixture to create a ducks-based achievement."""
    achievement = Achievement(
        name="Duck Collector",
        slug="duck-collector-50",
        type="ducks",
        reward=10,
        description="Collect 50 ducks",
        requirement_value="50"
    )
    db.session.add(achievement)
    db.session.commit()
    return achievement


@pytest.fixture
def sample_chat_achievement(init_db):
    """Fixture to create a chat-based achievement."""
    achievement = Achievement(
        name="First Message",
        slug="first-message",
        type="chat",
        reward=10,
        description="Send your first message",
        requirement_value="1"
    )
    db.session.add(achievement)
    db.session.commit()
    return achievement


@pytest.fixture
def sample_new_achievements(init_db):
    """Fixture to create sample achievements that would be newly awarded."""
    achievements = [
        Achievement(
            name="First Message",
            slug="first-message",
            type="chat",
            reward=10,
            description="Send your first message",
            requirement_value="1"
        ),
        Achievement(
            name="Duck Collector",
            slug="duck-collector-10",
            type="ducks",
            reward=25,
            description="Collect 10 ducks",
            requirement_value="10"
        ),
        Achievement(
            name="Project Starter",
            slug="project-starter",
            type="project",
            reward=50,
            description="Create your first project",
            requirement_value="1"
        )
    ]
    db.session.add_all(achievements)
    db.session.commit()
    return achievements


@pytest.fixture
def sample_multiple_achievements(init_db):
    """Fixture to create multiple varied achievements for testing."""
    achievements = [
        Achievement(
            id=1,
            name="Achievement One",
            slug="achievement-one",
            type="ducks",
            reward=10,
            description="First achievement",
            requirement_value="10"
        ),
        Achievement(
            id=2,
            name="Achievement Two",
            slug="achievement-two",
            type="chat",
            reward=20,
            description="Second achievement",
            requirement_value="5"
        )
    ]
    for ach in achievements:
        db.session.add(ach)
    db.session.commit()
    return achievements