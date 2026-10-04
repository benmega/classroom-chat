"""
File: test_admin_authz_matrix.py
Type: py
Summary: Every admin-only endpoint, read from app.url_map, refuses anonymous (401) and
         non-admin (403) callers.

The rules are collected from the live URL map rather than listed by hand, so a route
added later without @admin_only is caught here without anyone remembering to add it.
Covered: everything under /api/admin (including /api/admin/crud and the sandbox
level-games routes) and the admin-only achievement routes (/api/achievements/add,
/edit/<id> and /admin/*).
"""

import re

import pytest
from tests.factories import UserFactory

_CONVERTER = re.compile(r"<(?:(\w+)(?:\([^)]*\))?:)?(\w+)>")
_SKIPPED_METHODS = {"HEAD", "OPTIONS"}


def _is_admin_path(rule):
    return (
        rule == "/api/admin"
        or rule.startswith("/api/admin/")
        or rule.startswith("/api/achievements/admin/")
        or rule == "/api/achievements/add"
        or rule.startswith("/api/achievements/edit/")
    )


def _concrete_path(rule):
    """Fill the URL converters with values that satisfy them (1 for <int:...>, 'x' otherwise)."""

    def fill(match):
        converter = match.group(1)
        if converter == "int":
            return "1"
        if converter == "float":
            return "1.5"
        return "x"

    return _CONVERTER.sub(fill, rule)


def _admin_endpoints(app):
    """(method, rule, concrete path) for every admin-only rule, one entry per method."""
    return sorted(
        (method, rule.rule, _concrete_path(rule.rule))
        for rule in app.url_map.iter_rules()
        if _is_admin_path(rule.rule)
        for method in rule.methods - _SKIPPED_METHODS
    )


def _unexpected(client, endpoints, expected_status, expected_error):
    """Endpoints that answered anything but the given JSON error."""
    offenders = []
    for method, rule, path in endpoints:
        response = client.open(path, method=method)
        body = response.get_json(silent=True) or {}
        if response.status_code != expected_status or body.get("error") != expected_error:
            offenders.append(f"{method} {rule} -> {response.status_code}")
    return offenders


def test_the_matrix_covers_the_admin_surface(test_app):
    endpoints = {(method, rule) for method, rule, _ in _admin_endpoints(test_app)}

    assert len(endpoints) >= 60
    for sentinel in [
        ("POST", "/api/admin/update_duck_multiplier"),
        ("POST", "/api/admin/trade_action"),
        ("POST", "/api/admin/advanced/purge-history"),
        ("POST", "/api/admin/crud/<resource>"),
        ("DELETE", "/api/admin/crud/<resource>/<id>"),
        ("PUT", "/api/admin/user/<int:user_id>"),
        ("POST", "/api/admin/user/<int:user_id>"),
        ("GET", "/api/admin/level-games"),
        ("POST", "/api/achievements/add"),
        ("PUT", "/api/achievements/edit/<int:id>"),
        ("GET", "/api/achievements/admin/certificates"),
        ("POST", "/api/achievements/admin/certificates/reviewed/all"),
    ]:
        assert sentinel in endpoints


def test_concrete_paths_satisfy_their_converters():
    assert _concrete_path("/api/admin/user/<int:user_id>/toggle-chat") == "/api/admin/user/1/toggle-chat"
    assert _concrete_path("/api/admin/crud/<resource>/<id>") == "/api/admin/crud/x/x"
    assert _concrete_path("/api/admin/classrooms") == "/api/admin/classrooms"


def test_anonymous_gets_401_on_every_admin_endpoint(test_app, client):
    offenders = _unexpected(client, _admin_endpoints(test_app), 401, "Authentication required")

    assert offenders == []


@pytest.mark.parametrize("role", ["student", "parent"])
def test_signed_in_non_admin_gets_403_on_every_admin_endpoint(test_app, client, init_db, role):
    user = UserFactory(role=role)
    with client.session_transaction() as sess:
        sess["user"] = user.id

    offenders = _unexpected(client, _admin_endpoints(test_app), 403, "Admin access required")

    assert offenders == []


def test_session_of_a_deleted_user_gets_403_on_every_admin_endpoint(test_app, client, init_db):
    with client.session_transaction() as sess:
        sess["user"] = 987654

    offenders = _unexpected(client, _admin_endpoints(test_app), 403, "Admin access required")

    assert offenders == []


def test_matrix_check_flags_an_endpoint_that_lets_a_non_admin_in(test_app, client, init_db):
    """The checker itself: an open endpoint is reported, a guarded one is not."""
    student = UserFactory(role="student")
    with client.session_transaction() as sess:
        sess["user"] = student.id

    # /api/achievements/all is public, so it must show up as an offender
    offenders = _unexpected(
        client,
        [
            ("GET", "/api/achievements/all", "/api/achievements/all"),
            ("GET", "/api/admin/users", "/api/admin/users"),
        ],
        403,
        "Admin access required",
    )

    assert offenders == ["GET /api/achievements/all -> 200"]
