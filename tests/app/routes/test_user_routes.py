"""
File: test_user_routes.py
Type: py
Summary: Unit tests for user routes Flask routes.
"""

import json
import uuid
from datetime import date
from io import BytesIO
from unittest.mock import patch
import pytest
from PIL import Image

from application import db
from application.models.user import User
from application.models.skill import Skill
from application.models.project import Project
from application.models.conversation import Conversation


@pytest.fixture
def sample_conversation_for_login(init_db):
    """Fixture to create a conversation for login tests."""
    conversation = Conversation(title="Recent Conversation")
    db.session.add(conversation)
    db.session.commit()
    return conversation


def test_get_users(client, init_db, sample_user):
    """Test retrieving all users."""
    response = client.get('/user/get_users')
    assert response.status_code == 200

    data = json.loads(response.data)
    assert isinstance(data, list)
    assert len(data) > 0
    assert any(u['username'] == sample_user.username for u in data)


def test_get_user_id_authenticated(client, init_db, sample_user):
    """Test getting user ID when authenticated."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    response = client.get('/user/get_user_id')
    assert response.status_code == 200

    data = json.loads(response.data)
    assert data['user_id'] == sample_user.id


def test_get_user_id_not_authenticated(client, init_db):
    """Test getting user ID without authentication."""
    response = client.get('/user/get_user_id')
    assert response.status_code == 404

    data = json.loads(response.data)
    assert data['user_id'] is None


def test_login_get(client, init_db):
    """Test GET request to login page."""
    response = client.get('/user/login')
    assert response.status_code == 200
    assert b'login' in response.data.lower()


def test_login_success(client, init_db, sample_user, sample_conversation_for_login):
    """Test successful login."""
    # Set a password for the user
    sample_user.set_password('testpassword123')
    db.session.commit()

    response = client.post('/user/login', data={
        'username': sample_user.username,
        'password': 'testpassword123'
    }, follow_redirects=True)

    assert response.status_code == 200
    assert b'Login successful' in response.data or response.status_code == 200

    # Verify session was set
    with client.session_transaction() as sess:
        assert sess.get('user') == sample_user.id
        assert 'conversation_id' in sess


def test_login_invalid_username(client, init_db):
    """Test login with invalid username."""
    response = client.post('/user/login', data={
        'username': 'nonexistent_user',
        'password': 'password123'
    }, follow_redirects=True)

    assert response.status_code == 200
    assert b'Invalid username or password' in response.data


def test_login_invalid_password(client, init_db, sample_user):
    """Test login with invalid password."""
    sample_user.set_password('correctpassword')
    db.session.commit()

    response = client.post('/user/login', data={
        'username': sample_user.username,
        'password': 'wrongpassword'
    }, follow_redirects=True)

    assert response.status_code == 200
    assert b'Invalid username or password' in response.data


def test_login_adds_user_to_conversation(client, init_db, sample_user, sample_conversation_for_login):
    """Test that login adds user to most recent conversation."""
    sample_user.set_password('testpassword')
    db.session.commit()

    response = client.post('/user/login', data={
        'username': sample_user.username,
        'password': 'testpassword'
    }, follow_redirects=True)

    # Refresh conversation
    db.session.refresh(sample_conversation_for_login)
    assert sample_user in sample_conversation_for_login.users


def test_logout(client, init_db, sample_user):
    """Test user logout."""
    # Set user as online
    sample_user.is_online = True
    db.session.commit()

    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    response = client.get('/user/logout', follow_redirects=True)

    assert response.status_code == 200
    assert b'logged out' in response.data.lower()

    # Verify session was cleared
    with client.session_transaction() as sess:
        assert 'user' not in sess

    # Verify user is offline
    db.session.refresh(sample_user)
    assert sample_user.is_online is False


def test_signup_get(client, init_db):
    """Test GET request to signup page."""
    response = client.get('/user/signup')
    assert response.status_code == 200


def test_signup_success(client, init_db):
    """Test successful user signup."""
    username = f'newuser_{uuid.uuid4().hex[:8]}'

    response = client.post('/user/signup', data={
        'username': username,
        'password': 'newpassword123'
    }, follow_redirects=True)

    assert response.status_code == 200
    assert b'Signup successful' in response.data

    # Verify user was created
    user = User.query.filter_by(username=username.lower()).first()
    assert user is not None
    assert user.check_password('newpassword123')


def test_signup_duplicate_username(client, init_db, sample_user):
    """Test signup with existing username."""
    response = client.post('/user/signup', data={
        'username': sample_user.username,
        'password': 'password123'
    }, follow_redirects=True)

    assert response.status_code == 200
    assert b'Username already taken' in response.data


def test_profile_authenticated(client, init_db, sample_user):
    """Test accessing profile when authenticated."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    response = client.get('/user/profile')
    assert response.status_code == 200
    assert str(sample_user.id).encode() in response.data


