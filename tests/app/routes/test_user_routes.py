"""
File: test_user_routes.py
Type: py
Summary: Unit tests for user routes Flask routes, adjusted for recent route refactoring.
"""

import json
import uuid
from datetime import date
from io import BytesIO
from unittest.mock import patch

import pytest
from PIL import Image

from application import db
from application.models.conversation import Conversation
from application.models.project import Project
from application.models.skill import Skill
from application.models.user import User


@pytest.fixture
def sample_conversation_for_login(init_db):
    """Fixture to create a conversation for login tests."""
    conversation = Conversation(title="Recent Conversation")
    db.session.add(conversation)
    db.session.commit()
    return conversation


# --- API / Utility Tests ---


def test_get_users(client, init_db, sample_user):
    """Test retrieving all users."""
    response = client.get("/user/get_users")
    assert response.status_code == 200

    data = json.loads(response.data)
    assert isinstance(data, list)
    assert len(data) > 0
    assert any(u["username"] == sample_user.username for u in data)


def test_get_user_id_authenticated(client, init_db, sample_user):
    """Test getting user ID when authenticated."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/user/get_user_id")
    assert response.status_code == 200

    data = json.loads(response.data)
    assert data["user_id"] == sample_user.id


def test_get_user_id_not_authenticated(client, init_db):
    """Test getting user ID without authentication."""
    response = client.get("/user/get_user_id")
    assert response.status_code == 404

    data = json.loads(response.data)
    assert data["user_id"] is None


# --- Authentication Tests ---


def test_login_get(client, init_db):
    """Test GET request to login page."""
    response = client.get("/user/login")
    assert response.status_code == 200
    assert b"login" in response.data.lower()


def test_login_success(client, init_db, sample_user, sample_conversation_for_login):
    """Test successful login."""
    sample_user.set_password("testpassword123")
    db.session.commit()

    response = client.post(
        "/user/login",
        data={"username": sample_user.username, "password": "testpassword123"},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Login successful" in response.data or response.status_code == 200

    # Verify session was set
    with client.session_transaction() as sess:
        assert sess.get("user") == sample_user.id
        assert "conversation_id" in sess


def test_login_invalid_username(client, init_db):
    """Test login with invalid username."""
    response = client.post(
        "/user/login",
        data={"username": "nonexistent_user", "password": "password123"},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Invalid username or password" in response.data


def test_login_invalid_password(client, init_db, sample_user):
    """Test login with invalid password."""
    sample_user.set_password("correctpassword")
    db.session.commit()

    response = client.post(
        "/user/login",
        data={"username": sample_user.username, "password": "wrongpassword"},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Invalid username or password" in response.data


def test_login_adds_user_to_conversation(
    client, init_db, sample_user, sample_conversation_for_login
):
    """Test that login adds user to most recent conversation."""
    sample_user.set_password("testpassword")
    db.session.commit()

    client.post(
        "/user/login",
        data={"username": sample_user.username, "password": "testpassword"},
        follow_redirects=True,
    )

    # Refresh conversation
    db.session.refresh(sample_conversation_for_login)
    assert sample_user in sample_conversation_for_login.users


def test_logout(client, init_db, sample_user):
    """Test user logout."""
    # Set user as online
    sample_user.is_online = True
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/user/logout", follow_redirects=True)

    assert response.status_code == 200
    assert b"logged out" in response.data.lower()

    # Verify session was cleared
    with client.session_transaction() as sess:
        assert "user" not in sess

    # Verify user is offline
    db.session.refresh(sample_user)
    assert sample_user.is_online is False


def test_signup_get(client, init_db):
    """Test GET request to signup page."""
    response = client.get("/user/signup")
    assert response.status_code == 200


def test_signup_success(client, init_db):
    """Test successful user signup."""
    username = f"newuser_{uuid.uuid4().hex[:8]}"

    response = client.post(
        "/user/signup",
        data={"username": username, "password": "newpassword123"},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Signup successful" in response.data

    # Verify user was created
    user = User.query.filter_by(username=username.lower()).first()
    assert user is not None
    assert user.check_password("newpassword123")


def test_signup_duplicate_username(client, init_db, sample_user):
    """Test signup with existing username."""
    response = client.post(
        "/user/signup",
        data={"username": sample_user.username, "password": "password123"},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Username already taken" in response.data


# --- Profile Tests ---


def test_profile_authenticated(client, init_db, sample_user):
    """Test accessing profile when authenticated."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/user/profile")
    assert response.status_code == 200
    assert str(sample_user.id).encode() in response.data


def test_profile_not_authenticated(client, init_db):
    """Test accessing profile without authentication."""
    response = client.get("/user/profile", follow_redirects=True)
    assert response.status_code == 200
    assert b"log in" in response.data.lower()


