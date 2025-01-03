import random
import string
import uuid

import pytest

from application import create_app, ensure_default_configuration
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.configuration import Configuration
from application.extensions import db
from application.models.user import User
from application.config import TestingConfig

# This fixture creates the app, initializes the database, and cleans up after tests.
@pytest.fixture(scope='session')
def test_app():
    app = create_app(TestingConfig)
    with app.app_context():
        db.create_all()  # Create all tables for tests
        ensure_default_configuration()  # Set up default configuration
    yield app
    with app.app_context():
        db.session.remove()
        db.drop_all()  # Clean up the test database

# This fixture allows you to use a test client in your tests.
@pytest.fixture(scope='function')
def test_client(test_app):
    return test_app.test_client()

# This fixture provides a function to add a sample user to the database for tests.
@pytest.fixture
def init_db(test_app):
    with test_app.app_context():
        db.session.begin()  # Start a transaction
        yield  # This allows the test to run within the transaction
        db.session.rollback()  # Rollback any changes after the test


@pytest.fixture
def add_sample_user(init_db):
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


def generate_random_slug(length=10):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


@pytest.fixture
def sample_challenge(init_db):
    # Check if a challenge with the same slug exists
    existing_challenge = Challenge.query.filter_by(slug="sample-challenge").first()

    if existing_challenge:
        # Generate a unique slug if "sample-challenge" exists
        slug = f"sample-challenge-{generate_random_slug()}"
    else:
        slug = "sample-challenge"

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
    from application.models.user import User
    user = User(username="testuser", password_hash="hashedpassword", ducks=0)
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def sample_challenge_log(init_db):
    """Fixture for adding a sample ChallengeLog entry with unique values."""
    # Generate unique identifiers to avoid uniqueness issues
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