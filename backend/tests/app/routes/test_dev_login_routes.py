import pytest
import os
from unittest.mock import patch

@pytest.fixture
def dev_login_app(app):
    # Setup test app for dev login
    app.config["DEBUG"] = True
    os.environ["FLASK_ENV"] = "development"
    yield app
    # Teardown
    os.environ["FLASK_ENV"] = "testing"

def test_browser_dev_login_success(client, dev_login_app, init_db):
    from application.models.user import User
    from application.extensions import db
    user = User(username="ben", email="ben@example.com", role="admin")
    user.set_password("pass")
    db.session.add(user)
    db.session.commit()

    with patch("application.routes.dev_login_routes._is_local_request", return_value=True):
        response = client.get("/dev-login?role=admin")
        assert response.status_code == 200
        assert b"redirectUrl" in response.data or b"ben" in response.data or b"dev-login" in response.data.lower()

def test_browser_dev_login_production(client, app):
    app.config["DEBUG"] = False
    os.environ["FLASK_ENV"] = "production"
    
    response = client.get("/dev-login")
    assert response.status_code == 403
    assert response.json["error"] == "dev-login is disabled in production"

def test_browser_dev_login_not_local(client, dev_login_app):
    with patch("application.routes.dev_login_routes._is_local_request", return_value=False):
        response = client.get("/dev-login")
        assert response.status_code == 403

def test_browser_dev_login_unknown_role(client, dev_login_app):
    with patch("application.routes.dev_login_routes._is_local_request", return_value=True):
        response = client.get("/dev-login?role=unknown")
        assert response.status_code == 200
        assert b"Unknown role" in response.data

def test_browser_dev_login_user_not_found(client, dev_login_app, init_db):
    with patch("application.routes.dev_login_routes._is_local_request", return_value=True):
        response = client.get("/dev-login?role=admin")
        assert response.status_code == 200
        assert b"Agent user" in response.data and b"not found" in response.data

def test_agent_dev_login_post_success(client, dev_login_app, init_db):
    from application.models.user import User
    from application.extensions import db
    user = User(username="test_parent", email="parent@example.com", role="parent")
    user.set_password("pass")
    db.session.add(user)
    db.session.commit()

    with patch("application.routes.dev_login_routes._is_local_request", return_value=True):
        response = client.post("/api/dev-login", json={"role": "parent"})
        assert response.status_code == 200
        assert response.json["success"] is True
        assert response.json["role"] == "parent"

def test_agent_dev_login_get_success(client, dev_login_app, init_db):
    from application.models.user import User
    from application.extensions import db
    user = User(username="blossomstudent01", email="student@example.com", role="student")
    user.set_password("pass")
    db.session.add(user)
    db.session.commit()

    with patch("application.routes.dev_login_routes._is_local_request", return_value=True):
        response = client.get("/api/dev-login?role=student")
        assert response.status_code == 200
        assert b"redirectUrl" in response.data or b"blossomstudent01" in response.data

def test_agent_dev_login_production(client, app):
    os.environ["FLASK_ENV"] = "production"
    response = client.post("/api/dev-login", json={"role": "admin"})
    assert response.status_code == 403

def test_agent_dev_login_not_local(client, dev_login_app):
    with patch("application.routes.dev_login_routes._is_local_request", return_value=False):
        response = client.post("/api/dev-login", json={"role": "admin"})
        assert response.status_code == 403

def test_agent_dev_login_unknown_role(client, dev_login_app):
    with patch("application.routes.dev_login_routes._is_local_request", return_value=True):
        response = client.post("/api/dev-login", json={"role": "unknown"})
        assert response.status_code == 400

def test_agent_dev_login_user_not_found(client, dev_login_app, init_db):
    with patch("application.routes.dev_login_routes._is_local_request", return_value=True):
        response = client.post("/api/dev-login", json={"role": "admin"})
        assert response.status_code == 404

def test_is_local_request(app):
    with app.test_request_context(environ_base={'REMOTE_ADDR': '127.0.0.1'}):
        from application.routes.dev_login_routes import _is_local_request
        assert _is_local_request() is True

    with app.test_request_context(environ_base={'REMOTE_ADDR': '192.168.1.1'}):
        from application.routes.dev_login_routes import _is_local_request
        assert _is_local_request() is False