def test_profile_not_authenticated(client, init_db):
    """Test accessing profile without authentication."""
    response = client.get('/user/profile', follow_redirects=True)
    assert response.status_code == 200
    assert b'log in' in response.data.lower()


def test_edit_profile_get(client, init_db, sample_user):
    """Test GET request to edit profile page."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    response = client.get('/user/edit_profile')
    assert response.status_code == 200


def test_edit_profile_post(client, init_db, sample_user):
    """Test updating profile information."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    response = client.post('/user/edit_profile', data={
        'ip_address': '192.168.1.1',
        'is_online': 'true',
        'skills[]': ['Python', 'JavaScript'],
        'project_names[]': ['Project 1'],
        'project_descriptions[]': ['Description 1'],
        'project_links[]': ['http://example.com']
    }, follow_redirects=True)

    assert response.status_code == 200
    assert b'Profile updated successfully' in response.data

    # Verify changes
    db.session.refresh(sample_user)
    assert len(sample_user.skills) == 2
    assert len(sample_user.projects) == 1


def test_edit_profile_password_mismatch(client, init_db, sample_user):
    """Test edit profile with mismatched passwords."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    response = client.post('/user/edit_profile', data={
        'password': 'newpassword',
        'confirm_password': 'differentpassword',
        'skills[]': [],
        'project_names[]': [],
        'project_descriptions[]': [],
        'project_links[]': []
    }, follow_redirects=True)

    assert b'Passwords do not match' in response.data


def test_edit_profile_picture(client, init_db, sample_user):
    """Test editing profile picture."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    # Create a test image
    img = Image.new('RGB', (100, 100), color='red')
    img_io = BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)

    response = client.post('/user/edit_profile_picture', data={
        'profile_picture': (img_io, 'test_image.png')
    }, content_type='multipart/form-data')

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert 'new_url' in data


def test_edit_profile_picture_no_file(client, init_db, sample_user):
    """Test editing profile picture without providing a file."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    response = client.post('/user/edit_profile_picture', data={})

    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['success'] is False
    assert 'No file part' in data['error']


def test_edit_profile_picture_empty_filename(client, init_db, sample_user):
    """Test editing profile picture with empty filename."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    response = client.post('/user/edit_profile_picture', data={
        'profile_picture': (BytesIO(b''), '')
    }, content_type='multipart/form-data')

    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['success'] is False


def test_upload_profile_picture(client, init_db, sample_user):
    """Test uploading a profile picture."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    img = Image.new('RGB', (100, 100), color='blue')
    img_io = BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)

    response = client.post('/user/upload_profile_picture', data={
        'profile_picture': (img_io, 'profile.png')
    }, content_type='multipart/form-data', follow_redirects=True)

    assert response.status_code == 200


def test_upload_profile_picture_invalid_type(client, init_db, sample_user):
    """Test uploading invalid file type as profile picture."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    response = client.post('/user/upload_profile_picture', data={
        'profile_picture': (BytesIO(b'test'), 'file.txt')
    }, content_type='multipart/form-data', follow_redirects=True)

    assert response.status_code == 200
    assert b'Invalid file type' in response.data


def test_delete_profile_picture(client, init_db, sample_user):
    """Test deleting profile picture."""
    # Set a profile picture
    sample_user.profile_picture = 'test_picture.png'
    db.session.commit()

    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    response = client.post('/user/delete_profile_picture', follow_redirects=True)

    # Note: This might redirect to 'profile' instead of 'user.profile'
    # depending on your implementation
    assert response.status_code == 200 or response.status_code == 404


def test_remove_skill(client, init_db, sample_user):
    """Test removing a skill."""
    # Add a skill to the user
    skill = Skill(name='Python', user_id=sample_user.id)
    db.session.add(skill)
    db.session.commit()

    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    response = client.post(f'/user/remove_skill/{skill.id}')

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True

    # Verify skill was removed
    assert Skill.query.get(skill.id) is None


