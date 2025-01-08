import pytest
from flask import url_for
from application import create_app, db
from application.models.bounty import Bounty
from application.models.user import User


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
    """Fixture to add a sample user to the database."""
    user = User(username="testuser", password_hash="hashedpassword")
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def sample_bounty(init_db, sample_user):
    """Fixture to add a sample bounty to the database."""
    bounty = Bounty(
        user_id=sample_user.id,
        description="Test bug bounty",
        bounty="101010",  # Valid binary number
        expected_behavior="Bug should be fixed",
    )
    db.session.add(bounty)
    db.session.commit()
    return bounty


def test_submit_bug_bounty_get(client, sample_user):
    """Test GET request for the bug bounty submission page."""
    # Simulate logging in by adding the user to the session
    with client.session_transaction() as session:
        session['user'] = sample_user.id

    # Make the GET request
    response = client.get(url_for('bounty_bp.submit_bug_bounty'))
    assert response.status_code == 200
    assert b"Submit Bug Bounty" in response.data  # Check if the page loads correctly


def test_submit_bug_bounty_post_valid(client, sample_user):
    """Test POST request for submitting a valid bug bounty."""
    with client.session_transaction() as session:
        session['user'] = sample_user.id

    # Simulate submitting a valid bug bounty
    response = client.post(
        url_for('bounty_bp.submit_bug_bounty'),
        data={
            'description': 'Test bug bounty',
            'bounty': '101010',  # Valid binary
            'expected_behavior': 'Bug should be fixed'
        }
    )
    assert response.status_code == 302  # Redirect to another page after successful submission
    assert Bounty.query.count() == 1  # Ensure bounty is added to the database


def test_submit_bug_bounty_post_invalid_bounty(client, sample_user):
    """Test POST request for submitting a bug bounty with an invalid bounty."""
    with client.session_transaction() as session:
        session['user'] = sample_user.id

    # Simulate submitting an invalid bug bounty (non-binary value)
    response = client.post(
        url_for('bounty_bp.submit_bug_bounty'),
        data={
            'description': 'Test bug bounty',
            'bounty': 'invalid_bounty',  # Invalid bounty
            'expected_behavior': 'Bug should be fixed'
        }
    )
    assert response.status_code == 200  # Stay on the same page
    assert b"Bounty must be a binary number" in response.data  # Flash message should appear


def test_view_bounties(client, sample_user, sample_bounty):
    """Test viewing the bounties page."""
    with client.session_transaction() as session:
        session['user'] = sample_user.id

    # Make the GET request to view bounties
    response = client.get(url_for('bounty_bp.view_bounties'))
    assert response.status_code == 200
    assert b"Test bug bounty" in response.data  # Check if the bounty appears on the page


def test_update_bounty_status(client, sample_user, sample_bounty):
    """Test updating a bounty's status."""
    with client.session_transaction() as session:
        session['user'] = sample_user.id

    # Make the POST request to update the bounty status
    response = client.post(
        url_for('bounty_bp.update_bounty_status', bounty_id=sample_bounty.id),
        data={'status': 'In Progress'}
    )
    assert response.status_code == 302  # Redirect after successful update
    assert sample_bounty.status == 'In Progress'  # Ensure the bounty status is updated


def test_update_bounty_status_invalid_status(client, sample_user, sample_bounty):
    """Test updating the bounty status with an invalid status."""
    with client.session_transaction() as session:
        session['user'] = sample_user.id

    # Make the POST request to update the bounty status with an invalid status
    response = client.post(
        url_for('bounty_bp.update_bounty_status', bounty_id=sample_bounty.id),
        data={'status': 'Invalid Status'}
    )
    assert response.status_code == 302  # Redirect after invalid update attempt
    assert sample_bounty.status != 'Invalid Status'  # Status should not be updated


def test_update_bounty_status_not_own_bounty(client, sample_user, sample_bounty):
    """Test attempting to update a bounty status for a bounty that doesn't belong to the user."""
    # Create another user and assign a bounty to them
    other_user = User(username="otheruser", password_hash="hashedpassword")
    db.session.add(other_user)
    db.session.commit()

    # Simulate logging in as the first user
    with client.session_transaction() as session:
        session['user'] = sample_user.id

    # Try to update a bounty that belongs to another user
    response = client.post(
        url_for('bounty_bp.update_bounty_status', bounty_id=sample_bounty.id),
        data={'status': 'Resolved'}
    )
    assert response.status_code == 302  # Should redirect
    assert b"You can only update the status of your own bounties." in response.data  # Flash message

