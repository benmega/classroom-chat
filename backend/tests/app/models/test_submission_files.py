"""
File: test_submission_files.py
Type: py
Summary: The uploaded file of a submission goes with its row, once the delete is
         committed, also when the row goes because its user is deleted.
"""

import os
import uuid
from pathlib import Path

import pytest
from application.config import Config
from application.extensions import db
from application.models.submission import Submission
from application.models.user import User
from tests.factories import AdminFactory, UserFactory


def _submit(user, stored_path=None):
    """A submission of `user` with a real file behind it: (submission id, file)."""
    stored_path = stored_path or f"submissions/{uuid.uuid4().hex}.pdf"
    file = Path(Config.UPLOAD_FOLDER, stored_path)
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_bytes(b"homework")
    submission = Submission(
        user_id=user.id,
        original_filename="work.pdf",
        stored_path=stored_path,
        file_size=8,
    )
    db.session.add(submission)
    db.session.commit()
    return submission.id, file


@pytest.fixture
def student(init_db):
    return UserFactory()


def test_deleting_a_user_removes_the_files_of_its_submissions(student):
    bystander = UserFactory()
    _, first = _submit(student)
    _, second = _submit(student)
    kept_id, kept = _submit(bystander)

    db.session.delete(student)
    db.session.commit()

    assert not first.exists()
    assert not second.exists()
    # Another user's submission and its file are untouched
    assert kept.read_bytes() == b"homework"
    assert [s.id for s in Submission.query.all()] == [kept_id]


def test_deleting_a_submission_removes_its_file(student):
    submission_id, file = _submit(student)

    db.session.delete(db.session.get(Submission, submission_id))
    db.session.commit()

    assert not file.exists()


def test_the_file_stays_until_the_delete_is_committed(student):
    _, file = _submit(student)

    db.session.delete(student)
    db.session.flush()

    assert file.exists()
    db.session.commit()
    assert not file.exists()


def test_a_delete_that_is_rolled_back_keeps_the_file(student):
    submission_id, file = _submit(student)
    student_id = student.id

    db.session.delete(student)
    db.session.flush()
    db.session.rollback()
    # A later commit of something else does not remove it either
    UserFactory()
    db.session.commit()

    assert file.read_bytes() == b"homework"
    assert db.session.get(Submission, submission_id).user_id == student_id


def test_a_delete_that_is_abandoned_keeps_the_file(student):
    """The session is closed without a commit or a rollback, as at the end of a
    request, and then used again."""
    submission_id, file = _submit(student)

    db.session.delete(student)
    db.session.flush()
    db.session.close()
    UserFactory()
    db.session.commit()

    assert file.read_bytes() == b"homework"
    assert db.session.get(Submission, submission_id) is not None


def test_the_file_stays_while_only_a_savepoint_is_released(student):
    _, file = _submit(student)

    with db.session.begin_nested():
        db.session.delete(student)

    assert file.exists()
    db.session.commit()
    assert not file.exists()


def test_a_savepoint_that_is_rolled_back_keeps_the_file(student):
    submission_id, file = _submit(student)

    savepoint = db.session.begin_nested()
    db.session.delete(student)
    db.session.flush()
    savepoint.rollback()
    db.session.commit()

    assert file.read_bytes() == b"homework"
    assert db.session.get(Submission, submission_id) is not None


def test_a_file_that_is_already_gone_does_not_stop_the_delete(student):
    submission_id, file = _submit(student)
    file.unlink()

    db.session.delete(student)
    db.session.commit()

    assert db.session.get(Submission, submission_id) is None


@pytest.mark.parametrize("where", ["parent folder", "sibling folder", "absolute path"])
def test_a_stored_path_outside_the_upload_folder_is_left_alone(
    student, tmp_path_factory, where
):
    upload_folder = Path(Config.UPLOAD_FOLDER)
    if where == "sibling folder":
        # Its name starts with the upload folder's name
        outside = upload_folder.with_name(upload_folder.name + "-other")
        outside.mkdir(exist_ok=True)
    else:
        outside = tmp_path_factory.mktemp("outside")
    file = outside / f"{uuid.uuid4().hex}.pdf"
    file.write_bytes(b"not an upload")
    stored_path = (
        str(file) if where == "absolute path" else os.path.relpath(file, upload_folder)
    )
    submission = Submission(
        user_id=student.id,
        original_filename="work.pdf",
        stored_path=stored_path,
        file_size=13,
    )
    db.session.add(submission)
    db.session.commit()
    submission_id = submission.id

    db.session.delete(student)
    db.session.commit()

    assert db.session.get(Submission, submission_id) is None
    assert file.read_bytes() == b"not an upload"


def _admin_client(client):
    admin = AdminFactory()
    with client.session_transaction() as sess:
        sess["_user_id"] = str(admin.id)
        sess["_fresh"] = True
        sess["user"] = admin.id
    return client


@pytest.mark.parametrize("path", ["reject_user", "remove_user", "crud"])
def test_every_admin_delete_path_removes_the_files(client, student, path):
    student_id, username = student.id, student.username
    submission_id, file = _submit(student)
    kept_id, kept = _submit(UserFactory())
    client = _admin_client(client)

    if path == "reject_user":
        response = client.post(f"/api/admin/reject_user/{student_id}")
    elif path == "remove_user":
        response = client.post("/api/admin/remove_user", data={"username": username})
    else:
        response = client.delete(f"/api/admin/crud/user/{student_id}")

    assert response.status_code == 200, response.get_data(as_text=True)
    db.session.expire_all()
    assert db.session.get(User, student_id) is None
    assert db.session.get(Submission, submission_id) is None
    assert not file.exists()
    assert db.session.get(Submission, kept_id) is not None
    assert kept.exists()


def test_the_admin_inbox_still_deletes_a_submission_and_its_file(client, student):
    submission_id, file = _submit(student)
    kept_id, kept = _submit(student)

    response = _admin_client(client).delete(f"/api/admin/submissions/{submission_id}")

    assert response.status_code == 200, response.get_data(as_text=True)
    db.session.expire_all()
    assert db.session.get(Submission, submission_id) is None
    assert not file.exists()
    assert db.session.get(Submission, kept_id) is not None
    assert kept.exists()
