"""
File: test_general_routes.py
Type: py
Summary: Unit tests for general routes Flask routes.
"""

from unittest.mock import patch

from flask import url_for


# In dev/testing there is no Jinja index.html (React is served by Vite), so the
# catch-all returns a JSON 404 hint instead of raising TemplateNotFound (500).
def test_index_logged_in(client, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get(url_for("general.index"))

    assert response.status_code == 404
    assert response.is_json
    assert "5173" in response.json["hint"]


def test_index_not_logged_in(client):
    with client.application.app_context():
        response = client.get(url_for("general.index"))

        assert response.status_code == 404
        assert response.is_json


def test_index_serves_template_when_present(client):
    """In production index.html resolves to dist/index.html."""
    with patch(
        "application.utilities.spa.render_template", return_value="<html>Classroom Chat</html>"
    ):
        response = client.get("/some/react/route")
    assert response.status_code == 200
    assert b"Classroom Chat" in response.data


def test_dev_login_template_renders_values_as_json(client):
    """dev_login.html must keep rendering (used by the login_automation skill)."""
    from flask import render_template

    with client.application.test_request_context():
        html = render_template(
            "dev_login.html",
            role='x\\"',
            error=None,
            redirect_url="http://localhost:5173/",
        )
    assert "const error = null;" in html
    assert 'const redirectUrl = "http://localhost:5173/";' in html
