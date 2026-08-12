"""
File: test_activity_routes.py
Type: py
Summary: Unit tests for the merged student activity timeline endpoint
(GET /api/me/activity), covering all four source types, sorting, reward
rules, pagination, user scoping, and bad-input handling.
"""

import uuid
from datetime import datetime, timedelta

from application.extensions import db
from application.models.achievements import Achievement
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.course_instance_request import CourseInstanceRequest
from application.models.submission import Submission
from application.models.user_certificate import UserCertificate

BASE_TIME = datetime(2026, 1, 1, 12, 0, 0)


def _login(client, user):
    with client.session_transaction() as sess:
        sess["user"] = user.id


def _make_achievement(reward=100):
    achievement = Achievement(
        name=f"Achievement {uuid.uuid4().hex[:6]}",
        slug=f"ach-{uuid.uuid4().hex[:8]}",
        type="certificate",
        reward=reward,
        description="Test achievement",
    )
    db.session.add(achievement)
    db.session.commit()
    return achievement


def test_activity_requires_login(client, init_db):
    """Unauthenticated requests are rejected with 401."""
    response = client.get(
        "/api/me/activity", headers={"Accept": "application/json"}
    )
    assert response.status_code == 401


def test_activity_returns_all_four_source_types_sorted(client, init_db, sample_user):
    """A user with one of each source type gets all four back, shaped correctly,
    sorted most-recent-first."""
    challenge = Challenge(
        name="Dungeons of Kithgard",
        slug=f"dungeons-of-kithgard-{uuid.uuid4().hex[:6]}",
        domain="codecombat.com",
        difficulty="medium",
        value=15,
        is_active=True,
    )
    db.session.add(challenge)
    db.session.commit()

    log = ChallengeLog(
        user_id=sample_user.id,
        domain="codecombat.com",
        challenge_slug=challenge.slug,
        timestamp=BASE_TIME + timedelta(hours=1),
        helper="Ms. Smith",
    )

    achievement = _make_achievement(reward=100)
    cert = UserCertificate(
        user_id=sample_user.id,
        achievement_id=achievement.id,
        url="http://example.com/cert",
        submitted_at=BASE_TIME + timedelta(hours=2),
        status="pending",
    )

    submission = Submission(
        user_id=sample_user.id,
        classroom_id=None,
        original_filename="essay.pdf",
        stored_path="submissions/essay.pdf",
        file_size=100,
        note="please review",
        status="pending",
        timestamp=BASE_TIME + timedelta(hours=3),
    )

    course_request = CourseInstanceRequest(
        student_id=sample_user.id,
        course_instance_id="inst-1",
        requested_course_id="course-1",
        url="http://codecombat.com/some/very/long/url",
        status="pending",
        created_at=BASE_TIME + timedelta(hours=4),
    )

    db.session.add_all([log, cert, submission, course_request])
    db.session.commit()

    _login(client, sample_user)
    response = client.get("/api/me/activity")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["status"] == "success"
    data = payload["data"]

    assert data["total"] == 4
    kinds = [item["kind"] for item in data["items"]]
    # Most recent first: course_request(4h), file(3h), certificate(2h), challenge(1h)
    assert kinds == ["course_request", "file", "certificate", "challenge"]

    challenge_item = next(i for i in data["items"] if i["kind"] == "challenge")
    assert challenge_item["title"] == "Dungeons of Kithgard"
    assert challenge_item["status"] == "completed"
    assert challenge_item["reward"] == 15
    assert challenge_item["detail"] == "Helped by Ms. Smith"
    assert challenge_item["submitted_at"] == challenge_item["resolved_at"]
    assert challenge_item["id"] == f"challenge-{log.id}"

    cert_item = next(i for i in data["items"] if i["kind"] == "certificate")
    assert cert_item["title"] == achievement.name
    assert cert_item["status"] == "pending"
    assert cert_item["reward"] is None
    assert cert_item["resolved_at"] is None

    file_item = next(i for i in data["items"] if i["kind"] == "file")
    assert file_item["title"] == "essay.pdf"
    assert file_item["status"] == "pending"
    assert file_item["reward"] is None
    assert file_item["resolved_at"] is None
    assert file_item["detail"] == "please review"

    course_item = next(i for i in data["items"] if i["kind"] == "course_request")
    assert "course-1" in course_item["title"]
    assert course_item["status"] == "pending"
    assert course_item["resolved_at"] is None
    assert course_item["reward"] is None


