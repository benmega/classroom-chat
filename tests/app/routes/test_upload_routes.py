"""
File: test_upload_routes.py
Type: py
Summary: Unit tests for upload routes Flask routes.
"""

import os

from flask import url_for

from application.config import Config


def test_upload_file_valid(client, sample_image_data, test_app, setup_directories):
    """Test uploading a valid file (image)."""
    json_data = {"file": sample_image_data}

    with test_app.app_context():
        response = client.post(url_for("upload.upload_file"), json=json_data)

    assert response.status_code == 200
    assert b"File uploaded successfully" in response.data
    assert "userData/image/" in response.json["file_path"]


def test_upload_file_invalid_json(client, test_app):
    """Test uploading with invalid JSON data."""
    with test_app.app_context():
        response = client.post(
            url_for("upload.upload_file"),
            data="invalid_data",
            content_type="application/json",
        )
    assert response.status_code == 400


def test_upload_file_no_data(client):
    with client.application.app_context():
        """Test uploading with no file data."""
        json_data = {}

        response = client.post(url_for("upload.upload_file"), json=json_data)

        assert response.status_code == 400
        assert b'{"error":"Invalid JSON data"}' in response.data


def test_upload_file_multiple_file_types(client):
    with client.application.app_context():
        """Test uploading various file types and ensure they are handled correctly."""

        # Test data for different file types
        file_types = {
            "image/png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAAC0lEQVR42mP8/w8AAwAB/0HPaSoAAAAASUVORK5CYII=",
            "application/pdf": "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9EZWNvZGVQYXJtcygkRlRQQSkgL1R5cGUvWC9TdWJ0eXBlL0ltYWdlL0xlbmd0aCAxNi9CaXRzUGVyQ29tcG9uZW50IDggL0NvbG9yU3BhY2UvRGV2aWNlUkdCIGdycmlkL0ZpbHRlci9BbC1DIC9XaWR0aCAxNi9IZWlnaHQgOS9CYXNlRm9udC9UaW1lcy1Sb21hbi9NYXhXaWR0aCAxNi9NYXhIZWlnaHQgOS9NYXhWZXJzaW9uIC9Bc2NpSGVpZ2h0LzExL0RlY29kZUNvcnJlY3QgL1lFU0NvbnRyb2wgL1Blcm1zL1JHQj4+CmVuZG9iago=",
            "application/zip": "data:application/zip;base64,UEsDBBQAAAAIAIfHlEpH2tqkZFt2xjOj7vGvg0wRs7m7n8==",
        }

        for mime_type, fake_data in file_types.items():
            json_data = {"file": fake_data}

            response = client.post(url_for("upload.upload_file"), json=json_data)

            assert response.status_code == 200, f"Failed for {mime_type}"
            assert (
                b"File uploaded successfully" in response.data
            ), f"Unexpected response for {mime_type}"


def test_uploaded_file(client):
    """Test the file retrieval route."""
    with client.application.app_context():
        filename = "file_20230101_120000.png"
        file_path = os.path.join(Config.UPLOAD_FOLDER, filename)

        # Ensure the directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        # Create a fake file
        with open(file_path, "wb") as f:
            f.write(b"fake image data")

        try:
            # Access the uploaded file with buffering enabled
            response = client.get(
                url_for("upload.uploaded_file", filename=filename), buffered=True
            )
            assert response.status_code == 200
            assert response.data == b"fake image data"
        finally:
            if os.path.exists(file_path):
                os.remove(file_path)


def test_uploaded_file_not_found(client):
    with client.application.app_context():
        """Test accessing a file that doesn't exist."""
        response = client.get(
            url_for("upload.uploaded_file", filename="nonexistent_file.png")
        )
        assert response.status_code == 404
