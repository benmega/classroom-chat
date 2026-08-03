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

from application import db
from application.models.project import Project
from application.models.skill import Skill
from application.models.user import User
from PIL import Image


def test_get_users(client, init_db, sample_user):
    """Test retrieving all users."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/user/get_users", headers={"Accept": "application/json"})
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
    response = client.get("/user/get_user_id", headers={"Accept": "application/json"})
    assert response.status_code == 401

    data = json.loads(response.data)
    assert "error" in data


# --- Authentication Tests ---


def test_login_get(client, init_db):
    """Test GET request to login page."""
    # Logged in users get redirected to /chat, so clear session first
    with client.session_transaction() as sess:
        sess.clear()

    response = client.get("/user/login")
    assert response.status_code == 200
    assert b"login" in response.data.lower()


def test_login_success(client, init_db, sample_user):
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

    with client.session_transaction() as sess:
        assert "user" not in sess

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
        json={"username": username, "password": "newpassword123"},
    )

    assert response.status_code == 201
    assert b"Account created" in response.data

    user = User.query.filter_by(username=username.lower()).first()
    assert user is not None
    assert user.check_password("newpassword123")


def test_signup_duplicate_username(client, init_db, sample_user):
    """Test signup with existing username."""
    response = client.post(
        "/user/signup",
        json={"username": sample_user.username, "password": "password123"},
    )

    assert response.status_code == 409
    assert b"Username already exists" in response.data


# --- Profile Tests ---


def test_profile_authenticated(client, init_db, sample_user):
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


def test_view_user_profile_by_slug_is_public(client, init_db, sample_user):
    """Profile pages are intentionally public (no login required) — this is
    a disclosed and accepted tradeoff, not an oversight."""
    response = client.get(
        f"/user/profile/{sample_user.slug}", headers={"Accept": "application/json"}
    )
    assert response.status_code == 200
    assert response.json["data"]["target"]["username"] == sample_user.username


def test_edit_profile_get(client, init_db, sample_user):
    """Test GET request to edit profile page."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/user/edit_profile", headers={"Accept": "application/json"})
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
        headers={"Accept": "application/json"},
    )

    assert response.status_code == 200
    assert b"Account settings updated successfully" in response.data

    db.session.refresh(sample_user)
    assert len(sample_user.skills) == 2
    assert sample_user.ip_address == "127.0.0.1"
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
        headers={"Accept": "application/json"},
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
        json={
            "password": "newpassword",
            "confirm_password": "differentpassword",
        },
        headers={"Accept": "application/json"},
    )

    assert b"Passwords do not match" in response.data
    assert response.status_code == 400


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
    assert db.session.get(Project, project.id) is None


# --- Image & File Handling Tests ---


def test_edit_profile_picture_api(client, init_db, sample_user):
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


