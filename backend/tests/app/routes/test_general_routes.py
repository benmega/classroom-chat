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


def test_react_achievements_page_is_not_an_api_path(client):
    """/achievements is a React route: only /api/* is answered with the JSON 404."""
    with patch(
        "application.utilities.spa.render_template", return_value="<html>Classroom Chat</html>"
    ):
        for path in ("/achievements", "/achievements/"):
            response = client.get(path)
            assert response.status_code == 200, path
            assert b"Classroom Chat" in response.data

        response = client.get("/api/achievements/nope")
    assert response.status_code == 404
    assert response.json["error"] == "Route not found"


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


def test_swagger_ui_is_not_served(client):
    """Swagger/OpenAPI was removed (#85): /api/docs falls through to the API 404."""
    for path in ("/api/docs", "/api/docs/", "/static/swagger.json"):
        response = client.get(path)
        assert response.status_code == 404, path
    assert not any(
        "swagger" in rule.endpoint.lower() or rule.rule.startswith("/api/docs")
        for rule in client.application.url_map.iter_rules()
    )


def test_index_appends_escaped_flash_messages(client):
    """flash() messages queued by server-side routes reach the React page."""
    with client.session_transaction() as sess:
        sess["_flashes"] = [("error", "Certificate <b>missing</b>")]
    with patch(
        "application.utilities.spa.render_template",
        return_value="<html><body>app</body></html>",
    ):
        response = client.get("/some/react/route")
    assert response.status_code == 200
    body = response.get_data(as_text=True)
    assert '<div class="toast-body">Certificate &lt;b&gt;missing&lt;/b&gt;</div></body>' in body
    assert "<b>missing</b>" not in body
