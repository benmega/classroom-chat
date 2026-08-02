import io
from unittest.mock import patch

from application.extensions import db
from application.models.note import Note
from application.models.user import User

ROUTE_MODULE_PATH = "application.routes.notes_routes"


def test_upload_note_no_auth(client):
    """Ensure unauthorized users cannot upload notes."""
    # UPDATED URL: /notes/upload
    response = client.post("/notes/upload")
    assert response.status_code == 401


def test_upload_note_no_file(logged_in_client):
    """Ensure a 400 error if no file is part of the request."""
    # UPDATED URL: /notes/upload
    response = logged_in_client.post("/notes/upload", data={})
    assert response.status_code == 400
    assert b"No file provided" in response.data


@patch(f"{ROUTE_MODULE_PATH}.get_s3_client")
def test_upload_note_success(
    mock_get_s3_client, logged_in_client, sample_user, init_db
):
    mock_s3_client = mock_get_s3_client.return_value
    mock_s3_client.upload_fileobj.return_value = None
    logged_in_client.application.config["USE_S3"] = True

    db_user = db.session.get(User, sample_user.id)
    if not db_user:
        init_db.session.add(sample_user)
        init_db.session.commit()

    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_user.id  # <--- This fixes the lookup error

    file_content = b"fake image bytes"
    file_name = "homework.png"
    data = {"note_image": (io.BytesIO(file_content), file_name)}

    response = logged_in_client.post(
        "/notes/upload", data=data, content_type="multipart/form-data"
    )

    assert response.status_code == 200, f"Response: {response.data}"
    assert response.json["status"] == "success"

    mock_s3_client.upload_fileobj.assert_called_once()
    uploaded_note = Note.query.filter_by(user_id=sample_user.id).first()
    assert uploaded_note is not None
    assert f"notes/{sample_user.username}/" in uploaded_note.filename


@patch(f"{ROUTE_MODULE_PATH}.get_s3_client")
def test_upload_note_s3_failure(
    mock_get_s3_client, logged_in_client, sample_user, init_db
):
    mock_s3_client = mock_get_s3_client.return_value
    mock_s3_client.upload_fileobj.side_effect = Exception("AWS Down")
    logged_in_client.application.config["USE_S3"] = True

    db_user = db.session.get(User, sample_user.id)
    if not db_user:
        init_db.session.add(sample_user)
        init_db.session.commit()

    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    data = {"note_image": (io.BytesIO(b"img"), "fail.png")}

    with patch(
        "application.routes.notes_routes.handle_local_note_upload", return_value=None
    ):
        response = logged_in_client.post(
            "/notes/upload", data=data, content_type="multipart/form-data"
        )

    assert response.status_code == 500
    assert response.json["error"] == "Upload failed"


def test_upload_note_local_success(logged_in_client, sample_user, init_db):
    logged_in_client.application.config["USE_S3"] = False

    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    data = {"note_image": (io.BytesIO(b"local note bytes"), "test_local_note.png")}

    response = logged_in_client.post(
        "/notes/upload", data=data, content_type="multipart/form-data"
    )
    assert response.status_code == 200
    assert response.json["status"] == "success"

    note_id = response.json["note"]["id"]
    note_url = response.json["note"]["url"]

    filename = note_url.split("/")[-1]
    resp_view = logged_in_client.get(f"/notes/view/{filename}")
    assert resp_view.status_code == 200
    assert resp_view.data == b"local note bytes"
    resp_view.close()  # Release file lock on Windows

    # Unauthorized delete
    # Let's log in as another user to test unauthorized delete:
    from application.models.user import User

    other_user = User(username="other_note_user", is_approved=True)
    other_user.set_password("pass123")
    db.session.add(other_user)
    db.session.commit()

    with logged_in_client.session_transaction() as sess:
        sess["user"] = other_user.id

    resp_del_unauth = logged_in_client.post(f"/notes/delete/{note_id}")
    assert resp_del_unauth.status_code == 403

    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    resp_del = logged_in_client.post(f"/notes/delete/{note_id}")
    assert resp_del.status_code == 200
    assert resp_del.json["status"] == "success"


@patch(f"{ROUTE_MODULE_PATH}.get_s3_client")
def test_delete_note_s3(mock_get_s3_client, logged_in_client, sample_user, init_db):
    mock_s3 = mock_get_s3_client.return_value
    mock_s3.delete_object.return_value = {}

    note = Note(user_id=sample_user.id, filename="notes/user/s3_note.png")
    db.session.add(note)
    db.session.commit()

    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    resp = logged_in_client.post(f"/notes/delete/{note.id}")
    assert resp.status_code == 200
    assert resp.json["status"] == "success"
    mock_s3.delete_object.assert_called_once()


