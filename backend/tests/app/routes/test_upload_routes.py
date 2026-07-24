"""
File: test_upload_routes.py
Type: py
Summary: Unit tests for the hardened upload routes: auth required,
         only validated images/PDFs accepted, no server paths leaked.
"""

import os

from flask import url_for

from application.config import Config

VALID_PNG = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAAC0lEQVR42mP8/w8AAwAB/0HPaSoAAAAASUVORK5CYII="
)


def test_upload_requires_login(client, test_app):
    """Anonymous uploads must be rejected."""
    with test_app.app_context():
        response = client.post(
            url_for("upload.upload_file"), json={"file": VALID_PNG}
        )
    assert response.status_code == 401


def test_upload_file_valid(logged_in_client, sample_image_data, test_app, setup_directories):
    """Test uploading a valid image while logged in."""
    with test_app.app_context():
        response = logged_in_client.post(
            url_for("upload.upload_file"), json={"file": sample_image_data}
        )

    assert response.status_code == 200
    assert b"File uploaded successfully" in response.data
    # The response exposes a relative URL, never a server filesystem path.
    url = response.json["url"]
    assert url.startswith("/upload/uploads/image/")
    assert "userData" not in url
    assert "file_path" not in response.json


def test_upload_file_invalid_json(logged_in_client, test_app):
    """Test uploading with invalid JSON data."""
    with test_app.app_context():
        response = logged_in_client.post(
            url_for("upload.upload_file"),
            data="invalid_data",
            content_type="application/json",
        )
    assert response.status_code == 400


def test_upload_file_no_data(logged_in_client):
    """Test uploading with no file data."""
    with logged_in_client.application.app_context():
        response = logged_in_client.post(url_for("upload.upload_file"), json={})

    assert response.status_code == 400
    assert response.json.get("error") == "No file data provided"


def test_upload_rejects_non_image_non_pdf(logged_in_client):
    """Arbitrary file types (zip, etc.) must be rejected."""
    with logged_in_client.application.app_context():
        zip_data = "data:application/zip;base64,UEsDBBQAAAAIAIfHlEpH2tqkZFt2xjOj7vGvg0wRs7m7n8=="
        response = logged_in_client.post(
            url_for("upload.upload_file"), json={"file": zip_data}
        )
    assert response.status_code == 415


def test_upload_rejects_fake_image(logged_in_client):
    """A payload claiming image/* but not decodable as an image is rejected."""
    with logged_in_client.application.app_context():
        import base64

        fake = "data:image/png;base64," + base64.b64encode(b"not an image").decode()
        response = logged_in_client.post(
            url_for("upload.upload_file"), json={"file": fake}
        )
    assert response.status_code == 400


def test_upload_rejects_fake_pdf(logged_in_client):
    """A payload claiming application/pdf without a PDF header is rejected."""
    with logged_in_client.application.app_context():
        import base64

        fake = "data:application/pdf;base64," + base64.b64encode(b"MZ not a pdf").decode()
        response = logged_in_client.post(
            url_for("upload.upload_file"), json={"file": fake}
        )
    assert response.status_code == 400


def test_upload_rejects_malformed_data_url(logged_in_client):
    with logged_in_client.application.app_context():
        response = logged_in_client.post(
            url_for("upload.upload_file"), json={"file": "garbage-without-comma"}
        )
    assert response.status_code == 400


def test_uploaded_file_requires_login(client):
    """Serving uploaded files requires an authenticated session."""
    with client.application.app_context():
        response = client.get(
            url_for("upload.uploaded_file", filename="anything.png")
        )
    # Browser requests are redirected to login; API requests get 401.
    assert response.status_code in (302, 401)


def test_uploaded_file(logged_in_client):
    """Test the file retrieval route."""
    with logged_in_client.application.app_context():
        filename = "file_20230101_120000.png"
        file_path = os.path.join(Config.UPLOAD_FOLDER, filename)

        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        with open(file_path, "wb") as f:
            f.write(b"fake image data")

        try:
            response = logged_in_client.get(
                url_for("upload.uploaded_file", filename=filename), buffered=True
            )
            assert response.status_code == 200
            assert response.data == b"fake image data"
        finally:
            if os.path.exists(file_path):
                os.remove(file_path)


def test_uploaded_file_not_found(logged_in_client):
    """Test accessing a file that doesn't exist."""
    with logged_in_client.application.app_context():
        response = logged_in_client.get(
            url_for("upload.uploaded_file", filename="nonexistent_file.png")
        )
    assert response.status_code == 404
