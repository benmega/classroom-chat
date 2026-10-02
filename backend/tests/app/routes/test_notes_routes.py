import io
import re
from unittest.mock import patch

import pytest
from application.extensions import db
from application.models.note import Note
from application.models.user import User
from tests.image_helpers import animated_gif_bytes, jpeg_bytes, png_bytes

ROUTE_MODULE_PATH = "application.routes.notes_routes"
PNG = png_bytes()


@pytest.fixture(autouse=True)
def notes_upload_dir(test_app, tmp_path, monkeypatch):
    """Local notes are written to a scratch folder, never to the real userData."""
    monkeypatch.setitem(test_app.config, "UPLOAD_FOLDER", str(tmp_path))
    return tmp_path


def test_upload_note_no_auth(client):
    """Ensure unauthorized users cannot upload notes."""
    response = client.post("/notes/upload")
    assert response.status_code == 401


def test_upload_note_no_file(logged_in_client):
    """Ensure a 400 error if no file is part of the request."""
    response = logged_in_client.post("/notes/upload", data={})
    assert response.status_code == 400
    assert b"No file provided" in response.data


@patch(f"{ROUTE_MODULE_PATH}.get_s3_client")
def test_upload_note_success(
    mock_get_s3_client, logged_in_client, sample_user, init_db, monkeypatch
):
    mock_s3_client = mock_get_s3_client.return_value
    mock_s3_client.upload_fileobj.return_value = None
    monkeypatch.setitem(logged_in_client.application.config, "USE_S3", True)

    db_user = db.session.get(User, sample_user.id)
    if not db_user:
        init_db.session.add(sample_user)
        init_db.session.commit()

    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    file_name = "homework.png"
    data = {"note_image": (io.BytesIO(PNG), file_name)}

    response = logged_in_client.post(
        "/notes/upload", data=data, content_type="multipart/form-data"
    )

    assert response.status_code == 200, f"Response: {response.data}"
    assert response.json["status"] == "success"

    mock_s3_client.upload_fileobj.assert_called_once()
    uploaded_note = Note.query.filter_by(user_id=sample_user.id).first()
    assert uploaded_note is not None
    assert f"notes/{sample_user.username}/" in uploaded_note.filename
    assert re.fullmatch(
        rf"notes/{sample_user.username}/[0-9a-f]{{32}}\.png", uploaded_note.filename
    )


@patch(f"{ROUTE_MODULE_PATH}.get_s3_client")
def test_upload_note_s3_failure(
    mock_get_s3_client, logged_in_client, sample_user, init_db, monkeypatch
):
    mock_s3_client = mock_get_s3_client.return_value
    mock_s3_client.upload_fileobj.side_effect = Exception("AWS Down")
    monkeypatch.setitem(logged_in_client.application.config, "USE_S3", True)

    db_user = db.session.get(User, sample_user.id)
    if not db_user:
        init_db.session.add(sample_user)
        init_db.session.commit()

    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    data = {"note_image": (io.BytesIO(PNG), "fail.png")}

    with patch(
        "application.routes.notes_routes.handle_local_note_upload", return_value=None
    ):
        response = logged_in_client.post(
            "/notes/upload", data=data, content_type="multipart/form-data"
        )

    assert response.status_code == 500
    assert response.json["error"] == "Upload failed"


def test_upload_note_local_success(logged_in_client, sample_user, init_db, monkeypatch):
    monkeypatch.setitem(logged_in_client.application.config, "USE_S3", False)

    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    data = {"note_image": (io.BytesIO(PNG), "test_local_note.png")}

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
    assert resp_view.data == PNG  # the original bytes are kept
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


def test_upload_note_field_name_note(logged_in_client, sample_user, monkeypatch):
    monkeypatch.setitem(logged_in_client.application.config, "USE_S3", False)
    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    data = {"note": (io.BytesIO(PNG), "field_note.png")}
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


def test_upload_note_empty_file_is_rejected(logged_in_client, sample_user, monkeypatch):
    monkeypatch.setitem(logged_in_client.application.config, "USE_S3", False)
    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    data = {"note_image": (io.BytesIO(b""), "empty.png")}
    response = logged_in_client.post(
        "/notes/upload", data=data, content_type="multipart/form-data"
    )
    assert response.status_code == 400
    assert response.json["status"] == "error"
    assert Note.query.filter_by(user_id=sample_user.id).count() == 0


def test_upload_note_local_storage_failure_is_500(logged_in_client, sample_user):
    logged_in_client.application.config["USE_S3"] = False
    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    data = {"note_image": (io.BytesIO(PNG), "disk.png")}
    with patch(f"{ROUTE_MODULE_PATH}.save_processed_image", side_effect=OSError("disk full")):
        response = logged_in_client.post(
            "/notes/upload", data=data, content_type="multipart/form-data"
        )

    assert response.status_code == 500
    assert response.json["error"] == "Upload failed"
    assert Note.query.filter_by(user_id=sample_user.id).count() == 0


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


