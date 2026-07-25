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