def test_upload_note_field_name_note(logged_in_client, sample_user):
    logged_in_client.application.config["USE_S3"] = False
    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    data = {"note": (io.BytesIO(b"content using note field"), "field_note.png")}
    response = logged_in_client.post(
        "/notes/upload", data=data, content_type="multipart/form-data"
    )
    assert response.status_code == 200
    assert response.json["status"] == "success"


def test_upload_note_user_not_found(logged_in_client):
    with logged_in_client.session_transaction() as sess:
        sess["user"] = 999999

    data = {"note_image": (io.BytesIO(b"img"), "test.png")}
    response = logged_in_client.post(
        "/notes/upload", data=data, content_type="multipart/form-data"
    )
    assert response.status_code == 404
    assert response.json["error"] == "User not found"


def test_upload_note_empty_file_local_fail(logged_in_client, sample_user):
    logged_in_client.application.config["USE_S3"] = False
    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    data = {"note_image": (io.BytesIO(b""), "empty.png")}
    response = logged_in_client.post(
        "/notes/upload", data=data, content_type="multipart/form-data"
    )
    assert response.status_code == 500
    assert response.json["error"] == "Upload failed"


def test_serve_note_unauthorized(client, sample_user, init_db):
    note_owner = User(username="note_owner", is_approved=True)
    other_user = User(username="note_stranger", is_approved=True)
    note_owner.set_password("pass123")
    other_user.set_password("pass123")
    db.session.add_all([note_owner, other_user])
    db.session.commit()

    note = Note(user_id=note_owner.id, filename="private_note.png")
    db.session.add(note)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = other_user.id

    response = client.get(f"/notes/view/{note.filename}")
    assert response.status_code == 403
    assert response.json["error"] == "Not authorized to view this note"


def test_delete_note_unauthorized_session(client, sample_user, init_db):
    note = Note(user_id=sample_user.id, filename="local_test.png")
    db.session.add(note)
    db.session.commit()

    response = client.post(f"/notes/delete/{note.id}")
    assert response.status_code == 401
    assert response.json["error"] == "Unauthorized"


def test_delete_note_exception(logged_in_client, sample_user, init_db):
    note = Note(user_id=sample_user.id, filename="local_test_err.png")
    db.session.add(note)
    db.session.commit()

    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    with patch("application.extensions.db.session.commit", side_effect=Exception("DB Error")):
        response = logged_in_client.post(f"/notes/delete/{note.id}")
        assert response.status_code == 500
        assert "Failed to delete the note" in response.json["error"]


def test_kiosk_upload_note_unauthorized(client, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id  # sample_user is not admin

    response = client.post("/notes/kiosk-upload")
    assert response.status_code == 403
    assert response.json["error"] == "Unauthorized"


def test_kiosk_upload_note_missing_student_id(logged_in_client, sample_admin):
    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    response = logged_in_client.post("/notes/kiosk-upload", data={})
    assert response.status_code == 400
    assert response.json["error"] == "No student specified"


def test_kiosk_upload_note_student_not_found(logged_in_client, sample_admin):
    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    response = logged_in_client.post(
        "/notes/kiosk-upload", data={"student_id": "99999"}
    )
    assert response.status_code == 404
    assert response.json["error"] == "Student not found"


def test_kiosk_upload_note_no_file(logged_in_client, sample_admin, sample_user):
    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    response = logged_in_client.post(
        "/notes/kiosk-upload", data={"student_id": str(sample_user.id)}
    )
    assert response.status_code == 400
    assert response.json["error"] == "No file provided"


def test_kiosk_upload_note_success_local(logged_in_client, sample_admin, sample_user):
    logged_in_client.application.config["USE_S3"] = False
    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    data = {
        "student_id": str(sample_user.id),
        "note": (io.BytesIO(b"kiosk note bytes"), "kiosk_sample.png"),
    }
    response = logged_in_client.post(
        "/notes/kiosk-upload", data=data, content_type="multipart/form-data"
    )
    assert response.status_code == 200
    assert response.json["status"] == "success"

    uploaded_note = Note.query.filter_by(user_id=sample_user.id).first()
    assert uploaded_note is not None


@patch(f"{ROUTE_MODULE_PATH}.get_s3_client")
def test_kiosk_upload_note_success_s3(
    mock_get_s3_client, logged_in_client, sample_admin, sample_user
):
    mock_s3 = mock_get_s3_client.return_value
    mock_s3.upload_fileobj.return_value = None
    logged_in_client.application.config["USE_S3"] = True

    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    data = {
        "student_id": str(sample_user.id),
        "note_image": (io.BytesIO(b"kiosk s3 bytes"), "kiosk_s3.png"),
    }
    response = logged_in_client.post(
        "/notes/kiosk-upload", data=data, content_type="multipart/form-data"
    )
    assert response.status_code == 200
    assert response.json["status"] == "success"
    mock_s3.upload_fileobj.assert_called_once()