def test_certificate_approved_has_reward_pending_has_none(client, init_db, sample_user):
    """An approved certificate includes the achievement reward; pending has None."""
    achievement = _make_achievement(reward=50)

    approved = UserCertificate(
        user_id=sample_user.id,
        achievement_id=achievement.id,
        url="http://example.com/a",
        submitted_at=BASE_TIME,
        status="approved",
        reviewed_at=BASE_TIME + timedelta(hours=1),
        review_note="Nicely done",
    )
    achievement2 = _make_achievement(reward=75)
    pending = UserCertificate(
        user_id=sample_user.id,
        achievement_id=achievement2.id,
        url="http://example.com/b",
        submitted_at=BASE_TIME + timedelta(hours=2),
        status="pending",
    )
    db.session.add_all([approved, pending])
    db.session.commit()

    _login(client, sample_user)
    response = client.get("/api/me/activity")
    data = response.get_json()["data"]

    approved_item = next(i for i in data["items"] if i["id"] == f"certificate-{approved.id}")
    assert approved_item["reward"] == 50
    assert approved_item["resolved_at"] is not None
    assert approved_item["detail"] == "Nicely done"

    pending_item = next(i for i in data["items"] if i["id"] == f"certificate-{pending.id}")
    assert pending_item["reward"] is None


def test_file_submission_never_has_reward_and_prefers_teacher_note(
    client, init_db, sample_user
):
    """File submissions never award ducks, and detail prefers teacher_note over note
    when both are present."""
    submission = Submission(
        user_id=sample_user.id,
        classroom_id=None,
        original_filename="homework.txt",
        stored_path="submissions/homework.txt",
        file_size=10,
        note="student note",
        teacher_note="teacher note",
        status="reviewed",
        timestamp=BASE_TIME,
    )
    db.session.add(submission)
    db.session.commit()

    _login(client, sample_user)
    response = client.get("/api/me/activity")
    data = response.get_json()["data"]

    item = data["items"][0]
    assert item["kind"] == "file"
    assert item["reward"] is None
    assert item["detail"] == "teacher note"


def test_pagination(client, init_db, sample_user):
    """Pagination correctly slices the merged, sorted list."""
    for i in range(5):
        submission = Submission(
            user_id=sample_user.id,
            classroom_id=None,
            original_filename=f"file{i}.txt",
            stored_path=f"submissions/file{i}.txt",
            file_size=10,
            status="pending",
            timestamp=BASE_TIME + timedelta(hours=i),
        )
        db.session.add(submission)
    db.session.commit()

    _login(client, sample_user)

    response_page1 = client.get("/api/me/activity?page=1&per_page=2")
    data1 = response_page1.get_json()["data"]
    assert data1["total"] == 5
    assert data1["page"] == 1
    assert data1["per_page"] == 2
    assert len(data1["items"]) == 2
    assert data1["has_more"] is True
    # Most recent first: file4 (BASE+4h), file3 (BASE+3h)
    assert data1["items"][0]["title"] == "file4.txt"
    assert data1["items"][1]["title"] == "file3.txt"

    response_page3 = client.get("/api/me/activity?page=3&per_page=2")
    data3 = response_page3.get_json()["data"]
    assert data3["total"] == 5
    assert len(data3["items"]) == 1
    assert data3["has_more"] is False
    assert data3["items"][0]["title"] == "file0.txt"


def test_activity_strictly_scoped_to_current_user(client, init_db, sample_users):
    """A second user's activity never appears in the first user's response."""
    user1, user2 = sample_users

    sub1 = Submission(
        user_id=user1.id,
        classroom_id=None,
        original_filename="user1_file.txt",
        stored_path="submissions/user1_file.txt",
        file_size=10,
        status="pending",
        timestamp=BASE_TIME,
    )
    sub2 = Submission(
        user_id=user2.id,
        classroom_id=None,
        original_filename="user2_file.txt",
        stored_path="submissions/user2_file.txt",
        file_size=10,
        status="pending",
        timestamp=BASE_TIME,
    )
    db.session.add_all([sub1, sub2])
    db.session.commit()

    _login(client, user1)
    response = client.get("/api/me/activity")
    data = response.get_json()["data"]

    titles = [item["title"] for item in data["items"]]
    assert "user1_file.txt" in titles
    assert "user2_file.txt" not in titles
    assert data["total"] == 1


def test_bad_pagination_params_fall_back_to_defaults(client, init_db, sample_user):
    """Bad page/per_page query params don't 500 -- they fall back to defaults."""
    submission = Submission(
        user_id=sample_user.id,
        classroom_id=None,
        original_filename="file.txt",
        stored_path="submissions/file.txt",
        file_size=10,
        status="pending",
        timestamp=BASE_TIME,
    )
    db.session.add(submission)
    db.session.commit()

    _login(client, sample_user)

    response = client.get("/api/me/activity?page=-1&per_page=abc")
    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["page"] == 1
    assert data["per_page"] == 20

    response2 = client.get("/api/me/activity?page=0&per_page=-5")
    assert response2.status_code == 200
    data2 = response2.get_json()["data"]
    assert data2["page"] == 1
    assert data2["per_page"] == 20

    response3 = client.get("/api/me/activity?per_page=1000")
    assert response3.status_code == 200
    data3 = response3.get_json()["data"]
    assert data3["per_page"] == 100
