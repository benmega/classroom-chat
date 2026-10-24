"""
CSRF protection and the csrf_token_v2 cookie as production runs them: ProductionConfig
over https (TestingConfig turns CSRF off, so nothing else exercises this).
"""

import os
from http.cookies import SimpleCookie
from unittest.mock import patch

import pytest
from application import create_app, tasks
from application.config import ProductionConfig
from application.extensions import scheduler, socketio

BASE_URL = "https://api-blossom.benmega.com"
CSRF_COOKIE = "csrf_token_v2"
# A POST that needs no login: once the CSRF check passes it answers 401.
UNSAFE_URL = "/api/session/heartbeat"


class ProdCsrfConfig(ProductionConfig):
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


@pytest.fixture(scope="module")
def prod_app():
    previous_app = tasks._app_instance
    with (
        patch.object(scheduler, "start"),
        patch.object(socketio, "init_app"),
        patch.dict(os.environ, {"FLASK_ENV": "production"}),
    ):
        app = create_app(ProdCsrfConfig)
    tasks.set_app_instance(previous_app)
    return app


@pytest.fixture
def prod_client(prod_app):
    return prod_app.test_client()


def _csrf_cookie(response):
    """The csrf_token_v2 cookie a response sets, parsed."""
    headers = [h for h in response.headers.getlist("Set-Cookie") if h.startswith(f"{CSRF_COOKIE}=")]
    assert len(headers) == 1
    jar = SimpleCookie()
    jar.load(headers[0])
    return jar[CSRF_COOKIE]


def _token_from(client):
    """Visit the app as the frontend does, then read the token it was handed."""
    return _csrf_cookie(client.get("/server/health", base_url=BASE_URL)).value


def test_csrf_cookie_is_shared_with_the_frontend_over_https_only(prod_client):
    morsel = _csrf_cookie(prod_client.get("/server/health", base_url=BASE_URL))

    assert morsel.value
    # Readable by the SPA on blossom.benmega.com, which axios copies into X-CSRFToken.
    # Werkzeug writes the configured ".benmega.com" without the dot; browsers treat
    # both as "benmega.com and its subdomains".
    assert morsel["domain"].lstrip(".") == "benmega.com"
    assert not morsel["httponly"]
    assert morsel["secure"]
    assert morsel["samesite"] == "Lax"
    assert morsel["path"] == "/"


def test_unsafe_request_without_a_token_is_rejected(prod_client):
    response = prod_client.post(UNSAFE_URL, base_url=BASE_URL)

    assert response.status_code == 400
    assert "CSRF token is missing" in response.get_data(as_text=True)


def test_unsafe_request_with_a_token_that_was_not_issued_is_rejected(prod_client):
    _token_from(prod_client)

    response = prod_client.post(UNSAFE_URL, base_url=BASE_URL, headers={"X-CSRFToken": "forged"})

    assert response.status_code == 400
    assert "CSRF token is invalid" in response.get_data(as_text=True)


def test_unsafe_request_with_the_issued_token_is_accepted(prod_client):
    token = _token_from(prod_client)

    response = prod_client.post(UNSAFE_URL, base_url=BASE_URL, headers={"X-CSRFToken": token})

    # Past the CSRF check, the view itself answers: nobody is logged in
    assert response.status_code == 401
    assert response.get_json()["error"] == "Not authenticated"


def test_a_token_only_works_with_the_session_it_was_issued_for(prod_app):
    token = _token_from(prod_app.test_client())

    response = prod_app.test_client().post(UNSAFE_URL, base_url=BASE_URL, headers={"X-CSRFToken": token})

    assert response.status_code == 400
