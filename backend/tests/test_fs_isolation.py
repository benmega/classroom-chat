"""
File: test_fs_isolation.py
Type: py
Summary: The suite writes uploads to a throwaway folder and does not leak app config between tests.
"""

import io
from pathlib import Path

from application.config import Config
from application.models.note import Note
from application.models.submission import Submission
from tests.image_helpers import png_bytes

REAL_UPLOAD_FOLDER = Path(Config.BASE_DIR) / "userData"


def test_upload_folder_is_a_throwaway_folder_not_the_real_userdata(test_app):
    folder = Path(test_app.config["UPLOAD_FOLDER"])

    assert folder.is_dir()
    assert folder.resolve() != REAL_UPLOAD_FOLDER.resolve()
    assert not folder.resolve().is_relative_to(REAL_UPLOAD_FOLDER.resolve())


def test_class_attribute_and_app_config_name_the_same_upload_folder(test_app):
    # Some routes read Config.UPLOAD_FOLDER, others app.config["UPLOAD_FOLDER"].
    assert test_app.config["UPLOAD_FOLDER"] == Config.UPLOAD_FOLDER


def test_submission_upload_lands_in_the_throwaway_folder(logged_in_client, sample_user):
    """/api/submissions reads Config.UPLOAD_FOLDER."""
    response = logged_in_client.post(
        "/api/submissions",
        data={"file": (io.BytesIO(b"homework"), "homework.txt")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 201
    submission = Submission.query.filter_by(user_id=sample_user.id).one()
    stored = Path(Config.UPLOAD_FOLDER) / submission.stored_path
    assert stored.read_bytes() == b"homework"


def test_note_upload_lands_in_the_throwaway_folder(
    logged_in_client, sample_user, test_app, monkeypatch
):
    """/notes/upload reads app.config["UPLOAD_FOLDER"]."""
    monkeypatch.setitem(test_app.config, "USE_S3", False)

    image = png_bytes()

    response = logged_in_client.post(
        "/notes/upload",
        data={"note_image": (io.BytesIO(image), "note.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    note = Note.query.filter_by(user_id=sample_user.id).one()
    stored = Path(Config.UPLOAD_FOLDER) / "notes" / note.filename
    assert stored.read_bytes() == image


def test_a_test_can_change_the_shared_app_config(test_app):
    test_app.config["LEAKED_BY_A_TEST"] = True
    test_app.config["MAX_CONTENT_LENGTH"] = 1

    assert test_app.config["LEAKED_BY_A_TEST"] is True


def test_app_config_changes_do_not_reach_the_next_test(test_app):
    # Runs right after the test above (definition order): its changes must be gone.
    assert "LEAKED_BY_A_TEST" not in test_app.config
    assert test_app.config["MAX_CONTENT_LENGTH"] == Config.MAX_CONTENT_LENGTH
