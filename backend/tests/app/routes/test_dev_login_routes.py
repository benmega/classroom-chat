from unittest.mock import patch

import pytest
from application.extensions import db
from application.models.user import User


@pytest.fixture
def make_agent_users(init_db):
    admin = User(username="ben", role="admin", is_approved=True)
    admin.set_password("pass123")
    student = User(username="blossomstudent01", role="student", is_approved=True)
    student.set_password("pass123")
    parent = User(username="test_parent", role="parent", is_approved=True)
    parent.set_password("pass123")
    db.session.add_all([admin, student, parent])
    db.session.commit()
    return admin, student, parent


def test_dev_login_disabled_in_production(client, make_agent_users):
    with patch(
        "application.routes.dev_login_routes._is_dev_environment", return_value=False
    ):
        resp = client.get("/dev-login?role=admin")
        assert resp.status_code == 403
        assert "disabled in production" in resp.json["error"]

        resp = client.get("/api/dev-login?role=admin")
        assert resp.status_code == 403
        assert "disabled in production" in resp.json["error"]


def test_dev_login_non_local_blocked(client, make_agent_users):
    with patch(
        "application.routes.dev_login_routes._is_dev_environment", return_value=True
    ):
        resp = client.get(
            "/dev-login?role=admin", environ_overrides={"REMOTE_ADDR": "192.168.1.10"}
        )
        assert resp.status_code == 403
        assert "only accessible from localhost" in resp.json["error"]

        resp = client.get(
            "/api/dev-login?role=admin",
            environ_overrides={"REMOTE_ADDR": "192.168.1.10"},
        )
        assert resp.status_code == 403
        assert "only accessible from localhost" in resp.json["error"]


def test_dev_login_unknown_role(client, make_agent_users):
    with patch(
        "application.routes.dev_login_routes._is_dev_environment", return_value=True
    ):
        resp = client.get("/api/dev-login?role=unknown")
        assert resp.status_code == 400
        assert "Unknown role" in resp.json["error"]


def test_dev_login_missing_user_in_db(client, init_db):
    # No users seeded in DB
    with patch(
        "application.routes.dev_login_routes._is_dev_environment", return_value=True
    ):
        resp = client.get("/api/dev-login?role=admin")
        assert resp.status_code == 404
        assert "not found in the database" in resp.json["error"]


def test_dev_login_success_get_and_post(client, make_agent_users):
    _admin, _student, _parent = make_agent_users
    with patch(
        "application.routes.dev_login_routes._is_dev_environment", return_value=True
    ):
        resp = client.get("/api/dev-login?role=admin")
        assert resp.status_code == 200
        # Should render HTML template for GET /api/dev-login or /dev-login
        assert b"admin" in resp.data or b"5173" in resp.data

        # POST test
        resp = client.post("/api/dev-login", json={"role": "student"})
        assert resp.status_code == 200
        assert resp.json["success"] is True
        assert resp.json["role"] == "student"
        assert resp.json["user"]["username"] == "blossomstudent01"

        resp = client.get("/dev-login?role=parent")
        assert resp.status_code == 200


@pytest.mark.parametrize("url", ["/dev-login", "/api/dev-login"])
@pytest.mark.parametrize(
    "role, page",
    [
        ("admin", "admin/dashboard"),
        ("parent", "parent/dashboard"),
        ("student", "chat"),
    ],
)
def test_dev_login_get_redirects_to_role_page(client, make_agent_users, url, role, page):
    with patch(
        "application.routes.dev_login_routes._is_dev_environment", return_value=True
    ):
        resp = client.get(f"{url}?role={role}")

    assert resp.status_code == 200
    assert f'const redirectUrl = "http://localhost:5173/{page}";'.encode() in resp.data
    assert b"const error = null;" in resp.data


def test_dev_login_redirect_follows_the_vite_dev_url(client, make_agent_users):
    with (
        patch(
            "application.routes.dev_login_routes._is_dev_environment",
            return_value=True,
        ),
        patch("application.routes.dev_login_routes.VITE_DEV_URL", "http://localhost:5199"),
    ):
        resp = client.get("/dev-login?role=student")

    assert b'const redirectUrl = "http://localhost:5199/chat";' in resp.data


@pytest.mark.parametrize("role", [5, ["admin"], {"role": "admin"}, True, 1.5])
def test_dev_login_post_with_a_non_string_role_is_a_400(client, make_agent_users, role):
    with patch(
        "application.routes.dev_login_routes._is_dev_environment", return_value=True
    ):
        resp = client.post("/api/dev-login", json={"role": role})

    assert resp.status_code == 400
    assert "Unknown role" in resp.json["error"]
    with client.session_transaction() as sess:
        assert "user" not in sess


@pytest.mark.parametrize("body", [{}, {"role": None}, [1, 2], "student", 7, None])
def test_dev_login_post_without_a_usable_role_defaults_to_admin(
    client, make_agent_users, body
):
    """A body without a role (or not even an object) never raises; it means 'admin'."""
    with patch(
        "application.routes.dev_login_routes._is_dev_environment", return_value=True
    ):
        resp = client.post("/api/dev-login", json=body)

    assert resp.status_code == 200
    assert resp.json["role"] == "admin"


def test_dev_login_post_role_is_case_insensitive(client, make_agent_users):
    with patch(
        "application.routes.dev_login_routes._is_dev_environment", return_value=True
    ):
        resp = client.post("/api/dev-login", json={"role": "STUDENT"})

    assert resp.status_code == 200
    assert resp.json["role"] == "student"


@pytest.mark.parametrize("url", ["/dev-login", "/api/dev-login"])
def test_dev_login_get_establishes_session(client, make_agent_users, url):
    admin, _student, _parent = make_agent_users
    with patch(
        "application.routes.dev_login_routes._is_dev_environment", return_value=True
    ):
        resp = client.get(f"{url}?role=admin")

    assert resp.status_code == 200
    with client.session_transaction() as sess:
        assert sess["user"] == admin.id
        # Left over from the removed Conversation model; nothing reads it any more
        assert "conversation_id" not in sess


def test_browser_dev_login_shows_errors_on_the_page(client, make_agent_users):
    with patch(
        "application.routes.dev_login_routes._is_dev_environment", return_value=True
    ):
        resp = client.get("/dev-login?role=unknown")
        assert resp.status_code == 200
        assert b"Unknown role" in resp.data

    with client.session_transaction() as sess:
        assert "user" not in sess


def test_browser_dev_login_missing_user_shows_error_on_the_page(client, init_db):
    with patch(
        "application.routes.dev_login_routes._is_dev_environment", return_value=True
    ):
        resp = client.get("/dev-login?role=admin")

    assert resp.status_code == 200
    assert b"not found in DB" in resp.data
    with client.session_transaction() as sess:
        assert "user" not in sess