def test_kiosk_upload_note_success_local(
    logged_in_client, sample_admin, sample_user, monkeypatch
):
    monkeypatch.setitem(logged_in_client.application.config, "USE_S3", False)
    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    data = {
        "student_id": str(sample_user.id),
        "note": (io.BytesIO(PNG), "kiosk_sample.png"),
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
    mock_get_s3_client, logged_in_client, sample_admin, sample_user, monkeypatch
):
    mock_s3 = mock_get_s3_client.return_value
    mock_s3.upload_fileobj.return_value = None
    monkeypatch.setitem(logged_in_client.application.config, "USE_S3", True)

    with logged_in_client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    data = {
        "student_id": str(sample_user.id),
        "note_image": (io.BytesIO(PNG), "kiosk_s3.png"),
    }
    response = logged_in_client.post(
        "/notes/kiosk-upload", data=data, content_type="multipart/form-data"
    )
    assert response.status_code == 200
    assert response.json["status"] == "success"
    mock_s3.upload_fileobj.assert_called_once()


@patch(f"{ROUTE_MODULE_PATH}.get_s3_client")
def test_note_s3_upload_and_delete_use_configured_bucket(
    mock_get_s3_client, logged_in_client, monkeypatch
):
    """The notes bucket comes from the app config (S3_NOTES_BUCKET), not a literal."""
    mock_s3 = mock_get_s3_client.return_value
    mock_s3.upload_fileobj.return_value = None
    mock_s3.delete_object.return_value = {}
    app_config = logged_in_client.application.config
    monkeypatch.setitem(app_config, "USE_S3", True)
    monkeypatch.setitem(app_config, "S3_NOTES_BUCKET", "custom-notes-bucket")

    response = logged_in_client.post(
        "/notes/upload",
        data={"note_image": (io.BytesIO(PNG), "scan.png")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 200
    assert mock_s3.upload_fileobj.call_args.args[1] == "custom-notes-bucket"
    assert response.json["note"]["url"].startswith(
        "https://custom-notes-bucket.s3."
    )

    resp = logged_in_client.post(f"/notes/delete/{response.json['note']['id']}")
    assert resp.status_code == 200
    assert mock_s3.delete_object.call_args.kwargs["Bucket"] == "custom-notes-bucket"


def test_delete_note_stale_session_user(logged_in_client, sample_user, init_db):
    note = Note(user_id=sample_user.id, filename="stale_session_note.png")
    db.session.add(note)
    db.session.commit()

    with logged_in_client.session_transaction() as sess:
        sess["user"] = 999999

    resp = logged_in_client.post(f"/notes/delete/{note.id}")

    assert resp.status_code == 401
    assert resp.json["error"] == "Unauthorized"
    assert db.session.get(Note, note.id) is not None


def test_kiosk_upload_stale_session_user(logged_in_client):
    with logged_in_client.session_transaction() as sess:
        sess["user"] = 999999

    response = logged_in_client.post(
        "/notes/kiosk-upload",
        data={"student_id": "1", "note": (io.BytesIO(b"img"), "kiosk.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 403
    assert response.json["error"] == "Unauthorized"


# --- Validated uploads, unique S3 keys, error statuses and delete safety ---


def _post_note(client, name, data, content_type=None, field="note_image"):
    part = (io.BytesIO(data), name, content_type) if content_type else (io.BytesIO(data), name)
    return client.post(
        "/notes/upload", data={field: part}, content_type="multipart/form-data"
    )


def _login(client, user):
    with client.session_transaction() as sess:
        sess["user"] = user.id


@pytest.mark.parametrize(
    "name, data",
    [
        ("notes.txt", b"plain text"),
        ("script.html", b"<html></html>"),
        ("noextension", PNG),
        ("", PNG),
    ],
)
def test_upload_note_invalid_file_type_is_400(logged_in_client, sample_user, name, data):
    logged_in_client.application.config["USE_S3"] = False
    _login(logged_in_client, sample_user)

    response = _post_note(logged_in_client, name, data)

    assert response.status_code == 400
    assert response.json["status"] == "error"
    assert response.json["error"].startswith("Invalid file type. Allowed:")
    assert Note.query.filter_by(user_id=sample_user.id).count() == 0


@pytest.mark.parametrize(
    "data",
    [b"not really a png", b"<svg onload=alert(1)></svg>", PNG[: len(PNG) // 2]],
)
def test_upload_note_corrupt_image_is_400(logged_in_client, sample_user, data, tmp_path):
    logged_in_client.application.config["USE_S3"] = False
    _login(logged_in_client, sample_user)

    response = _post_note(logged_in_client, "photo.png", data)

    assert response.status_code == 400
    assert response.json["error"] == "Invalid or corrupt image file."
    assert Note.query.filter_by(user_id=sample_user.id).count() == 0
    assert not (tmp_path / "notes").exists()


@patch(f"{ROUTE_MODULE_PATH}.get_s3_client")
def test_upload_note_corrupt_image_never_reaches_s3(mock_get_s3_client, logged_in_client, sample_user):
    logged_in_client.application.config["USE_S3"] = True
    _login(logged_in_client, sample_user)

    response = _post_note(logged_in_client, "photo.png", b"not really a png")

    assert response.status_code == 400
    mock_get_s3_client.return_value.upload_fileobj.assert_not_called()


def test_upload_note_over_the_size_cap_is_413(logged_in_client, sample_user, monkeypatch):
    logged_in_client.application.config["USE_S3"] = False
    monkeypatch.setitem(logged_in_client.application.config, "IMAGE_MAX_BYTES_NOTE", len(PNG) - 1)
    _login(logged_in_client, sample_user)

    response = _post_note(logged_in_client, "big.png", PNG)

    assert response.status_code == 413
    assert "File too large" in response.json["error"]
    assert Note.query.filter_by(user_id=sample_user.id).count() == 0


def test_upload_note_over_the_pixel_cap_is_400(logged_in_client, sample_user, monkeypatch):
    logged_in_client.application.config["USE_S3"] = False
    monkeypatch.setitem(logged_in_client.application.config, "MAX_IMAGE_PIXELS", 10)
    _login(logged_in_client, sample_user)

    response = _post_note(logged_in_client, "wide.png", PNG)

    assert response.status_code == 400
    assert response.json["error"].startswith("Image dimensions too large")


def test_upload_note_keeps_the_original_bytes_under_the_real_extension(
    logged_in_client, sample_user, notes_upload_dir
):
    logged_in_client.application.config["USE_S3"] = False
    _login(logged_in_client, sample_user)
    original = jpeg_bytes(size=(64, 48))

    response = _post_note(logged_in_client, "scan.png", original)  # a JPEG named .png

    assert response.status_code == 200
    stored = Note.query.filter_by(user_id=sample_user.id).one().filename
    assert re.fullmatch(r"[0-9a-f]{32}\.jpg", stored)
    assert (notes_upload_dir / "notes" / stored).read_bytes() == original


def test_upload_note_keeps_an_animated_gif(logged_in_client, sample_user, notes_upload_dir):
    logged_in_client.application.config["USE_S3"] = False
    _login(logged_in_client, sample_user)
    gif = animated_gif_bytes(frames=3)

    response = _post_note(logged_in_client, "anim.gif", gif)

    assert response.status_code == 200
    stored = Note.query.filter_by(user_id=sample_user.id).one().filename
    assert (notes_upload_dir / "notes" / stored).read_bytes() == gif


@patch(f"{ROUTE_MODULE_PATH}.get_s3_client")
def test_note_s3_keys_are_unique_even_for_the_same_file_name(
    mock_get_s3_client, logged_in_client, sample_user
):
    mock_s3 = mock_get_s3_client.return_value
    logged_in_client.application.config["USE_S3"] = True
    _login(logged_in_client, sample_user)

    first = _post_note(logged_in_client, "homework.png", PNG)
    second = _post_note(logged_in_client, "homework.png", PNG)

    assert first.status_code == second.status_code == 200
    keys = [call.args[2] for call in mock_s3.upload_fileobj.call_args_list]
    assert len(set(keys)) == 2
    prefix = f"notes/{sample_user.username}/"
    assert all(re.fullmatch(re.escape(prefix) + r"[0-9a-f]{32}\.png", key) for key in keys)
    assert {n.filename for n in Note.query.filter_by(user_id=sample_user.id)} == set(keys)


@pytest.mark.parametrize("name", ["日本.png", ".png", "___.png", "../../etc/passwd.png", "a b.PNG"])
@patch(f"{ROUTE_MODULE_PATH}.get_s3_client")
def test_note_s3_key_does_not_depend_on_the_client_file_name(
    mock_get_s3_client, name, logged_in_client, sample_user
):
    mock_s3 = mock_get_s3_client.return_value
    logged_in_client.application.config["USE_S3"] = True
    _login(logged_in_client, sample_user)

    response = _post_note(logged_in_client, name, PNG)

    assert response.status_code == 200
    key = mock_s3.upload_fileobj.call_args.args[2]
    assert re.fullmatch(rf"notes/{sample_user.username}/[0-9a-f]{{32}}\.png", key)


@patch(f"{ROUTE_MODULE_PATH}.get_s3_client")
def test_note_s3_content_type_comes_from_the_verified_image(
    mock_get_s3_client, logged_in_client, sample_user
):
    mock_s3 = mock_get_s3_client.return_value
    logged_in_client.application.config["USE_S3"] = True
    _login(logged_in_client, sample_user)
    original = jpeg_bytes()

    # The client claims text/html and a .png name for what is really a JPEG
    response = _post_note(logged_in_client, "x.png", original, content_type="text/html")

    assert response.status_code == 200
    call = mock_s3.upload_fileobj.call_args
    assert call.kwargs["ExtraArgs"]["ContentType"] == "image/jpeg"
    assert call.args[2].endswith(".jpg")
    assert call.args[0].read() == original


@patch(f"{ROUTE_MODULE_PATH}.get_s3_client")
def test_note_s3_failure_falls_back_to_local_storage(
    mock_get_s3_client, logged_in_client, sample_user, notes_upload_dir
):
    mock_get_s3_client.return_value.upload_fileobj.side_effect = Exception("AWS Down")
    logged_in_client.application.config["USE_S3"] = True
    _login(logged_in_client, sample_user)

    response = _post_note(logged_in_client, "x.png", PNG)

    assert response.status_code == 200
    stored = Note.query.filter_by(user_id=sample_user.id).one().filename
    assert "/" not in stored
    assert (notes_upload_dir / "notes" / stored).read_bytes() == PNG


def test_kiosk_upload_invalid_file_type_is_400(logged_in_client, sample_admin, sample_user):
    logged_in_client.application.config["USE_S3"] = False
    _login(logged_in_client, sample_admin)

    response = logged_in_client.post(
        "/notes/kiosk-upload",
        data={"student_id": str(sample_user.id), "note": (io.BytesIO(b"text"), "notes.txt")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert response.json["error"].startswith("Invalid file type. Allowed:")
    assert Note.query.filter_by(user_id=sample_user.id).count() == 0


def test_kiosk_upload_corrupt_image_is_400(logged_in_client, sample_admin, sample_user):
    logged_in_client.application.config["USE_S3"] = False
    _login(logged_in_client, sample_admin)

    response = logged_in_client.post(
        "/notes/kiosk-upload",
        data={"student_id": str(sample_user.id), "note": (io.BytesIO(b"junk"), "x.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert response.json["error"] == "Invalid or corrupt image file."
    assert Note.query.filter_by(user_id=sample_user.id).count() == 0


@patch(f"{ROUTE_MODULE_PATH}.get_s3_client")
def test_kiosk_upload_s3_key_is_unique_and_typed(
    mock_get_s3_client, logged_in_client, sample_admin, sample_user
):
    mock_s3 = mock_get_s3_client.return_value
    logged_in_client.application.config["USE_S3"] = True
    _login(logged_in_client, sample_admin)

    for _ in range(2):
        response = logged_in_client.post(
            "/notes/kiosk-upload",
            data={"student_id": str(sample_user.id), "note": (io.BytesIO(PNG), "same.png")},
            content_type="multipart/form-data",
        )
        assert response.status_code == 200

    keys = [call.args[2] for call in mock_s3.upload_fileobj.call_args_list]
    assert len(set(keys)) == 2
    assert all(key.startswith(f"notes/{sample_user.username}/") for key in keys)
    assert all(
        call.kwargs["ExtraArgs"]["ContentType"] == "image/png"
        for call in mock_s3.upload_fileobj.call_args_list
    )


@patch(f"{ROUTE_MODULE_PATH}.get_s3_client", return_value=None)
def test_delete_s3_note_without_an_s3_client_keeps_the_row(
    _unavailable_s3, logged_in_client, sample_user
):
    note = Note(user_id=sample_user.id, filename="notes/someone/abc.png")
    db.session.add(note)
    db.session.commit()
    note_id = note.id
    _login(logged_in_client, sample_user)

    response = logged_in_client.post(f"/notes/delete/{note_id}")

    assert response.status_code == 503
    assert response.json["status"] == "error"
    assert db.session.get(Note, note_id) is not None

    # Once storage is back the delete can simply be retried
    with patch(f"{ROUTE_MODULE_PATH}.get_s3_client") as working:
        retry = logged_in_client.post(f"/notes/delete/{note_id}")

    assert retry.status_code == 200
    working.return_value.delete_object.assert_called_once()
    assert db.session.get(Note, note_id) is None


@patch(f"{ROUTE_MODULE_PATH}.get_s3_client")
def test_delete_s3_note_keeps_the_row_when_s3_fails(mock_get_s3_client, logged_in_client, sample_user):
    mock_get_s3_client.return_value.delete_object.side_effect = Exception("AWS Down")
    note = Note(user_id=sample_user.id, filename="notes/someone/abc.png")
    db.session.add(note)
    db.session.commit()
    note_id = note.id
    _login(logged_in_client, sample_user)

    response = logged_in_client.post(f"/notes/delete/{note_id}")

    assert response.status_code == 500
    assert db.session.get(Note, note_id) is not None
