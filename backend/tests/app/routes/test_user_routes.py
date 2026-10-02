"""
File: test_user_routes.py
Type: py
Summary: Unit tests for user routes Flask routes, adjusted for recent route refactoring.
"""

import json
import re
import uuid
from datetime import datetime, timezone
from io import BytesIO
from unittest.mock import patch

import pytest
from application import db
from application.config import Config
from application.models.project import Project
from application.models.project_template import ProjectTemplate
from application.models.skill import Skill
from application.models.user import User
from PIL import Image
from tests.factories import AdminFactory, UserFactory
from tests.image_helpers import animated_gif_bytes, jpeg_bytes, png_bytes, png_header_only

# --- Authentication Tests ---


def test_login_get(client, init_db):
    """Test GET request to login page."""
    # Logged in users get redirected to /chat, so clear session first
    with client.session_transaction() as sess:
        sess.clear()

    response = client.get("/user/login")
    assert response.status_code == 200
    assert b"login" in response.data.lower()


def test_login_success(client, init_db):
    sample_user = UserFactory()
    """Test successful login."""
    sample_user.set_password("testpassword123")
    db.session.commit()

    response = client.post(
        "/user/login",
        json={"username": sample_user.username, "password": "testpassword123"},
    )

    assert response.status_code == 200
    assert b"user" in response.data
    assert b"awarded_duck" in response.data

    with client.session_transaction() as sess:
        assert sess.get("user") == sample_user.id
        # The conversation_id might be set asynchronously or based on seeded data
        # If it's missing, we'll check why later, but let's at least check user


def test_login_invalid_username(client, init_db):
    """Test login with invalid username."""
    response = client.post(
        "/user/login",
        data={"username": "nonexistent_user", "password": "password123"},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Invalid username or password" in response.data


def test_login_invalid_password(client, init_db):
    sample_user = UserFactory()
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


def test_logout(client, init_db):
    sample_user = UserFactory()
    """Test user logout."""
    # Set user as online
    sample_user.is_online = True
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/user/logout")

    assert response.status_code == 302

    with client.session_transaction() as sess:
        flashed = [msg for _cat, msg in sess.get("_flashes", [])]
    assert any("logged out" in m.lower() for m in flashed)

    with client.session_transaction() as sess:
        assert "user" not in sess

    db.session.refresh(sample_user)
    assert sample_user.is_online is False


def test_signup_get(client, init_db):
    """Test GET request to signup page."""
    response = client.get("/user/signup")
    assert response.status_code < 500


def test_signup_success(client, init_db):
    """Test successful user signup."""
    username = f"newuser_{uuid.uuid4().hex[:8]}"

    response = client.post(
        "/user/signup",
        json={"username": username, "password": "newpassword123"},
    )

    assert response.status_code == 201
    assert b"Account created" in response.data

    user = User.query.filter_by(username=username.lower()).first()
    assert user is not None
    assert user.check_password("newpassword123")


def test_signup_retries_when_generated_slug_collides(client, init_db, monkeypatch):
    """Two simultaneous signups can generate the same slug; the loser retries."""
    UserFactory(_username="first_sam", nickname="Sam")  # slug "sam"
    real_generate_slug = User.generate_slug
    calls = []

    def racy_generate_slug(self):
        calls.append(1)
        if len(calls) == 1:
            self.slug = "sam"  # computed before the other signup committed
            return self.slug
        return real_generate_slug(self)

    monkeypatch.setattr(User, "generate_slug", racy_generate_slug)

    response = client.post(
        "/user/signup", json={"username": "sam", "password": "newpassword123"}
    )

    assert response.status_code == 201
    assert User.query.filter_by(username="sam").one().slug == "sam-1"


def test_signup_duplicate_username(client, init_db):
    sample_user = UserFactory()
    """Test signup with existing username."""
    response = client.post(
        "/user/signup",
        json={"username": sample_user.username, "password": "password123"},
    )

    assert response.status_code == 409
    assert b"Username already exists" in response.data


# --- Profile Tests ---


def test_profile_authenticated(client, init_db):
    sample_user = UserFactory()
    """Test accessing profile when authenticated."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/user/profile", headers={"Accept": "application/json"})
    assert response.status_code == 200
    assert str(sample_user.id).encode() in response.data


def test_profile_not_authenticated(client, init_db):
    """Test accessing profile without authentication."""
    response = client.get("/user/profile", headers={"Accept": "application/json"})
    assert response.status_code == 401


def test_view_user_profile_by_slug_is_public(client, init_db):
    sample_user = UserFactory()
    """Profile pages are intentionally public (no login required) — this is
    a disclosed and accepted tradeoff, not an oversight."""
    response = client.get(
        f"/user/profile/{sample_user.slug}", headers={"Accept": "application/json"}
    )
    assert response.status_code == 200
    assert response.json["data"]["target"]["username"] == sample_user.username


def test_edit_profile_get(client, init_db):
    sample_user = UserFactory()
    """Test GET request to edit profile page."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/user/edit_profile", headers={"Accept": "application/json"})
    assert response.status_code == 200


def test_edit_profile_post(client, init_db):
    sample_user = UserFactory()
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
        headers={"Accept": "application/json"},
    )

    assert response.status_code == 200
    assert b"Account settings updated successfully" in response.data

    db.session.refresh(sample_user)
    assert len(sample_user.skills) == 2
    assert sample_user.ip_address == "127.0.0.1"
    assert sample_user.is_online is True


def test_edit_profile_change_password(client, init_db):
    sample_user = UserFactory()
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
        headers={"Accept": "application/json"},
    )

    assert response.status_code == 200
    assert b"Account settings updated successfully" in response.data

    db.session.refresh(sample_user)
    assert sample_user.check_password("newpassword")


def test_edit_profile_password_mismatch(client, init_db):
    sample_user = UserFactory()
    """Test edit profile with mismatched passwords."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post(
        "/user/edit_profile",
        json={
            "password": "newpassword",
            "confirm_password": "differentpassword",
        },
        headers={"Accept": "application/json"},
    )

    assert b"Passwords do not match" in response.data
    assert response.status_code == 400


def test_edit_profile_without_skills_key_keeps_skills(client, init_db, sample_user):
    """Saving settings (bio/nickname) must not wipe existing skills."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
    client.post(
        "/user/edit_profile",
        json={"skills": ["Python", "JavaScript"]},
        headers={"Accept": "application/json"},
    )
    db.session.refresh(sample_user)
    assert len(sample_user.skills) == 2

    response = client.post(
        "/user/edit_profile",
        json={"bio": "new bio", "nickname": "  New Nick  "},
        headers={"Accept": "application/json"},
    )
    assert response.status_code == 200
    db.session.refresh(sample_user)
    assert len(sample_user.skills) == 2
    assert sample_user.bio == "new bio"


