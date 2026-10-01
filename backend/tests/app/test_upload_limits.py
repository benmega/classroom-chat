"""
Request body limits: a low global MAX_CONTENT_LENGTH, raised only for the
project video upload endpoints.

Upload endpoints and the body size each one legitimately needs:
  - user.new_project / user.edit_project   project video, up to 500 MB (raised limit)
  - submission.submit_work                 20 MB file (Config.SUBMISSION_MAX_BYTES)
  - upload.upload_file                     10 MB decoded base64 JSON (about 13.4 MB on the wire)
  - user profile picture / project image / wallpaper, project template image:
                                           5-10 MB images
  - notes upload / kiosk upload, achievement badge / certificate / template PDFs,
    sandbox level-games CSV                small files
Everything except the video endpoints fits under the global limit.
"""

from io import BytesIO
from unittest.mock import patch

import pytest
from application import create_app
from application.config import Config, TestingConfig
from application.extensions import db, scheduler, socketio
from application.models.project import Project
from application.routes.upload_routes import MAX_UPLOAD_BYTES

OVER_GLOBAL_LIMIT = Config.MAX_CONTENT_LENGTH + 1
VIDEO_START = "application.routes.user_routes.start_video_upload_thread"


def _big_video_form(extra=None):
    data = {"project_video": (BytesIO(b"\0" * OVER_GLOBAL_LIMIT), "big.mp4")}
    data.update(extra or {})
    return data


def _oversized_login_body():
    return {"data": b"x" * OVER_GLOBAL_LIMIT, "content_type": "application/json"}


# ---- Configuration -----------------------------------------------------------


def test_large_upload_endpoints_are_real_endpoints(test_app):
    endpoints = {rule.endpoint for rule in test_app.url_map.iter_rules()}

    assert set(test_app.config["LARGE_UPLOAD_ENDPOINTS"]) <= endpoints
    assert test_app.config["MAX_CONTENT_LENGTH"] == Config.MAX_CONTENT_LENGTH


def test_ordinary_upload_caps_fit_under_the_global_limit():
    base64_on_the_wire = MAX_UPLOAD_BYTES * 4 // 3 + 4096
    for needed in (
        Config.SUBMISSION_MAX_BYTES + 4096,  # multipart overhead
        base64_on_the_wire,
        10 * 1024 * 1024 + 4096,  # largest image upload
    ):
        assert needed < Config.MAX_CONTENT_LENGTH


def test_limit_is_raised_before_the_csrf_check(test_app):
    """Flask-WTF parses the form (and the body) in its own before_request hook."""
    names = [f.__name__ for f in test_app.before_request_funcs[None]]

    assert "allow_large_uploads" in names
    assert "csrf_protect" in names
    assert names.index("allow_large_uploads") < names.index("csrf_protect")


# ---- Behaviour (CSRF off, as in the normal test app) --------------------------


def test_oversized_body_is_rejected_on_an_ordinary_route(client):
    response = client.post("/user/login", **_oversized_login_body())

    assert response.status_code == 413
    assert response.get_json() == {"error": "Request body too large"}


def test_oversized_multipart_is_rejected_on_an_ordinary_upload_route(logged_in_client):
    response = logged_in_client.post(
        "/api/submissions",
        data={"file": (BytesIO(b"\0" * OVER_GLOBAL_LIMIT), "big.txt")},
    )

    assert response.status_code == 413


def test_new_project_accepts_a_video_above_the_global_limit(logged_in_client):
    with patch(VIDEO_START, return_value=True) as start_video:
        response = logged_in_client.post(
            "/user/project/new", data=_big_video_form({"name": "Big Video"})
        )

    assert response.status_code == 200
    assert response.get_json()["data"]["video_processing"] is True
    start_video.assert_called_once()


def test_edit_project_accepts_a_video_above_the_global_limit(logged_in_client, sample_user):
    project = Project(name="Edit Me", user_id=sample_user.id)
    db.session.add(project)
    db.session.commit()

    with patch(VIDEO_START, return_value=True) as start_video:
        response = logged_in_client.post(
            f"/user/project/edit/{project.id}",
            data=_big_video_form({"name": "Edit Me"}),
        )

    assert response.status_code == 200
    assert response.get_json()["data"]["video_processing"] is True
    start_video.assert_called_once()


def test_video_endpoints_still_have_an_upper_limit(logged_in_client, test_app, monkeypatch):
    monkeypatch.setitem(
        test_app.config, "LARGE_UPLOAD_MAX_CONTENT_LENGTH", OVER_GLOBAL_LIMIT + 1024
    )
    form = {"name": "Too Big", "project_video": (BytesIO(b"\0" * (OVER_GLOBAL_LIMIT + 2048)), "big.mp4")}

    with patch(VIDEO_START, return_value=True) as start_video:
        response = logged_in_client.post("/user/project/new", data=form)

    assert response.status_code == 413
    start_video.assert_not_called()


def test_limit_applies_per_request(logged_in_client):
    """Raising the limit for one request must not leak into the next one."""
    with patch(VIDEO_START, return_value=True):
        assert logged_in_client.post("/user/project/new", data=_big_video_form({"name": "A"})).status_code == 200

    response = logged_in_client.post("/api/submissions", data={"file": (BytesIO(b"\0" * OVER_GLOBAL_LIMIT), "b.txt")})
    assert response.status_code == 413


def test_a_maximum_size_submission_is_still_accepted(logged_in_client, monkeypatch, tmp_path):
    monkeypatch.setattr(Config, "UPLOAD_FOLDER", str(tmp_path))
    payload = BytesIO(b"\0" * Config.SUBMISSION_MAX_BYTES)

    response = logged_in_client.post("/api/submissions", data={"file": (payload, "essay.txt")})

    assert response.status_code == 201


# ---- Behaviour with CSRF protection on (as in production) ---------------------


@pytest.fixture(scope="module")
def csrf_client():
    class CsrfConfig(TestingConfig):
        WTF_CSRF_ENABLED = True

    from application import tasks

    previous_app = tasks._app_instance
    with patch.object(scheduler, "start"), patch.object(socketio, "init_app"):
        app = create_app(CsrfConfig)
    tasks.set_app_instance(previous_app)
    return app.test_client()


def test_csrf_check_rejects_oversized_bodies_on_ordinary_routes(csrf_client):
    response = csrf_client.post(
        "/api/submissions",
        data={"file": (BytesIO(b"\0" * OVER_GLOBAL_LIMIT), "big.txt")},
    )

    assert response.status_code == 413


def test_csrf_check_does_not_trip_the_global_limit_on_video_endpoints(csrf_client):
    """The CSRF hook reads request.form first; the raised limit must already be in force."""
    for url in ("/user/project/new", "/user/project/edit/1"):
        response = csrf_client.post(url, data=_big_video_form({"name": "x"}))

        # Rejected for the missing CSRF token (400), not for the body size (413).
        assert response.status_code == 400, url