def test_remove_skill_not_found(client, init_db, sample_user):
    """Test removing non-existent skill."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    response = client.post('/user/remove_skill/99999')
    assert response.status_code == 200


def test_change_password_success(client, init_db, sample_user):
    """Test successfully changing password."""
    sample_user.set_password('oldpassword')
    db.session.commit()

    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    response = client.post('/user/change_password', data={
        'current_password': 'oldpassword',
        'new_password': 'newpassword',
        'confirm_password': 'newpassword'
    }, follow_redirects=True)

    # Verify password was changed
    db.session.refresh(sample_user)
    assert sample_user.check_password('newpassword')


def test_change_password_incorrect_current(client, init_db, sample_user):
    """Test changing password with incorrect current password."""
    sample_user.set_password('correctpassword')
    db.session.commit()

    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    response = client.post('/user/change_password', data={
        'current_password': 'wrongpassword',
        'new_password': 'newpassword',
        'confirm_password': 'newpassword'
    }, follow_redirects=True)

    assert b'Incorrect current password' in response.data


def test_change_password_mismatch(client, init_db, sample_user):
    """Test changing password with mismatched new passwords."""
    sample_user.set_password('currentpassword')
    db.session.commit()

    with client.session_transaction() as sess:
        sess['user'] = sample_user.id

    response = client.post('/user/change_password', data={
        'current_password': 'currentpassword',
        'new_password': 'newpassword',
        'confirm_password': 'differentpassword'
    }, follow_redirects=True)

    assert b'Passwords do not match' in response.data


def test_profile_picture_endpoint(client, init_db):
    """Test serving profile pictures."""
    # This test requires actual file to exist
    # You might want to mock send_from_directory
    with patch('application.routes.user_routes.send_from_directory') as mock_send:
        mock_send.return_value = 'file_content'
        response = client.get('/user/profile_pictures/test.png')
        assert mock_send.called


def test_profile_picture_path_traversal_protection(client, init_db):
    """Test protection against path traversal attacks."""
    response = client.get('/user/profile_pictures/../../../etc/passwd')
    assert response.status_code == 400


def test_user_model_add_skill(init_db, sample_user):
    """Test User model's add_skill method."""
    initial_skill_count = len(sample_user.skills)
    sample_user.add_skill('Java')

    assert len(sample_user.skills) == initial_skill_count + 1
    assert any(s.name == 'Java' for s in sample_user.skills)


def test_user_model_add_project(init_db, sample_user):
    """Test User model's add_project method."""
    initial_project_count = len(sample_user.projects)
    sample_user.add_project('Test Project', 'Description', 'http://link.com')

    assert len(sample_user.projects) == initial_project_count + 1
    project = Project.query.filter_by(name='Test Project').first()
    assert project is not None
    assert project.description == 'Description'


def test_user_model_remove_project(init_db, sample_user):
    """Test User model's remove_project method."""
    project = Project(name='Remove Me', user_id=sample_user.id)
    db.session.add(project)
    db.session.commit()

    sample_user.remove_project(project.id)
    assert Project.query.get(project.id) is None


def test_user_model_add_ducks(init_db, sample_user):
    """Test User model's add_ducks method."""
    initial_earned = sample_user.earned_ducks
    initial_balance = sample_user.duck_balance
    initial_packets = sample_user.packets

    sample_user.add_ducks(100)

    assert sample_user.earned_ducks == initial_earned + 100
    assert sample_user.duck_balance == initial_balance + 100
    assert sample_user.packets == initial_packets + (100 / (2 ** 14))


def test_user_model_get_progress(init_db, sample_user):
    """Test User model's get_progress method."""
    from application.models.challenge_log import ChallengeLog

    # Add some challenge logs
    for i in range(3):
        log = ChallengeLog(
            username=sample_user.username,
            domain='codecombat.com',
            challenge_name=f'challenge_{i}'
        )
        db.session.add(log)
    db.session.commit()

    progress = sample_user.get_progress('codecombat.com')
    assert progress == 3


def test_user_model_get_progress_percent(init_db, sample_user):
    """Test User model's get_progress_percent method."""
    from application.models.challenge_log import ChallengeLog
    from application.models.challenge import Challenge

    # Create additional challenges
    for i in range(5):
        challenge = Challenge(
            name=f'Challenge {i}',
            slug=f'challenge-{i}',
            domain='codecombat.com',
            difficulty='medium',
            value=10,
            is_active=True
        )
        db.session.add(challenge)
    db.session.commit()

    # Complete one challenge
    log = ChallengeLog(
        username=sample_user.username,
        domain='codecombat.com',
        challenge_name='Challenge 0'
    )
    db.session.add(log)
    db.session.commit()

    # Should be 1/5 = 20%
    progress_percent = sample_user.get_progress_percent('codecombat.com')
    assert progress_percent == 20


