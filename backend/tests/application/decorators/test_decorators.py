"""
File: test_decorators.py
Type: py
Summary: Unit tests for @require_login and for how the three decorators combine.

@admin_only and @api_response have their own files (test_admin_required.py,
test_api_response.py); this one covers what those leave out: the login guard,
argument and metadata pass-through, and the guard-outside-api_response order the
routes use.
"""

import pytest
from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response
from application.decorators.login_required import require_login
from flask import session
from tests.factories import UserFactory

ACCEPT_HEADERS = [
    pytest.param(None, id="no-accept"),
    pytest.param("text/html", id="html"),
    pytest.param("application/json", id="json"),
]

LOGIN_REQUIRED = {"error": "Authentication required. Please log in."}


def _headers(accept):
    return {"Accept": accept} if accept else {}


def _call(test_app, guarded, user_id=None, accept=None, *args, **kwargs):
    """Call the guarded view in a request context, optionally with a session user."""
    with test_app.test_request_context("/anywhere", headers=_headers(accept)):
        if user_id is not None:
            session["user"] = user_id
        return guarded(*args, **kwargs)


def _recording_view():
    calls = []

    def view(*args, **kwargs):
        calls.append((args, kwargs))
        return "view result"

    return view, calls


# --- require_login ---------------------------------------------------------------


@pytest.mark.parametrize("accept", ACCEPT_HEADERS)
def test_require_login_rejects_anonymous_with_json_401(test_app, accept):
    view, calls = _recording_view()

    response, status = _call(test_app, require_login(view), accept=accept)

    assert status == 401
    assert response.is_json
    assert response.get_json() == LOGIN_REQUIRED
    assert calls == []


@pytest.mark.parametrize("empty_id", [None, 0, ""])
def test_require_login_rejects_an_empty_session_user(test_app, empty_id):
    view, calls = _recording_view()

    with test_app.test_request_context("/anywhere"):
        session["user"] = empty_id
        response, status = require_login(view)()

    assert status == 401
    assert response.get_json() == LOGIN_REQUIRED
    assert calls == []


@pytest.mark.parametrize("accept", ACCEPT_HEADERS)
def test_require_login_lets_a_logged_in_user_through(test_app, accept):
    view, calls = _recording_view()

    result = _call(test_app, require_login(view), user_id=1, accept=accept)

    assert result == "view result"
    assert len(calls) == 1


def test_require_login_forwards_arguments_and_the_return_value(test_app):
    seen = {}

    def view(item_id, *, mode):
        seen.update(item_id=item_id, mode=mode)
        return {"item": item_id}, 202

    result = _call(test_app, require_login(view), 7, None, 42, mode="full")

    assert result == ({"item": 42}, 202)
    assert seen == {"item_id": 42, "mode": "full"}


def test_require_login_keeps_the_view_metadata(test_app):
    def my_view():
        """Docstring of the view."""

    wrapped = require_login(my_view)

    assert wrapped.__name__ == "my_view"
    assert wrapped.__doc__ == "Docstring of the view."


def test_require_login_does_not_demand_the_admin_role(test_app, init_db, sample_user):
    view, calls = _recording_view()

    assert _call(test_app, require_login(view), user_id=sample_user.id) == "view result"
    assert len(calls) == 1


# --- admin_only: pass-through and roles ----------------------------------------------


def test_admin_only_forwards_arguments_and_the_return_value(test_app, init_db, sample_admin):
    seen = {}

    def view(item_id, *, mode):
        seen.update(item_id=item_id, mode=mode)
        return {"item": item_id}, 201

    result = _call(test_app, admin_only(view), sample_admin.id, None, 9, mode="x")

    assert result == ({"item": 9}, 201)
    assert seen == {"item_id": 9, "mode": "x"}


def test_admin_only_keeps_the_view_metadata(test_app):
    def my_admin_view():
        """Docstring of the admin view."""

    wrapped = admin_only(my_admin_view)

    assert wrapped.__name__ == "my_admin_view"
    assert wrapped.__doc__ == "Docstring of the admin view."


def test_admin_only_denies_a_parent_and_never_calls_the_view(test_app, init_db):
    parent = UserFactory(role="parent")
    view, calls = _recording_view()

    response, status = _call(test_app, admin_only(view), parent.id)

    assert status == 403
    assert response.get_json() == {"error": "Admin access required"}
    assert calls == []


def test_admin_only_does_not_call_the_view_for_anonymous_or_student(test_app, init_db, sample_user):
    view, calls = _recording_view()
    guarded = admin_only(view)

    assert _call(test_app, guarded)[1] == 401
    assert _call(test_app, guarded, user_id=sample_user.id)[1] == 403
    assert calls == []


def test_admin_only_follows_a_demotion_made_after_login(test_app, init_db, sample_admin):
    """The role is read on every call, not frozen into the session at login."""
    view, calls = _recording_view()
    guarded = admin_only(view)
    assert _call(test_app, guarded, user_id=sample_admin.id) == "view result"

    sample_admin.role = "student"
    init_db.session.commit()

    response, status = _call(test_app, guarded, user_id=sample_admin.id)
    assert status == 403
    assert response.get_json() == {"error": "Admin access required"}
    assert len(calls) == 1


# --- the order the routes use: guard outside, api_response inside ----------------------


def _guarded_api_view(guard):
    @guard
    @api_response
    def view():
        return {"ok": True}

    return view


def test_guard_answers_before_api_response_so_errors_are_not_enveloped(test_app, init_db, sample_user):
    admin_view = _guarded_api_view(admin_only)
    login_view = _guarded_api_view(require_login)

    response, status = _call(test_app, admin_view)
    assert (status, response.get_json()) == (401, {"error": "Authentication required"})

    response, status = _call(test_app, admin_view, user_id=sample_user.id)
    assert (status, response.get_json()) == (403, {"error": "Admin access required"})

    response, status = _call(test_app, login_view)
    assert (status, response.get_json()) == (401, LOGIN_REQUIRED)


def test_guarded_api_view_returns_the_envelope_once_the_guard_passes(test_app, init_db, sample_admin):
    for guard in (admin_only, require_login):
        response, status = _call(test_app, _guarded_api_view(guard), user_id=sample_admin.id)

        assert status == 200
        assert response.get_json() == {"status": "success", "data": {"ok": True}, "error": None}


def test_guarded_api_view_hides_an_unexpected_error_from_the_client(test_app, init_db, sample_admin):
    @admin_only
    @api_response
    def view():
        raise RuntimeError("secret detail")

    response, status = _call(test_app, view, user_id=sample_admin.id)

    assert status == 500
    assert response.get_json() == {"status": "error", "data": None, "error": "Internal server error"}
