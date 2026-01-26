import io
from unittest.mock import patch

from application.models.note import Note
from application.models.user import User

# Ensure this matches your file structure
ROUTE_MODULE_PATH = "application.routes.notes_routes"

def test_upload_note_no_auth(client):
    """Ensure unauthorized users cannot upload notes."""
    # UPDATED URL: /notes/upload_note
    response = client.post("/notes/upload_note")
    assert response.status_code == 401

def test_upload_note_no_file(logged_in_client):
    """Ensure a 400 error if no file is part of the request."""
    # UPDATED URL: /notes/upload_note
    response = logged_in_client.post("/notes/upload_note", data={})
    assert response.status_code == 400
    assert b"No file provided" in response.data

@patch(f"{ROUTE_MODULE_PATH}.get_s3_client")
def test_upload_note_success(mock_get_s3_client, logged_in_client, sample_user, init_db):
    mock_s3_client = mock_get_s3_client.return_value
    mock_s3_client.upload_fileobj.return_value = None

    # 1. Ensure user exists in DB
    db_user = User.query.get(sample_user.id)
    if not db_user:
        init_db.session.add(sample_user)
        init_db.session.commit()

    # 2. CRITICAL FIX: Update session to use ID instead of Username
    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_user.id  # <--- This fixes the lookup error

    file_content = b"fake image bytes"
    file_name = "homework.png"
    data = {
        "note_image": (io.BytesIO(file_content), file_name)
    }

    response = logged_in_client.post(
        "/notes/upload_note",
        data=data,
        content_type="multipart/form-data"
    )

    assert response.status_code == 200, f"Response: {response.data}"
    assert response.json["success"] is True

    mock_s3_client.upload_fileobj.assert_called_once()
    uploaded_note = Note.query.filter_by(user_id=sample_user.id).first()
    assert uploaded_note is not None
    assert f"notes/{sample_user.username}/" in uploaded_note.filename

@patch(f"{ROUTE_MODULE_PATH}.get_s3_client")
def test_upload_note_s3_failure(mock_get_s3_client, logged_in_client, sample_user, init_db):
    mock_s3_client = mock_get_s3_client.return_value
    mock_s3_client.upload_fileobj.side_effect = Exception("AWS Down")

    # 1. Ensure user exists in DB
    db_user = User.query.get(sample_user.id)
    if not db_user:
        init_db.session.add(sample_user)
        init_db.session.commit()

    # 2. CRITICAL FIX: Update session to use ID
    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    data = {
        "note_image": (io.BytesIO(b"img"), "fail.png")
    }

    response = logged_in_client.post(
        "/notes/upload_note",
        data=data,
        content_type="multipart/form-data"
    )

    assert response.status_code == 500
    assert response.json["error"] == "Upload failed"