"""
File: test_admin_required.py
Type: py
Summary: Unit tests for the @admin_only decorator: JSON 401/403, whatever the client accepts.
"""

import pytest
from application.decorators.admin_required import admin_only
from flask import session

ACCEPT_HEADERS = [
    pytest.param(None, id="no-accept"),
    pytest.param("text/html", id="html"),
    pytest.param("application/json", id="json"),
    pytest.param("*/*", id="any"),
]


def _headers(accept):
    return {"Accept": accept} if accept else {}


def _guarded_view(test_app, user_id, accept):
    """Call a view guarded by admin_only as the given session user."""
    with test_app.test_request_context("/not-under-api", headers=_headers(accept)):
        if user_id is not None:
            session["user"] = user_id
        return admin_only(lambda: "admin content")()


@pytest.mark.parametrize("accept", ACCEPT_HEADERS)
def test_anonymous_request_gets_401_json(test_app, init_db, accept):
    response, status = _guarded_view(test_app, None, accept)

    assert status == 401
    assert response.get_json() == {"error": "Authentication required"}


@pytest.mark.parametrize("accept", ACCEPT_HEADERS)
def test_non_admin_gets_403_json(test_app, init_db, sample_user, accept):
    response, status = _guarded_view(test_app, sample_user.id, accept)

    assert status == 403
    assert response.get_json() == {"error": "Admin access required"}


@pytest.mark.parametrize("accept", ACCEPT_HEADERS)
def test_unknown_session_user_gets_403_json(test_app, init_db, accept):
    response, status = _guarded_view(test_app, 999999, accept)

    assert status == 403
    assert response.get_json() == {"error": "Admin access required"}


@pytest.mark.parametrize("accept", ACCEPT_HEADERS)
def test_admin_reaches_the_view(test_app, init_db, sample_admin, accept):
    assert _guarded_view(test_app, sample_admin.id, accept) == "admin content"


@pytest.mark.parametrize("accept", ACCEPT_HEADERS)
def test_admin_route_answers_with_json_not_the_spa_page(client, init_db, sample_user, accept):
    anonymous = client.get("/api/admin/crud/user", headers=_headers(accept))
    assert anonymous.status_code == 401
    assert anonymous.is_json

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
    non_admin = client.get("/api/admin/crud/user", headers=_headers(accept))
    assert non_admin.status_code == 403
    assert non_admin.is_json