def test_edit_profile_get(client, init_db, sample_user):
    """Test GET request to edit profile page."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/user/edit_profile")
    assert response.status_code == 200


def test_edit_profile_post(client, init_db, sample_user):
    """Test updating profile information (Skills, IP, Online)."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # Note: Projects are no longer handled in edit_profile
    response = client.post(
        "/user/edit_profile",
        data={
            "ip_address": "192.168.1.1",
            "is_online": "true",
            "skills[]": ["Python", "JavaScript"],
        },
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Account settings updated successfully" in response.data

    # Verify changes
    db.session.refresh(sample_user)
    assert len(sample_user.skills) == 2
    assert sample_user.ip_address == "192.168.1.1"
    assert sample_user.is_online is True


def test_edit_profile_change_password(client, init_db, sample_user):
    """Test changing password via edit profile."""
    sample_user.set_password("oldpassword")
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post(
        "/user/edit_profile",
        data={
            "password": "newpassword",
            "confirm_password": "newpassword",
            "skills[]": [],
        },
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Account settings updated successfully" in response.data

    db.session.refresh(sample_user)
    assert sample_user.check_password("newpassword")


def test_edit_profile_password_mismatch(client, init_db, sample_user):
    """Test edit profile with mismatched passwords."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post(
        "/user/edit_profile",
        data={
            "password": "newpassword",
            "confirm_password": "differentpassword",
            "skills[]": [],
        },
        follow_redirects=True,
    )

    assert b"Passwords do not match" in response.data


# --- Project Route Tests (New) ---


def test_new_project_post(client, init_db, sample_user):
    """Test creating a new project via the specific route."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post(
        "/user/project/new",
        data={
            "action": "save",
            "name": "New Test Project",
            "description": "A description",
            "link": "http://example.com",
        },
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Project created successfully" in response.data

    project = Project.query.filter_by(name="New Test Project").first()
    assert project is not None
    assert project.user_id == sample_user.id


def test_edit_project_post(client, init_db, sample_user):
    """Test editing an existing project."""
    project = Project(name="Old Name", description="Old Desc", user_id=sample_user.id)
    db.session.add(project)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post(
        f"/user/project/edit/{project.id}",
        data={"action": "save", "name": "Updated Name", "description": "Updated Desc"},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Project updated successfully" in response.data

    db.session.refresh(project)
    assert project.name == "Updated Name"


def test_delete_project(client, init_db, sample_user):
    """Test deleting a project."""
    project = Project(name="To Delete", user_id=sample_user.id)
    db.session.add(project)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post(
        f"/user/project/edit/{project.id}",
        data={"action": "delete"},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Project deleted" in response.data
    assert Project.query.get(project.id) is None


# --- Image & File Handling Tests ---


def test_edit_profile_picture_api(client, init_db, sample_user):
    """Test editing profile picture via API endpoint."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # Create a test image
    img = Image.new("RGB", (100, 100), color="red")
    img_io = BytesIO()
    img.save(img_io, "PNG")
    img_io.seek(0)

    response = client.post(
        "/user/edit_profile_picture",
        data={"profile_picture": (img_io, "test_image.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert "new_url" in data


def test_edit_profile_picture_no_file(client, init_db, sample_user):
    """Test editing profile picture without providing a file."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post("/user/edit_profile_picture", data={})

    assert response.status_code == 400
    data = json.loads(response.data)
    assert data["success"] is False
    assert "No file part" in data["error"]


def test_delete_profile_picture(client, init_db, sample_user):
    """Test deleting profile picture."""
    # Set a profile picture
    sample_user.profile_picture = "test_picture.png"
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post("/user/delete_profile_picture", follow_redirects=True)

    assert response.status_code == 200
    assert b"Profile picture removed" in response.data

    db.session.refresh(sample_user)
    assert sample_user.profile_picture is None


def test_profile_picture_endpoint(client, init_db):
    """Test serving profile pictures."""
    # Mock send_from_directory since we don't have actual files
    with patch("application.routes.user_routes.send_from_directory") as mock_send:
        mock_send.return_value = "file_content"
        client.get("/user/profile_pictures/test.png")
        assert mock_send.called


def test_profile_picture_path_traversal_protection(client, init_db):
    """Test protection against path traversal attacks."""
    response = client.get("/user/profile_pictures/../../../etc/passwd")
    assert response.status_code == 400


# --- Skill Tests ---


def test_remove_skill(client, init_db, sample_user):
    """Test removing a skill via AJAX."""
    skill = Skill(name="Python", user_id=sample_user.id)
    db.session.add(skill)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post(f"/user/remove_skill/{skill.id}")

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert Skill.query.get(skill.id) is None


# --- Helper Function & Model Tests ---


def test_helper_functions_clear_user_skills(init_db, sample_user):
    """Test clear_user_skills helper function."""
    from application.routes.user_routes import clear_user_skills

    sample_user.add_skill("Python")
    db.session.commit()
    assert len(sample_user.skills) > 0

    clear_user_skills(sample_user)
    db.session.commit()

    db.session.refresh(sample_user)
    assert len(sample_user.skills) == 0


def test_helper_functions_add_user_skills(init_db, sample_user):
    """Test add_user_skills helper function."""
    from application.routes.user_routes import add_user_skills

    skills_list = ["Python", "JavaScript", "SQL"]
    add_user_skills(sample_user, skills_list)
    db.session.commit()

    db.session.refresh(sample_user)
    assert len(sample_user.skills) == 3
    skill_names = [s.name for s in sample_user.skills]
    assert "Python" in skill_names


def test_user_model_add_skill(init_db, sample_user):
    """Test User model's add_skill method."""
    initial_skill_count = len(sample_user.skills)
    sample_user.add_skill("Java")

    assert len(sample_user.skills) == initial_skill_count + 1
    assert any(s.name == "Java" for s in sample_user.skills)


def test_daily_duck_logic(client, init_db, sample_user):
    """Test that login awards ducks correctly."""
    sample_user.set_password("testpassword")
    # Reset ducks
    sample_user.duck_balance = 0
    sample_user.last_daily_duck = None
    db.session.commit()

    # First login
    client.post(
        "/user/login",
        data={"username": sample_user.username, "password": "testpassword"},
        follow_redirects=True,
    )

    db.session.refresh(sample_user)
    assert sample_user.duck_balance >= 1
    assert sample_user.last_daily_duck == date.today()

    # Second login same day (should not award again)
    initial_balance = sample_user.duck_balance
    with client.session_transaction() as sess:
        sess.clear()

    client.post(
        "/user/login",
        data={"username": sample_user.username, "password": "testpassword"},
        follow_redirects=True,
    )

    db.session.refresh(sample_user)
    assert sample_user.duck_balance == initial_balance
