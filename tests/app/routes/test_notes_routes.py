import io
from unittest.mock import patch

from application.models.note import Note

# Adjust this import path if your routes are located elsewhere
# Assuming the file provided in the prompt is at application/routes/notes.py
ROUTE_MODULE_PATH = "application.routes.notes"


def test_upload_note_no_auth(client):
    """Ensure unauthorized users cannot upload notes."""
    response = client.post("/upload_note")
    assert response.status_code == 401


def test_upload_note_no_file(logged_in_client):
    """Ensure a 400 error if no file is part of the request."""
    response = logged_in_client.post("/upload_note", data={})
    assert response.status_code == 400
    assert b"No file provided" in response.data


@patch(f"{ROUTE_MODULE_PATH}.s3_client")
def test_upload_note_success(mock_s3_client, logged_in_client, sample_user, init_db):
    """
    Test a successful upload flow:
    1. Mocks S3 upload to return success.
    2. Checks DB for new Note record.
    3. Checks API response.
    """
    # 1. Create a fake file in memory
    file_content = b"fake image bytes"
    file_name = "homework.png"
    data = {
        "note_image": (io.BytesIO(file_content), file_name)
    }

    # 2. Call the endpoint
    response = logged_in_client.post(
        "/upload_note",
        data=data,
        content_type="multipart/form-data"
    )

    # 3. Assertions
    assert response.status_code == 200
    assert response.json["success"] is True

    # Check that s3_client.upload_fileobj was actually called
    mock_s3_client.upload_fileobj.assert_called_once()

    # Verify the Database entry was created
    uploaded_note = Note.query.filter_by(user_id=sample_user.id).first()
    assert uploaded_note is not None
    # Check if key format matches 'notes/username/filename'
    assert f"notes/{sample_user.username}/" in uploaded_note.filename
    assert "homework.png" in uploaded_note.filename


@patch(f"{ROUTE_MODULE_PATH}.s3_client")
def test_upload_note_s3_failure(mock_s3_client, logged_in_client):
    """Test how the app handles an AWS S3 error (e.g. bucket unavailable)."""

    # Simulate an exception raising from boto3
    mock_s3_client.upload_fileobj.side_effect = Exception("AWS Down")

    data = {
        "note_image": (io.BytesIO(b"img"), "fail.png")
    }

    response = logged_in_client.post(
        "/upload_note",
        data=data,
        content_type="multipart/form-data"
    )

    # Should return 500 or appropriate error, but definitely not success
    assert response.status_code == 500
    assert response.json["error"] == "Upload failed"

    # Verify nothing was saved to DB
    assert Note.query.count() == 0