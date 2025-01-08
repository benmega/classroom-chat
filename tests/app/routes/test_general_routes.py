import pytest
from flask import url_for
from flask import session
from application import create_app, db
from application.models import User


@pytest.fixture
def client():
    """Fixture to create a test client."""
    app = create_app()  # Use your app configuration here (e.g., TestingConfig)
    with app.test_client() as client:
        yield client


@pytest.fixture
def init_db(client):
    """Fixture to initialize the database."""
    db.create_all()  # Create all tables
    yield db
    db.session.remove()
    db.drop_all()  # Clean up after tests


@pytest.fixture
def sample_user(init_db):
    """Fixture to provide a sample user for testing."""
    user = User(username="testuser", password="hashedpassword")
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def sample_admin(init_db):
    """Fixture to provide an admin user for testing."""
    admin = User(username="admin", password="hashedpassword", is_admin=True)
    db.session.add(admin)
    db.session.commit()
    return admin


# Test the index route for logged-in users
def test_index_logged_in(client, sample_user):
    # Simulate login by setting the session manually
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    response = client.get(url_for('general_bp.index'))

    assert response.status_code == 200
    assert b"Welcome" in response.data  # Check for a welcome message or user-specific content


# Test the index route for not logged-in users
def test_index_not_logged_in(client):
    response = client.get(url_for('general_bp.index'))

    assert response.status_code == 302  # Should redirect to login
    assert response.location == url_for('user_bp.login', _external=True)  # Ensure redirection to login route
