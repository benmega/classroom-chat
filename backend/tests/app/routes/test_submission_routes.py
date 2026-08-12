"""
File: test_submission_routes.py
Type: py
Summary: Unit tests for student file submission routes and the admin
mark-reviewed endpoint, including the teacher_note field.
"""

from io import BytesIO

from application.extensions import db
from application.models.submission import Submission


def test_submit_work_creates_submission(client, init_db, sample_user):
    """A logged-in student can POST a file to /api/submissions and a row is created."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    data = {
        "file": (BytesIO(b"hello world"), "homework.txt"),
        "note": "Here is my homework!",
    }

    response = client.post(
        "/api/submissions",
        data=data,
        content_type="multipart/form-data",
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["status"] == "success"
    submission_data = payload["data"]["submission"]
    assert submission_data["original_filename"] == "homework.txt"
    assert submission_data["note"] == "Here is my homework!"
    assert submission_data["status"] == "pending"
    assert submission_data["teacher_note"] is None

    stored = db.session.get(Submission, submission_data["id"])
    assert stored is not None
    assert stored.user_id == sample_user.id


def test_submit_work_requires_login(client, init_db):
    """Anonymous requests are rejected."""
    data = {"file": (BytesIO(b"hello"), "homework.txt")}
    response = client.post(
        "/api/submissions",
        data=data,
        content_type="multipart/form-data",
        headers={"Accept": "application/json"},
    )
    assert response.status_code == 401


def _create_submission(sample_user):
    submission = Submission(
        user_id=sample_user.id,
        classroom_id=None,
        original_filename="essay.pdf",
        stored_path="submissions/essay.pdf",
        file_size=1234,
        note="Please check my essay",
        status="pending",
    )
    db.session.add(submission)
    db.session.commit()
    return submission


def test_mark_reviewed_persists_teacher_note(client, init_db, sample_user, logged_in_admin):
    """Marking a submission reviewed with a teacher_note persists and round-trips it."""
    submission = _create_submission(sample_user)

    response = logged_in_admin.post(
        f"/api/admin/submissions/{submission.id}/mark-reviewed",
        json={"teacher_note": "Great work, see you tomorrow!"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["status"] == "success"
    returned = payload["data"]["submission"]
    assert returned["status"] == "reviewed"
    assert returned["teacher_note"] == "Great work, see you tomorrow!"

    stored = db.session.get(Submission, submission.id)
    assert stored.status == "reviewed"
    assert stored.teacher_note == "Great work, see you tomorrow!"
    assert stored.to_dict()["teacher_note"] == "Great work, see you tomorrow!"


def test_mark_reviewed_without_teacher_note(client, init_db, sample_user, logged_in_admin):
    """Marking reviewed with no body still works and leaves teacher_note unset."""
    submission = _create_submission(sample_user)

    response = logged_in_admin.post(
        f"/api/admin/submissions/{submission.id}/mark-reviewed"
    )

    assert response.status_code == 200
    payload = response.get_json()
    returned = payload["data"]["submission"]
    assert returned["status"] == "reviewed"
    assert returned["teacher_note"] is None


def test_mark_reviewed_requires_admin(client, init_db, sample_user, logged_in_client):
    """A non-admin logged-in user cannot mark a submission reviewed."""
    submission = _create_submission(sample_user)

    response = logged_in_client.post(
        f"/api/admin/submissions/{submission.id}/mark-reviewed",
        json={"teacher_note": "sneaky"},
    )

    assert response.status_code == 403
