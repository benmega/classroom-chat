import pytest

from application import create_app, ensure_default_configuration
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
    def _add_user(username, password_hash):
        user = User(username=username, password_hash=password_hash, ducks=0)
        db.session.add(user)
        db.session.commit()
        return user
    return _add_user