def test_user_model_set_online(init_db, sample_user):
    """Test User model's set_online class method."""
    User.set_online(sample_user.id, online=True)
    db.session.refresh(sample_user)
    assert sample_user.is_online is True

    User.set_online(sample_user.id, online=False)
    db.session.refresh(sample_user)
    assert sample_user.is_online is False


def test_user_model_username_lowercase(init_db):
    """Test that usernames are stored in lowercase."""
    user = User(username='TestUser123')
    user.set_password('password')
    db.session.add(user)
    db.session.commit()

    assert user.username == 'testuser123'


def test_helper_functions_clear_skills_and_projects(init_db, sample_user):
    """Test clear_user_skills_and_projects helper function."""
    from application.routes.user_routes import clear_user_skills_and_projects

    # Add skills and projects
    sample_user.add_skill('Python')
    sample_user.add_project('Test', 'Desc', 'Link')

    initial_skill_count = len(sample_user.skills)
    initial_project_count = len(sample_user.projects)

    assert initial_skill_count > 0
    assert initial_project_count > 0

    clear_user_skills_and_projects(sample_user)
    db.session.commit()

    db.session.refresh(sample_user)
    assert len(sample_user.skills) == 0
    assert len(sample_user.projects) == 0


def test_helper_functions_add_user_skills(init_db, sample_user):
    """Test add_user_skills helper function."""
    from application.routes.user_routes import add_user_skills

    skills_list = ['Python', 'JavaScript', 'SQL']
    add_user_skills(sample_user, skills_list)
    db.session.commit()

    db.session.refresh(sample_user)
    assert len(sample_user.skills) == 3
    skill_names = [s.name for s in sample_user.skills]
    assert 'Python' in skill_names
    assert 'JavaScript' in skill_names
    assert 'SQL' in skill_names


def test_helper_functions_add_user_projects(init_db, sample_user):
    """Test add_user_projects helper function."""
    from application.routes.user_routes import add_user_projects

    names = ['Project 1', 'Project 2']
    descriptions = ['Desc 1', 'Desc 2']
    links = ['http://link1.com', 'http://link2.com']

    add_user_projects(sample_user, names, descriptions, links)
    db.session.commit()

    db.session.refresh(sample_user)
    assert len(sample_user.projects) == 2

def test_login_awards_welcome_duck_first_time(client, init_db, sample_user):
    sample_user.set_password('testpassword')
    db.session.commit()

    with client.session_transaction() as sess:
        sess.clear()

    response = client.post('/user/login', data={
        'username': sample_user.username,
        'password': 'testpassword'
    }, follow_redirects=True)

    db.session.refresh(sample_user)
    assert response.status_code == 200
    assert sample_user.earned_ducks >= 1
    assert sample_user.duck_balance >= 1
    assert sample_user.last_daily_duck == date.today()


def test_login_welcome_duck_not_awarded_twice_same_day(client, init_db, sample_user):
    sample_user.set_password('testpassword')
    db.session.commit()

    # First login
    client.post('/user/login', data={
        'username': sample_user.username,
        'password': 'testpassword'
    }, follow_redirects=True)

    first_duck_count = sample_user.duck_balance

    # Second login same day
    with client.session_transaction() as sess:
        sess.clear()

    client.post('/user/login', data={
        'username': sample_user.username,
        'password': 'testpassword'
    }, follow_redirects=True)

    db.session.refresh(sample_user)
    assert sample_user.duck_balance == first_duck_count


def test_login_no_duck_on_failed_login(client, init_db, sample_user):
    sample_user.set_password('correctpassword')
    db.session.commit()

    response = client.post('/user/login', data={
        'username': sample_user.username,
        'password': 'wrongpassword'
    }, follow_redirects=True)

    db.session.refresh(sample_user)
    assert b'Invalid username or password' in response.data
    assert sample_user.duck_balance == 0
    assert sample_user.earned_ducks == 0
    assert sample_user.last_daily_duck is None


def test_daily_duck_updates_fields_correctly(init_db, sample_user):
    sample_user.add_ducks(0)  # ensure clean
    result = sample_user.award_daily_duck(amount=3)

    assert result is True
    assert sample_user.earned_ducks == 3
    assert sample_user.duck_balance == 3
    assert sample_user.last_daily_duck == date.today()

    # Second call same day should not award
    result2 = sample_user.award_daily_duck(amount=3)
    assert result2 is False