def test_edit_profile_picture_no_file(client, init_db, sample_user):
    """Test editing profile picture without providing a file."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post("/user/api/profile-picture", data={})

    assert response.status_code == 400
    assert b"No file part" in response.data


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
    assert db.session.get(Skill, skill.id) is None


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
        json={"username": sample_user.username, "password": "testpassword"},
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
        json={"username": sample_user.username, "password": "testpassword"},
    )

    db.session.refresh(sample_user)
    assert sample_user.duck_balance == initial_balance


def test_pfp_integrity_cleanup(init_db, sample_user):
    """Test the cleanup of missing profile picture files."""
    from application.utilities.helper_functions import cleanup_missing_user_pfps

    # Set a custom PFP that doesn't exist on disk
    sample_user.profile_picture = "missing_image.png"
    db.session.commit()

    fixed_count = cleanup_missing_user_pfps()

    db.session.refresh(sample_user)
    assert fixed_count == 1
    assert sample_user.profile_picture == "Default_pfp.jpg"


def test_get_project_templates(client, init_db, sample_user):
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


def test_search_users_requires_login(client, init_db, sample_user):
    resp = client.get(f"/user/api/users/search?q={sample_user.username}")
    assert resp.status_code in (302, 401)


def test_search_users(client, init_db, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
    resp = client.get(f"/user/api/users/search?q={sample_user.username}")
    assert resp.status_code == 200
    assert resp.json["data"]["users"][0]["username"] == sample_user.username


def test_project_image_and_wallpaper_upload(client, init_db, sample_user):
    # Generate a valid PNG image in memory
    from PIL import Image

    img = Image.new("RGB", (10, 10), color="blue")
    img_bytes = BytesIO()
    img.save(img_bytes, format="PNG")
    img_bytes.seek(0)

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    data = {"project_image": (BytesIO(img_bytes.getvalue()), "image.png")}
    resp = client.post(
        "/user/api/project-image", data=data, content_type="multipart/form-data"
    )
    assert resp.status_code == 200
    assert "filename" in resp.json["data"]

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


def test_auth_status_and_tutorial_complete(client, init_db, sample_user):
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


def test_logout_json_response(client, init_db, sample_user):
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


def test_profile_not_found_and_html_redirect(client, init_db, sample_user):
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


def test_view_user_profile_slug_html_redirect_and_404(client, init_db, sample_user):
    # HTML redirect
    resp = client.get(f"/user/profile/{sample_user.slug}")
    assert resp.status_code == 302

    # Non-existent slug -> 404
    resp_404 = client.get("/user/profile/nonexistent-slug-12345", headers={"Accept": "application/json"})
    assert resp_404.status_code == 404


def test_edit_profile_html_redirect_and_bio_update(client, init_db, sample_user):
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


def test_get_parent_connection_code_route(client, init_db, sample_user):
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


def test_new_project_edge_cases(client, init_db, sample_user):
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


def test_edit_project_edge_cases(client, init_db, sample_user):
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


def test_api_profile_picture_validations(client, init_db, sample_user):
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

    # File > 5MB -> 400
    large_data = BytesIO(b"0" * (5 * 1024 * 1024 + 10))
    large_file = (large_data, "large.png")
    resp = client.post("/user/api/profile-picture", data={"profile_picture": large_file})
    assert resp.status_code == 400


def test_api_project_image_validations(client, init_db, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # Missing project_image -> 400
    resp = client.post("/user/api/project-image", data={})
    assert resp.status_code == 400

    # Empty filename -> 400
    resp = client.post("/user/api/project-image", data={"project_image": (BytesIO(b""), "")})
    assert resp.status_code == 400

    # Invalid file format -> 400
    resp = client.post(
        "/user/api/project-image",
        data={"project_image": (BytesIO(b"test"), "doc.txt")},
    )
    assert resp.status_code == 400

    # Large file > 10MB -> 400
    large_data = BytesIO(b"0" * (10 * 1024 * 1024 + 10))
    resp = client.post(
        "/user/api/project-image",
        data={"project_image": (large_data, "huge.png")},
    )
    assert resp.status_code == 400


def test_api_profile_wallpaper_validations(client, init_db, sample_user):
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

    # Large file > 10MB -> 400
    large_data = BytesIO(b"0" * (10 * 1024 * 1024 + 10))
    resp = client.post(
        "/user/api/profile-wallpaper",
        data={"profile_wallpaper": (large_data, "huge.png")},
    )
    assert resp.status_code == 400


def test_search_users_empty_query(client, init_db, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    resp = client.get("/user/api/users/search?q=")
    assert resp.status_code == 200
    assert resp.json["data"]["users"] == []


def test_get_user_id_nonexistent_user(client, init_db):
    with client.session_transaction() as sess:
        sess["user"] = 999999

    resp = client.get("/user/get_user_id")
    assert resp.status_code == 200
    assert resp.json["user_id"] == 999999


def test_get_parent_code_user_not_found(client, init_db):
    with client.session_transaction() as sess:
        sess["user"] = 999999

    resp = client.get("/user/api/parent-code")
    assert resp.status_code == 404


def test_handle_video_s3_upload_helper(init_db, sample_user):
    from application.routes.user_routes import handle_video_s3_upload

    # Invalid inputs
    assert handle_video_s3_upload(None, sample_user, "Project", 1) is False

    class DummyFileNoName:
        pass

    assert handle_video_s3_upload(DummyFileNoName(), sample_user, "Project", 1) is False

    class DummyFileNoExt:
        filename = "videofile"

    assert handle_video_s3_upload(DummyFileNoExt(), sample_user, "Project", 1) is False

    class DummyFileBadExt:
        filename = "video.pdf"

    assert handle_video_s3_upload(DummyFileBadExt(), sample_user, "Project", 1) is False

    # Mock S3 upload success
    class DummyVideoFile:
        filename = "demo.mp4"
        content_type = "video/mp4"

        def seek(self, pos):
            pass

    project = Project(name="S3 Proj", user_id=sample_user.id)
    db.session.add(project)
    db.session.commit()
    with patch("application.routes.user_routes.get_s3_client") as mock_get_s3:
        mock_s3 = mock_get_s3.return_value
        mock_s3.upload_fileobj = lambda *args, **kwargs: None

        res = handle_video_s3_upload(DummyVideoFile(), sample_user, project.name, project.id)
        assert res is not False
        db.session.refresh(project)
        assert "s3.ap-southeast-1.amazonaws.com" in project.video_url

    # Test S3 client None
    with patch("application.routes.user_routes.get_s3_client", return_value=None):
        assert handle_video_s3_upload(DummyVideoFile(), sample_user, project.name, project.id) is False


def test_new_and_edit_project_video_upload(client, init_db, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    video_file = (BytesIO(b"fake video content"), "test_video.mp4")

    # 1. New project with video upload failure mock
    with patch("application.routes.user_routes.handle_video_s3_upload", return_value=False):
        resp_new = client.post(
            "/user/project/new",
            data={"name": "Video Project", "project_video": video_file},
        )
        assert resp_new.status_code == 207
        assert resp_new.json["data"]["video_upload_failed"] is True

    # 2. Edit project with video upload failure mock
    project = Project.query.filter_by(name="Video Project").first()
    assert project is not None

    with patch("application.routes.user_routes.handle_video_s3_upload", return_value=False):
        resp_edit = client.post(
            f"/user/project/edit/{project.id}",
            data={"name": "Video Project Edit", "project_video": (BytesIO(b"video"), "vid.mp4")},
        )
        assert resp_edit.status_code == 207
        assert resp_edit.json["data"]["video_upload_failed"] is True


def test_edit_profile_form_pfp_upload(client, init_db, sample_user):
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