def test_edit_profile_nickname_does_not_change_slug(client, init_db, sample_user):
    # Students cannot change their own nickname, so use a non-student account.
    sample_user.role = "parent"
    db.session.commit()
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
    old_slug = sample_user.slug
    client.post(
        "/user/edit_profile",
        json={"nickname": "  Totally Different  "},
        headers={"Accept": "application/json"},
    )
    db.session.refresh(sample_user)
    assert sample_user.nickname == "Totally Different"
    assert sample_user.slug == old_slug


def test_login_bad_credentials_returns_json_error(client, init_db, sample_user):
    response = client.post(
        "/user/login", json={"username": sample_user.username, "password": "nope"}
    )
    assert response.status_code == 401
    assert response.get_json() == {"error": "Invalid username or password."}


def test_login_json_null_fields_do_not_500(client, init_db):
    response = client.post("/user/login", json={"username": None, "password": None})
    assert response.status_code < 500


# --- Project Route Tests (New) ---


def test_new_project_post(client, init_db):
    sample_user = UserFactory()
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


def test_edit_project_post(client, init_db):
    sample_user = UserFactory()
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


def test_delete_project(client, init_db):
    sample_user = UserFactory()
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
    assert db.session.get(Project, project.id) is None


# --- Image & File Handling Tests ---


def test_edit_profile_picture_api(client, init_db):
    sample_user = UserFactory()
    """Test editing profile picture via API endpoint."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    img = Image.new("RGB", (100, 100), color="red")
    img_io = BytesIO()
    img.save(img_io, "PNG")
    img_io.seek(0)

    response = client.post(
        "/user/api/profile-picture",
        data={"profile_picture": (img_io, "test_image.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    data = json.loads(response.data)["data"]
    assert "new_url" in data


def test_edit_profile_picture_no_file(client, init_db):
    sample_user = UserFactory()
    """Test editing profile picture without providing a file."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post("/user/api/profile-picture", data={})

    assert response.status_code == 400
    assert b"No file part" in response.data


def test_profile_picture_endpoint(client, init_db):
    """Test serving profile pictures."""
    with patch("application.routes.user_routes.send_from_directory") as mock_send:
        mock_send.return_value = "file_content"
        client.get("/user/profile_pictures/test.png")
        assert mock_send.called


def test_profile_picture_path_traversal_protection(client, init_db):
    """Test protection against path traversal attacks."""
    response = client.get("/user/profile_pictures/../../../etc/passwd")
    assert response.status_code == 400


# --- Helper Function & Model Tests ---


def test_helper_functions_clear_user_skills(init_db):
    sample_user = UserFactory()
    """Test clear_user_skills helper function."""
    from application.routes.user_routes import clear_user_skills

    db.session.add(Skill(name="Python", user_id=sample_user.id))
    db.session.commit()
    assert len(sample_user.skills) > 0

    clear_user_skills(sample_user)
    db.session.commit()

    db.session.refresh(sample_user)
    assert len(sample_user.skills) == 0


def test_helper_functions_add_user_skills(init_db):
    sample_user = UserFactory()
    """Test add_user_skills helper function."""
    from application.routes.user_routes import add_user_skills

    skills_list = ["Python", "JavaScript", "SQL"]
    add_user_skills(sample_user, skills_list)
    db.session.commit()

    db.session.refresh(sample_user)
    assert len(sample_user.skills) == 3
    skill_names = [s.name for s in sample_user.skills]
    assert "Python" in skill_names


def test_daily_duck_logic(client, init_db):
    sample_user = UserFactory()
    """Test that login awards ducks correctly."""
    sample_user.set_password("testpassword")
    # Reset ducks
    sample_user.duck_balance = 0
    sample_user.last_daily_duck = None
    db.session.commit()

    # First login
    client.post(
        "/user/login",
        json={"username": sample_user.username, "password": "testpassword"},
    )

    db.session.refresh(sample_user)
    assert sample_user.duck_balance >= 1
    # The daily-duck day boundary is UTC, not the server's local date.
    assert sample_user.last_daily_duck == datetime.now(timezone.utc).date()

    # Second login same day (should not award again)
    initial_balance = sample_user.duck_balance
    with client.session_transaction() as sess:
        sess.clear()

    client.post(
        "/user/login",
        json={"username": sample_user.username, "password": "testpassword"},
    )

    db.session.refresh(sample_user)
    assert sample_user.duck_balance == initial_balance


def test_get_project_templates(client, init_db):
    sample_user = UserFactory()
    """Test retrieving list of default projects."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/api/project-templates")
    assert response.status_code == 200

    data = json.loads(response.data)
    assert data["status"] == "success"
    templates = data["data"]["templates"]
    assert isinstance(templates, dict)
    assert "CS1 Capstone" in templates
    assert "description" in templates["CS1 Capstone"]
    assert "Dangerous Skies" in templates


def test_search_users_requires_login(client, init_db):
    sample_user = UserFactory()
    resp = client.get(f"/user/api/users/search?q={sample_user.username}")
    assert resp.status_code in (302, 401)


def test_search_users(client, init_db):
    sample_user = UserFactory()
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
    resp = client.get(f"/user/api/users/search?q={sample_user.username}")
    assert resp.status_code == 200
    assert resp.json["data"]["users"][0]["username"] == sample_user.username


def test_profile_wallpaper_upload(client, init_db):
    sample_user = UserFactory()
    # Generate a valid PNG image in memory
    from PIL import Image

    img = Image.new("RGB", (10, 10), color="blue")
    img_bytes = BytesIO()
    img.save(img_bytes, format="PNG")
    img_bytes.seek(0)

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # Try unauthorized first (user does not have perk)
    resp_wall = client.post(
        "/user/api/profile-wallpaper",
        data={"profile_wallpaper": (BytesIO(img_bytes.getvalue()), "wall.png")},
        content_type="multipart/form-data",
    )
    assert resp_wall.status_code == 403

    # Grant perk and succeed
    sample_user.has_custom_wallpaper = True
    db.session.commit()

    resp_wall = client.post(
        "/user/api/profile-wallpaper",
        data={"profile_wallpaper": (BytesIO(img_bytes.getvalue()), "wall.png")},
        content_type="multipart/form-data",
    )
    assert resp_wall.status_code == 200
    assert "filename" in resp_wall.json["data"]


def test_serving_endpoints(client, init_db):
    # View default pfp
    resp = client.get("/user/profile_pictures/Default_pfp.jpg")
    assert resp.status_code == 200
    resp.close()

    # View nonexistent pfp (fallback to Default_pfp.jpg)
    resp = client.get("/user/profile_pictures/nonexistent_pfp.png")
    assert resp.status_code == 200
    resp.close()

    # View nonexistent wallpaper (should 404)
    resp = client.get("/user/profile_wallpapers/nonexistent_wall.png")
    assert resp.status_code == 404
    resp.close()

    # View nonexistent project image (fallback to placeholder)
    resp = client.get("/user/project_images/nonexistent_proj.png")
    assert resp.status_code == 200
    resp.close()


def test_login_unapproved_user_and_edge_cases(client, init_db):
    unapproved = User(username="unapproved_guy", is_approved=False, role="student")
    unapproved.set_password("pass1234")
    db.session.add(unapproved)
    db.session.commit()

    # JSON login unapproved -> 403
    resp = client.post(
        "/user/login", json={"username": "unapproved_guy", "password": "pass1234"}
    )
    assert resp.status_code == 403
    assert resp.json["is_approved"] is False

    # HTML login unapproved -> redirect to login
    resp_html = client.post(
        "/user/login",
        data={"username": "unapproved_guy", "password": "pass1234"},
        follow_redirects=False,
    )
    assert resp_html.status_code == 302
    assert "/user/login" in resp_html.headers.get("Location", "")

    # JSON login invalid password -> 401
    resp_invalid = client.post(
        "/user/login", json={"username": "unapproved_guy", "password": "wrong_password"}
    )
    assert resp_invalid.status_code == 401

    # GET request with JSON accept header -> 405
    resp_get_json = client.get("/user/login", headers={"Accept": "application/json"})
    assert resp_get_json.status_code == 405


def test_auth_status_and_tutorial_complete(client, init_db):
    sample_user = UserFactory()
    # Unauthenticated auth_status
    resp = client.get("/user/api/auth/status")
    assert resp.status_code == 200
    assert resp.json["data"]["logged_in"] is False

    # Unauthenticated tutorial complete
    resp_tut_unauth = client.post("/user/api/auth/tutorial/complete")
    assert resp_tut_unauth.status_code in (302, 401)

    # Authenticate
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # Authenticated auth_status
    resp_auth = client.get("/user/api/auth/status")
    assert resp_auth.status_code == 200
    assert resp_auth.json["data"]["logged_in"] is True

    # Authenticated tutorial complete
    resp_tut = client.post("/user/api/auth/tutorial/complete")
    assert resp_tut.status_code == 200
    assert resp_tut.json["data"]["has_seen_tutorial"] is True
    db.session.refresh(sample_user)
    assert sample_user.has_seen_tutorial is True


def test_logout_json_response(client, init_db):
    sample_user = UserFactory()
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    resp = client.get("/user/logout", headers={"Accept": "application/json"})
    assert resp.status_code == 200
    assert resp.json["status"] == "success"


def test_signup_validations(client, init_db):
    # Missing username or password
    resp = client.post("/user/signup", json={"username": "", "password": ""})
    assert resp.status_code == 400

    # Short password
    resp = client.post("/user/signup", json={"username": "valid_user", "password": "123"})
    assert resp.status_code == 400

    # Invalid username format
    resp = client.post("/user/signup", json={"username": "Invalid User!", "password": "password123"})
    assert resp.status_code == 400


def test_profile_not_found_and_html_redirect(client, init_db):
    sample_user = UserFactory()
    # User ID in session doesn't exist in DB
    with client.session_transaction() as sess:
        sess["user"] = 999999

    resp = client.get("/user/profile", headers={"Accept": "application/json"})
    assert resp.status_code == 404

    # Valid user, HTML request (no JSON header)
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    resp_html = client.get("/user/profile")
    assert resp_html.status_code == 302
    assert "/profile" in resp_html.headers.get("Location", "")


def test_view_user_profile_slug_html_redirect_and_404(client, init_db):
    sample_user = UserFactory()
    # HTML redirect
    resp = client.get(f"/user/profile/{sample_user.slug}")
    assert resp.status_code == 302

    # Non-existent slug -> 404
    resp_404 = client.get("/user/profile/nonexistent-slug-12345", headers={"Accept": "application/json"})
    assert resp_404.status_code == 404


def test_edit_profile_html_redirect_and_bio_update(client, init_db):
    sample_user = UserFactory()
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # GET HTML redirect
    resp_get = client.get("/user/edit_profile")
    assert resp_get.status_code == 302

    # POST JSON update with bio & nickname for student (nickname should be ignored)
    original_nick = sample_user.nickname
    resp_post = client.post(
        "/user/edit_profile",
        json={"bio": "Awesome bio", "nickname": "CoolNick"},
        headers={"Accept": "application/json"},
    )
    assert resp_post.status_code == 200
    db.session.refresh(sample_user)
    assert sample_user.bio == "Awesome bio"
    assert sample_user.nickname == original_nick

    # Non-student user (e.g. parent) CAN update nickname
    sample_user.role = "parent"
    db.session.commit()
    resp_post_parent = client.post(
        "/user/edit_profile",
        json={"nickname": "CoolNick"},
        headers={"Accept": "application/json"},
    )
    assert resp_post_parent.status_code == 200
    db.session.refresh(sample_user)
    assert sample_user.nickname == "CoolNick"


def test_get_parent_connection_code_route(client, init_db):
    sample_user = UserFactory()
    # Student user
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    resp = client.get("/user/api/parent-code")
    assert resp.status_code == 200
    assert "connection_code" in resp.json["data"]

    # Parent user
    parent = User(username="parent_user", role="parent", is_approved=True)
    parent.set_password("pass1234")
    db.session.add(parent)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = parent.id

    resp_parent = client.get("/user/api/parent-code")
    assert resp_parent.status_code == 400


def test_new_project_edge_cases(client, init_db):
    sample_user = UserFactory()
    admin = User(username="admin_user", role="admin", is_approved=True)
    admin.set_password("pass1234")
    db.session.add(admin)
    db.session.commit()

    # 1. Missing project name -> 400
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    resp_no_name = client.post("/user/project/new", data={"name": ""})
    assert resp_no_name.status_code == 400

    # 2. Admin creating project for another student
    with client.session_transaction() as sess:
        sess["user"] = admin.id

    resp_admin_proj = client.post(
        "/user/project/new",
        data={
            "name": "Admin Assigned Project",
            "student_id": sample_user.id,
            "teacher_comment": "Great work!",
        },
    )
    assert resp_admin_proj.status_code == 200

    created_proj = Project.query.filter_by(name="Admin Assigned Project").first()
    assert created_proj is not None
    assert created_proj.user_id == sample_user.id
    assert created_proj.teacher_comment == "Great work!"

    # 3. Admin creating project for invalid student -> 400
    resp_invalid_student = client.post(
        "/user/project/new",
        data={"name": "Bad Project", "student_id": 999999},
    )
    assert resp_invalid_student.status_code == 400

    # 4. Invalid image upload format -> 400
    txt_file = (BytesIO(b"not an image"), "test.txt")
    resp_invalid_img = client.post(
        "/user/project/new",
        data={"name": "Invalid Image Project", "project_image": txt_file},
    )
    assert resp_invalid_img.status_code == 400

    # 5. Admin GET project/new JSON -> returns students
    resp_admin_get = client.get("/user/project/new", headers={"Accept": "application/json"})
    assert resp_admin_get.status_code == 200
    assert "students" in resp_admin_get.json["data"]

    # 6. GET project/new non-JSON -> redirect
    resp_get_html = client.get("/user/project/new")
    assert resp_get_html.status_code == 302


def test_edit_project_edge_cases(client, init_db):
    sample_user = UserFactory()
    admin = User(username="admin_proj_editor", role="admin", is_approved=True)
    admin.set_password("pass1234")

    other_user = User(username="other_user", is_approved=True)
    other_user.set_password("pass1234")

    db.session.add_all([admin, other_user])
    db.session.commit()

    project = Project(name="Original Proj", user_id=sample_user.id)
    db.session.add(project)
    db.session.commit()

    # 1. Non-owner non-admin editing -> 403
    with client.session_transaction() as sess:
        sess["user"] = other_user.id

    resp_forbidden = client.post(
        f"/user/project/edit/{project.id}", data={"name": "Hacked Name"}
    )
    assert resp_forbidden.status_code == 403

    # 2. Admin reassigning student_id (invalid student -> 400)
    with client.session_transaction() as sess:
        sess["user"] = admin.id

    resp_invalid_reassign = client.post(
        f"/user/project/edit/{project.id}", data={"name": "Reassigned", "student_id": 999999}
    )
    assert resp_invalid_reassign.status_code == 400

    # 3. Admin reassigning student_id (valid student -> success)
    resp_valid_reassign = client.post(
        f"/user/project/edit/{project.id}",
        data={
            "name": "Reassigned Proj",
            "student_id": other_user.id,
            "teacher_comment": "Reassigned comment",
        },
    )
    assert resp_valid_reassign.status_code == 200
    db.session.refresh(project)
    assert project.user_id == other_user.id
    assert project.teacher_comment == "Reassigned comment"

    # 4. Invalid project image format on edit -> 400
    txt_file = (BytesIO(b"not an image"), "test.txt")
    resp_bad_img = client.post(
        f"/user/project/edit/{project.id}", data={"name": "Edit Proj", "project_image": txt_file}
    )
    assert resp_bad_img.status_code == 400

    # 5. GET edit_project non-JSON -> redirect
    resp_get = client.get(f"/user/project/edit/{project.id}")
    assert resp_get.status_code == 302


def test_api_profile_picture_validations(client, init_db):
    sample_user = UserFactory()
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # Empty filename -> 400
    empty_file = (BytesIO(b""), "")
    resp = client.post("/user/api/profile-picture", data={"profile_picture": empty_file})
    assert resp.status_code == 400

    # Invalid extension -> 400
    txt_file = (BytesIO(b"hello"), "file.txt")
    resp = client.post("/user/api/profile-picture", data={"profile_picture": txt_file})
    assert resp.status_code == 400

    # File > 5MB -> 413 (Payload Too Large)
    large_data = BytesIO(b"0" * (5 * 1024 * 1024 + 10))
    large_file = (large_data, "large.png")
    resp = client.post("/user/api/profile-picture", data={"profile_picture": large_file})
    assert resp.status_code == 413
    assert "Maximum size is 5MB" in resp.json["error"]


def test_api_profile_wallpaper_validations(client, init_db):
    sample_user = UserFactory()
    sample_user.has_custom_wallpaper = True
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # Missing file -> 400
    resp = client.post("/user/api/profile-wallpaper", data={})
    assert resp.status_code == 400

    # Empty filename -> 400
    resp = client.post(
        "/user/api/profile-wallpaper",
        data={"profile_wallpaper": (BytesIO(b""), "")},
    )
    assert resp.status_code == 400

    # Invalid format -> 400
    resp = client.post(
        "/user/api/profile-wallpaper",
        data={"profile_wallpaper": (BytesIO(b"test"), "wall.txt")},
    )
    assert resp.status_code == 400

    # Large file > 10MB -> 413 (Payload Too Large)
    large_data = BytesIO(b"0" * (10 * 1024 * 1024 + 10))
    resp = client.post(
        "/user/api/profile-wallpaper",
        data={"profile_wallpaper": (large_data, "huge.png")},
    )
    assert resp.status_code == 413
    assert "Maximum size is 10MB" in resp.json["error"]


def test_search_users_empty_query(client, init_db):
    sample_user = UserFactory()
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    resp = client.get("/user/api/users/search?q=")
    assert resp.status_code == 200
    assert resp.json["data"]["users"] == []


def test_get_parent_code_user_not_found(client, init_db):
    with client.session_transaction() as sess:
        sess["user"] = 999999

    resp = client.get("/user/api/parent-code")
    assert resp.status_code == 404


def synchronous_thread_start(self):
    self._target(*self._args, **self._kwargs)

def test_handle_video_s3_upload_helper(init_db, test_app):
    sample_user = UserFactory()
    from application.routes.user_routes import start_video_upload_thread

    assert start_video_upload_thread(None, sample_user, "Project", 1) is False

    class DummyFileNoName:
        pass
    assert start_video_upload_thread(DummyFileNoName(), sample_user, "Project", 1) is False

    class DummyFileNoExt:
        filename = "videofile"
    assert start_video_upload_thread(DummyFileNoExt(), sample_user, "Project", 1) is False

    class DummyFileBadExt:
        filename = "video.pdf"
    assert start_video_upload_thread(DummyFileBadExt(), sample_user, "Project", 1) is False

    class DummyVideoFile:
        filename = "demo.mp4"
        content_type = "video/mp4"
        def seek(self, pos): pass
        def read(self): return b"fake video bytes"

    project = Project(name="S3 Proj", user_id=sample_user.id)
    db.session.add(project)
    db.session.commit()

    with patch("application.routes.user_routes.threading.Thread.start", synchronous_thread_start),          patch("application.routes.user_routes.get_s3_client") as mock_get_s3:
        mock_s3 = mock_get_s3.return_value
        with test_app.app_context():
            res = start_video_upload_thread(DummyVideoFile(), sample_user, project.name, project.id)

        assert res is True
        mock_s3.upload_fileobj.assert_called_once()
        db.session.refresh(project)
        assert project.video_url is not None
        assert ".mp4" in project.video_url


def test_video_upload_uses_configured_bucket_and_region(init_db, test_app, monkeypatch):
    from application.routes.user_routes import start_video_upload_thread

    sample_user = UserFactory()

    class DummyVideoFile:
        filename = "demo.mp4"
        content_type = "video/mp4"
        def seek(self, pos): pass
        def read(self): return b"fake video bytes"

    project = Project(name="Cfg Proj", user_id=sample_user.id)
    db.session.add(project)
    db.session.commit()

    monkeypatch.setitem(test_app.config, "S3_UPLOAD_BUCKET", "custom-video-bucket")
    monkeypatch.setenv("AWS_REGION", "eu-west-1")

    with patch("application.routes.user_routes.threading.Thread.start", synchronous_thread_start):
        with patch("application.routes.user_routes.get_s3_client") as mock_get_s3:
            with test_app.app_context():
                started = start_video_upload_thread(DummyVideoFile(), sample_user, project.name, project.id)
    assert started is True

    assert mock_get_s3.return_value.upload_fileobj.call_args.args[1] == "custom-video-bucket"
    db.session.refresh(project)
    assert project.video_url.startswith("https://custom-video-bucket.s3.eu-west-1.amazonaws.com/")


def test_new_and_edit_project_video_upload(client, init_db):
    sample_user = UserFactory()
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    video_file = (BytesIO(b"fake video content"), "test_video.mp4")

    with patch("application.routes.user_routes.threading.Thread.start", synchronous_thread_start),          patch("application.routes.user_routes.get_s3_client") as mock_get_s3:
        mock_s3 = mock_get_s3.return_value
        resp_new = client.post(
            "/user/project/new",
            data={"name": "Video Project", "project_video": video_file},
        )
        assert resp_new.status_code == 200
        assert resp_new.json["data"]["video_processing"] is True
        mock_s3.upload_fileobj.assert_called_once()
        db.session.expire_all()
        project = Project.query.filter_by(name="Video Project").first()
        assert project is not None
        assert project.video_url is not None
        assert project.video_url.endswith(".mp4")

    with patch("application.routes.user_routes.threading.Thread.start", synchronous_thread_start),          patch("application.routes.user_routes.get_s3_client") as mock_get_s3:
        mock_s3 = mock_get_s3.return_value
        resp_edit = client.post(
            f"/user/project/edit/{project.id}",
            data={"name": "Video Project Edit", "project_video": (BytesIO(b"video"), "vid.mp4")},
        )
        assert resp_edit.status_code == 200
        assert resp_edit.json["data"]["video_processing"] is True
        mock_s3.upload_fileobj.assert_called_once()
        db.session.refresh(project)
        assert project.video_url is not None
        assert project.video_url.endswith(".mp4")


def test_edit_profile_form_pfp_upload(client, init_db):
    sample_user = UserFactory()
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    img = Image.new("RGB", (20, 20), color="green")
    img_bytes = BytesIO()
    img.save(img_bytes, format="PNG")
    img_bytes.seek(0)

    resp = client.post(
        "/user/edit_profile",
        data={"profile_picture": (img_bytes, "avatar.png")},
        content_type="multipart/form-data",
    )
    assert resp.status_code == 200
    db.session.refresh(sample_user)
    assert sample_user.profile_picture is not None




# --- Image uploads: validation, stored names, resizing and cleanup of replaced/deleted files ---


@pytest.fixture(autouse=True)
def upload_dir(test_app, tmp_path, monkeypatch):
    """Point every upload folder at a scratch directory instead of the real userData."""
    monkeypatch.setitem(test_app.config, "UPLOAD_FOLDER", str(tmp_path))
    monkeypatch.setattr(Config, "UPLOAD_FOLDER", str(tmp_path))
    return tmp_path


def _login(client, user):
    with client.session_transaction() as sess:
        sess["user"] = user.id


def _files(folder):
    return sorted(p.name for p in folder.iterdir()) if folder.exists() else []


def _post_picture(client, name, data, path="/user/api/profile-picture", field="profile_picture"):
    return client.post(path, data={field: (BytesIO(data), name)}, content_type="multipart/form-data")


def _make_stored(folder, name, data=b"old"):
    folder.mkdir(parents=True, exist_ok=True)
    (folder / name).write_bytes(data)
    return folder / name


UPLOADED_URL = "/user/project_images/{}.png".format("a" * 32)


# profile picture (API)


def test_profile_picture_rgba_png_named_jpg_is_stored_as_a_valid_png(client, init_db, upload_dir):
    user = UserFactory()
    _login(client, user)

    resp = _post_picture(client, "avatar.jpg", png_bytes(mode="RGBA"))

    assert resp.status_code == 200
    filename = resp.json["data"]["filename"]
    assert re.fullmatch(r"[0-9a-f]{32}\.png", filename)
    assert resp.json["data"]["new_url"] == f"/user/profile_pictures/{filename}"
    with Image.open(upload_dir / "profile_pictures" / filename) as stored:
        assert stored.format == "PNG"
        assert stored.mode == "RGBA"
    db.session.refresh(user)
    assert user.profile_picture == filename


def test_profile_picture_extension_follows_the_content(client, init_db, upload_dir):
    user = UserFactory()
    _login(client, user)

    resp = _post_picture(client, "avatar.png", jpeg_bytes())

    assert resp.status_code == 200
    assert resp.json["data"]["filename"].endswith(".jpg")


def test_profile_picture_animated_gif_keeps_its_frames(client, init_db, upload_dir):
    user = UserFactory()
    _login(client, user)

    resp = _post_picture(client, "dance.gif", animated_gif_bytes(frames=4))

    assert resp.status_code == 200
    filename = resp.json["data"]["filename"]
    assert filename.endswith(".gif")
    with Image.open(upload_dir / "profile_pictures" / filename) as stored:
        assert stored.n_frames == 4


def test_profile_picture_is_shrunk_to_512_pixels(client, init_db, upload_dir):
    user = UserFactory()
    _login(client, user)

    resp = _post_picture(client, "big.png", png_bytes(size=(1200, 800)))

    assert resp.status_code == 200
    with Image.open(upload_dir / "profile_pictures" / resp.json["data"]["filename"]) as stored:
        assert stored.size == (512, 341)


def test_profile_picture_with_too_many_pixels_is_a_400_not_a_500(client, init_db, upload_dir):
    user = UserFactory()
    _login(client, user)

    resp = _post_picture(client, "bomb.png", png_header_only(6000, 5000))

    assert resp.status_code == 400
    assert "Image dimensions too large" in resp.json["error"]
    assert _files(upload_dir / "profile_pictures") == []


def test_profile_picture_with_corrupt_content_is_a_400(client, init_db, upload_dir):
    user = UserFactory()
    _login(client, user)

    resp = _post_picture(client, "avatar.png", b"definitely not a png")

    assert resp.status_code == 400
    assert resp.json["error"] == "Invalid or corrupt image file."
    assert _files(upload_dir / "profile_pictures") == []


def test_profile_picture_replacement_deletes_the_old_file(client, init_db, upload_dir):
    user = UserFactory(profile_picture="old.png")
    folder = upload_dir / "profile_pictures"
    _make_stored(folder, "old.png")
    _login(client, user)

    resp = _post_picture(client, "new.png", png_bytes())

    assert resp.status_code == 200
    assert _files(folder) == [resp.json["data"]["filename"]]


def test_profile_picture_replacement_never_deletes_the_shared_default(client, init_db, upload_dir):
    user = UserFactory(profile_picture="Default_pfp.jpg")
    folder = upload_dir / "profile_pictures"
    _make_stored(folder, "Default_pfp.jpg")
    _login(client, user)

    resp = _post_picture(client, "new.png", png_bytes())

    assert resp.status_code == 200
    assert "Default_pfp.jpg" in _files(folder)


def test_profile_picture_failed_commit_keeps_the_old_file_and_drops_the_new_one(client, init_db, upload_dir):
    user = UserFactory(profile_picture="old.png")
    folder = upload_dir / "profile_pictures"
    _make_stored(folder, "old.png")
    _login(client, user)

    with patch("application.extensions.db.session.commit", side_effect=Exception("DB Error")):
        resp = _post_picture(client, "new.png", png_bytes())

    assert resp.status_code == 500
    assert _files(folder) == ["old.png"]
    db.session.refresh(user)
    assert user.profile_picture == "old.png"


# profile wallpaper


def _wallpaper_user():
    user = UserFactory()
    user.has_custom_wallpaper = True
    db.session.commit()
    return user


def test_wallpaper_rgba_png_named_jpg_is_stored_as_a_valid_png(client, init_db, upload_dir):
    user = _wallpaper_user()
    _login(client, user)

    resp = _post_picture(client, "wall.jpg", png_bytes(mode="RGBA", size=(64, 40)),
                         "/user/api/profile-wallpaper", "profile_wallpaper")

    assert resp.status_code == 200
    filename = resp.json["data"]["filename"]
    assert filename.endswith(".png")
    with Image.open(upload_dir / "profile_wallpapers" / filename) as stored:
        assert (stored.format, stored.size) == ("PNG", (64, 40))


def test_wallpaper_animated_gif_keeps_its_frames(client, init_db, upload_dir):
    user = _wallpaper_user()
    _login(client, user)

    resp = _post_picture(client, "wall.gif", animated_gif_bytes(frames=3),
                         "/user/api/profile-wallpaper", "profile_wallpaper")

    assert resp.status_code == 200
    with Image.open(upload_dir / "profile_wallpapers" / resp.json["data"]["filename"]) as stored:
        assert stored.n_frames == 3


def test_wallpaper_corrupt_content_is_a_400(client, init_db, upload_dir):
    user = _wallpaper_user()
    _login(client, user)

    resp = _post_picture(client, "wall.png", b"nope", "/user/api/profile-wallpaper", "profile_wallpaper")

    assert resp.status_code == 400
    assert _files(upload_dir / "profile_wallpapers") == []


def test_wallpaper_replacement_deletes_the_old_file(client, init_db, upload_dir):
    user = _wallpaper_user()
    user.profile_wallpaper = "old_wall.png"
    db.session.commit()
    folder = upload_dir / "profile_wallpapers"
    _make_stored(folder, "old_wall.png")
    _login(client, user)

    resp = _post_picture(client, "wall.png", png_bytes(), "/user/api/profile-wallpaper", "profile_wallpaper")

    assert resp.status_code == 200
    assert _files(folder) == [resp.json["data"]["filename"]]


def test_wallpaper_failed_commit_keeps_the_old_file_and_drops_the_new_one(client, init_db, upload_dir):
    user = _wallpaper_user()
    user.profile_wallpaper = "old_wall.png"
    db.session.commit()
    folder = upload_dir / "profile_wallpapers"
    _make_stored(folder, "old_wall.png")
    _login(client, user)

    with patch("application.extensions.db.session.commit", side_effect=Exception("DB Error")):
        resp = _post_picture(client, "wall.png", png_bytes(), "/user/api/profile-wallpaper", "profile_wallpaper")

    assert resp.status_code == 500
    assert _files(folder) == ["old_wall.png"]


# profile picture (edit_profile form)


def _post_profile_form(client, **fields):
    return client.post("/user/edit_profile", data=fields, content_type="multipart/form-data")


def test_edit_profile_form_picture_is_validated_and_stored_under_its_real_type(client, init_db, upload_dir):
    user = UserFactory()
    _login(client, user)

    resp = _post_profile_form(client, profile_picture=(BytesIO(png_bytes(mode="RGBA")), "me.jpg"))

    assert resp.status_code == 200
    db.session.refresh(user)
    assert re.fullmatch(r"[0-9a-f]{32}\.png", user.profile_picture)
    with Image.open(upload_dir / "profile_pictures" / user.profile_picture) as stored:
        assert stored.format == "PNG"


def test_edit_profile_form_picture_replacement_deletes_the_old_file(client, init_db, upload_dir):
    user = UserFactory(profile_picture="old.png")
    folder = upload_dir / "profile_pictures"
    _make_stored(folder, "old.png")
    _login(client, user)

    resp = _post_profile_form(client, profile_picture=(BytesIO(png_bytes()), "new.png"))

    assert resp.status_code == 200
    db.session.refresh(user)
    assert _files(folder) == [user.profile_picture]
    assert user.profile_picture != "old.png"


def test_edit_profile_form_without_a_picture_keeps_the_old_file(client, init_db, upload_dir):
    user = UserFactory(profile_picture="old.png")
    folder = upload_dir / "profile_pictures"
    _make_stored(folder, "old.png")
    _login(client, user)

    resp = _post_profile_form(client, bio="hello", profile_picture=(BytesIO(b""), ""))

    assert resp.status_code == 200
    assert _files(folder) == ["old.png"]
    db.session.refresh(user)
    assert (user.profile_picture, user.bio) == ("old.png", "hello")


@pytest.mark.parametrize(
    "name, data, status",
    [
        ("notes.txt", b"text", 400),
        ("me.png", b"not an image", 400),
        ("me.png", b"0" * (5 * 1024 * 1024 + 10), 413),
    ],
    ids=["bad-extension", "not-an-image", "too-large"],
)
def test_edit_profile_form_rejects_a_bad_picture_and_saves_nothing(client, init_db, upload_dir, name, data, status):
    user = UserFactory(profile_picture="old.png", bio="before")
    folder = upload_dir / "profile_pictures"
    _make_stored(folder, "old.png")
    _login(client, user)

    resp = _post_profile_form(client, bio="after", profile_picture=(BytesIO(data), name))

    assert resp.status_code == status
    assert resp.json["status"] == "error"
    assert _files(folder) == ["old.png"]
    db.session.expire_all()
    assert (user.profile_picture, user.bio) == ("old.png", "before")


def test_edit_profile_form_failed_commit_drops_the_new_file_and_keeps_the_old(client, init_db, upload_dir):
    user = UserFactory(profile_picture="old.png")
    folder = upload_dir / "profile_pictures"
    _make_stored(folder, "old.png")
    _login(client, user)

    with patch("application.extensions.db.session.commit", side_effect=Exception("DB Error")):
        resp = _post_profile_form(client, profile_picture=(BytesIO(png_bytes()), "new.png"))

    assert resp.status_code == 500
    assert _files(folder) == ["old.png"]


def test_edit_profile_form_for_a_deleted_user_is_a_500_not_a_crash(client, init_db, upload_dir):
    with client.session_transaction() as sess:
        sess["user"] = 999999

    resp = _post_profile_form(client, bio="hello")

    assert resp.status_code == 500
    assert resp.json["status"] == "error"
    assert resp.json["error"] == "An error occurred while updating the profile."


# project images


def test_new_project_image_is_validated_and_stored_under_its_real_type(client, init_db, upload_dir):
    user = UserFactory()
    _login(client, user)

    resp = client.post(
        "/user/project/new",
        data={"name": "With Image", "project_image": (BytesIO(png_bytes(mode="RGBA")), "shot.jpg")},
        content_type="multipart/form-data",
    )

    assert resp.status_code == 200
    project = Project.query.filter_by(name="With Image").one()
    match = re.fullmatch(r"/user/project_images/([0-9a-f]{32}\.png)", project.image_url)
    assert match
    with Image.open(upload_dir / "projects" / match.group(1)) as stored:
        assert stored.format == "PNG"


def test_new_project_image_is_shrunk_to_1600_pixels(client, init_db, upload_dir):
    user = UserFactory()
    _login(client, user)

    client.post(
        "/user/project/new",
        data={"name": "Wide", "project_image": (BytesIO(png_bytes(size=(3200, 1600))), "wide.png")},
        content_type="multipart/form-data",
    )

    project = Project.query.filter_by(name="Wide").one()
    with Image.open(upload_dir / "projects" / project.image_url.rsplit("/", 1)[1]) as stored:
        assert stored.size == (1600, 800)


@pytest.mark.parametrize(
    "name, data, status",
    [
        ("shot.png", b"not an image", 400),
        ("shot.png", png_header_only(6000, 5000), 400),
        ("shot.gif", b"GIF89a" + b"\0" * 10, 400),
        ("shot.png", b"0" * (10 * 1024 * 1024 + 10), 413),
    ],
    ids=["not-an-image", "too-many-pixels", "truncated-gif", "too-large"],
)
def test_new_project_rejects_a_bad_image_and_creates_nothing(client, init_db, upload_dir, name, data, status):
    user = UserFactory()
    _login(client, user)

    resp = client.post(
        "/user/project/new",
        data={"name": "Rejected", "project_image": (BytesIO(data), name)},
        content_type="multipart/form-data",
    )

    assert resp.status_code == status
    assert Project.query.filter_by(name="Rejected").first() is None
    assert _files(upload_dir / "projects") == []


def test_edit_project_rejects_a_bad_image_and_keeps_the_current_one(client, init_db, upload_dir):
    user = UserFactory()
    _make_stored(upload_dir / "projects", "a" * 32 + ".png")
    project = Project(name="Keep", user_id=user.id, image_url=UPLOADED_URL)
    db.session.add(project)
    db.session.commit()
    _login(client, user)

    resp = client.post(
        f"/user/project/edit/{project.id}",
        data={"name": "Keep", "project_image": (BytesIO(b"not an image"), "x.png")},
        content_type="multipart/form-data",
    )

    assert resp.status_code == 400
    assert _files(upload_dir / "projects") == ["a" * 32 + ".png"]
    db.session.expire_all()
    assert project.image_url == UPLOADED_URL


def test_deleting_a_project_removes_its_uploaded_image(client, init_db, upload_dir):
    user = UserFactory()
    _make_stored(upload_dir / "projects", "a" * 32 + ".png")
    project = Project(name="Gone", user_id=user.id, image_url=UPLOADED_URL)
    db.session.add(project)
    db.session.commit()
    project_id = project.id
    _login(client, user)

    resp = client.post(f"/user/project/edit/{project_id}", data={"action": "delete"})

    assert resp.status_code == 200
    assert db.session.get(Project, project_id) is None
    assert _files(upload_dir / "projects") == []


def test_deleting_a_project_keeps_an_image_a_template_still_uses(client, init_db, upload_dir):
    user = UserFactory()
    _make_stored(upload_dir / "projects", "a" * 32 + ".png")
    template = ProjectTemplate(name="Shared Template", description="d", image_url=UPLOADED_URL)
    project = Project(name="Assigned", user_id=user.id, image_url=UPLOADED_URL)
    db.session.add_all([template, project])
    db.session.commit()
    _login(client, user)

    resp = client.post(f"/user/project/edit/{project.id}", data={"action": "delete"})

    assert resp.status_code == 200
    assert _files(upload_dir / "projects") == ["a" * 32 + ".png"]


def test_deleting_a_project_keeps_an_image_another_project_still_uses(client, init_db, upload_dir):
    user = UserFactory()
    other = UserFactory()
    _make_stored(upload_dir / "projects", "a" * 32 + ".png")
    mine = Project(name="Mine", user_id=user.id, image_url=UPLOADED_URL)
    # an absolute URL to the same upload still counts as a use
    theirs = Project(name="Theirs", user_id=other.id, image_url="https://blossom.example.com" + UPLOADED_URL)
    db.session.add_all([mine, theirs])
    db.session.commit()
    _login(client, user)

    resp = client.post(f"/user/project/edit/{mine.id}", data={"action": "delete"})

    assert resp.status_code == 200
    assert _files(upload_dir / "projects") == ["a" * 32 + ".png"]


@pytest.mark.parametrize(
    "image_url",
    [
        "/images/standard_projects/proj_1.jpg",
        "https://img.youtube.com/vi/abc/hqdefault.jpg",
        "/user/project_images/../../outside.png",
        "/user/project_images/short.png",
        "/user/project_images/" + "A" * 32 + ".png",
        None,
        "",
    ],
)
def test_deleting_a_project_ignores_image_urls_that_are_not_uploads(client, init_db, upload_dir, image_url):
    user = UserFactory()
    for name in ("short.png", "A" * 32 + ".png", "proj_1.jpg", "hqdefault.jpg"):
        _make_stored(upload_dir / "projects", name)
    (upload_dir / "outside.png").write_bytes(b"x")
    project = Project(name="Other URL", user_id=user.id, image_url=image_url)
    db.session.add(project)
    db.session.commit()
    _login(client, user)
    before = _files(upload_dir / "projects")

    resp = client.post(f"/user/project/edit/{project.id}", data={"action": "delete"})

    assert resp.status_code == 200
    assert _files(upload_dir / "projects") == before
    assert (upload_dir / "outside.png").exists()


def test_a_cleanup_failure_never_blocks_deleting_a_project(client, init_db, upload_dir):
    user = UserFactory()
    _make_stored(upload_dir / "projects", "a" * 32 + ".png")
    project = Project(name="Stuck", user_id=user.id, image_url=UPLOADED_URL)
    db.session.add(project)
    db.session.commit()
    project_id = project.id
    _login(client, user)

    with patch("application.routes.user_routes.delete_stored_image", side_effect=RuntimeError("boom")):
        resp = client.post(f"/user/project/edit/{project_id}", data={"action": "delete"})

    assert resp.status_code == 200
    assert db.session.get(Project, project_id) is None


def test_replacing_a_project_image_removes_the_old_file(client, init_db, upload_dir):
    user = UserFactory()
    _make_stored(upload_dir / "projects", "a" * 32 + ".png")
    project = Project(name="Swap", user_id=user.id, image_url=UPLOADED_URL)
    db.session.add(project)
    db.session.commit()
    _login(client, user)

    resp = client.post(
        f"/user/project/edit/{project.id}",
        data={"name": "Swap", "project_image": (BytesIO(png_bytes()), "new.png")},
        content_type="multipart/form-data",
    )

    assert resp.status_code == 200
    db.session.refresh(project)
    new_name = project.image_url.rsplit("/", 1)[1]
    assert new_name != "a" * 32 + ".png"
    assert _files(upload_dir / "projects") == [new_name]


def test_replacing_a_project_image_keeps_the_old_file_a_template_uses(client, init_db, upload_dir):
    user = UserFactory()
    _make_stored(upload_dir / "projects", "a" * 32 + ".png")
    template = ProjectTemplate(name="Shared Swap", description="d", image_url=UPLOADED_URL)
    project = Project(name="Swap Shared", user_id=user.id, image_url=UPLOADED_URL)
    db.session.add_all([template, project])
    db.session.commit()
    _login(client, user)

    resp = client.post(
        f"/user/project/edit/{project.id}",
        data={"name": "Swap Shared", "project_image": (BytesIO(png_bytes()), "new.png")},
        content_type="multipart/form-data",
    )

    assert resp.status_code == 200
    assert len(_files(upload_dir / "projects")) == 2
    assert "a" * 32 + ".png" in _files(upload_dir / "projects")


def test_editing_a_project_without_a_new_image_keeps_the_file(client, init_db, upload_dir):
    user = UserFactory()
    _make_stored(upload_dir / "projects", "a" * 32 + ".png")
    project = Project(name="Same Image", user_id=user.id, image_url=UPLOADED_URL)
    db.session.add(project)
    db.session.commit()
    _login(client, user)

    resp = client.post(f"/user/project/edit/{project.id}", data={"name": "Renamed"})

    assert resp.status_code == 200
    assert _files(upload_dir / "projects") == ["a" * 32 + ".png"]


def test_project_image_handler_returns_none_without_a_file(test_app):
    from application.routes.user_routes import handle_project_image_upload

    with test_app.test_request_context():
        assert handle_project_image_upload(None) is None
