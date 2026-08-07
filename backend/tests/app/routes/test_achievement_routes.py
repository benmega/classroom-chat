"""
File: test_achievement_routes.py
Type: py
Summary: Unit tests for achievement routes Flask routes.
"""

from io import BytesIO
from unittest.mock import patch

import pytest
from application.extensions import db
from application.models.achievements import Achievement, UserAchievement
from application.models.user_certificate import UserCertificate


@pytest.fixture
def mock_render_template(client):
    """
    Mocks render_template to prevent TemplateNotFound errors if templates are missing.
    """
    with patch("application.routes.achievement_routes.render_template") as mock:
        mock.return_value = "Mocked Template Content"
        yield mock


def test_achievements_page(
    client, init_db, sample_user, sample_achievement, mock_render_template
):
    """Test retrieving achievements page with a logged-in user."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/achievements/")
    assert response.status_code == 200
    # Since we mocked the template, we verify the route logic executed successfully
    assert b"Mocked Template Content" in response.data


def test_achievements_page_with_user_achievements(
    client, init_db, sample_user, sample_user_achievement, mock_render_template
):
    """Test achievements page showing user's completed achievements."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/achievements/")
    assert response.status_code == 200


def test_achievements_page_multiple_types(
    client, init_db, sample_user, mock_render_template
):
    """Test achievements page with multiple achievement types."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    achievements = [
        Achievement(
            name="Duck Master",
            slug="duck-100",
            type="ducks",
            reward=50,
            description="Collect 100 ducks",
            requirement_value="100",
        ),
        Achievement(
            name="Project Pro",
            slug="project-5",
            type="project",
            reward=25,
            description="Complete 5 projects",
            requirement_value="5",
        ),
        Achievement(
            name="Chat Champion",
            slug="chat-50",
            type="chat",
            reward=15,
            description="Send 50 messages",
            requirement_value="50",
        ),
        Achievement(
            name="Course Complete",
            slug="course-complete",
            type="certificate",
            reward=100,
            description="Complete a course",
            source="codecombat.com",
        ),
    ]
    db.session.add_all(achievements)
    db.session.commit()

    response = client.get("/achievements/")
    assert response.status_code == 200


def test_add_achievement_post(client, init_db, sample_admin):
    """Test POST request to create a new achievement (Admin)."""
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    response = client.post(
        "/achievements/add",
        data={
            "name": "JavaScript Expert",
            "slug": "javascript-advanced",
            "description": "Complete advanced JavaScript course",
            "requirement_value": "150",
            "type": "certificate",
            "reward": "10",
        },
        follow_redirects=True,
    )

    assert response.status_code == 200

    ach = Achievement.query.filter_by(slug="javascript-advanced").first()
    assert ach is not None
    assert ach.name == "JavaScript Expert"
    assert ach.reward == 10


def test_add_achievement_no_requirement(client, init_db, sample_admin):
    """Test creating achievement without requirement value."""
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    response = client.post(
        "/achievements/add",
        data={
            "name": "Quick Starter",
            "slug": "quick-start",
            "description": "Complete the tutorial",
            "requirement_value": "",
            "type": "progress",
            "reward": "5",
        },
        follow_redirects=True,
    )

    assert response.status_code == 200
    ach = Achievement.query.filter_by(slug="quick-start").first()
    assert ach is not None
    assert ach.requirement_value is None


def test_add_achievement_no_user(client, init_db):
    """Test adding achievement without logged in user/admin privileges."""
    initial_count = db.session.query(UserCertificate).count()

    response = client.post(
        "/achievements/add",
        data={
            "name": "Test Achievement",
            "slug": "test-ach",
            "type": "certificate",
            "reward": 10,
        },
        environ_base={"REMOTE_ADDR": "8.8.8.8"},
    )

    final_count = db.session.query(UserCertificate).count()
    assert final_count == initial_count
    assert response.status_code == 401


def test_submit_certificate_get(client, init_db, sample_user, mock_render_template):
    """Test GET request to submit certificate page."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/achievements/submit_certificate")
    assert response.status_code == 200
    assert b"Mocked Template Content" in response.data


@patch("application.utilities.cert_generator.generate_certificate")
def test_submit_certificate_valid(mock_gen, client, init_db, sample_user, sample_achievement):
    """Test submitting a valid certificate via AJAX."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    valid_url = (
        f"https://codecombat.com/certificates/abc123?course={sample_achievement.slug}"
    )

    # Use X-Requested-With to get a JSON response
    response = client.post(
        "/achievements/submit_certificate",
        data={"certificate_url": valid_url},
        content_type="multipart/form-data",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )

    assert response.status_code == 200
    assert response.is_json
    data = response.get_json()
    assert data.get("success") is True

    cert = UserCertificate.query.filter_by(url=valid_url).first()
    assert cert is not None
    assert cert.user_id == sample_user.id
    assert cert.status == "pending"
    assert cert.is_auto_recommended is True


def test_submit_certificate_invalid_url(client, init_db, sample_user):
    """Test submitting certificate with invalid URL."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    initial_count = db.session.query(UserCertificate).count()

    response = client.post(
        "/achievements/submit_certificate",
        data={
            "certificate_url": "https://invalid-url.com",
        },
        content_type="multipart/form-data",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )

    assert response.status_code == 200

    assert db.session.query(UserCertificate).count() == initial_count

    assert response.is_json
    assert response.json.get("success") is False
    assert "Invalid certificate URL" in response.json.get("error", "")


def test_submit_certificate_no_matching_achievement(client, init_db, sample_user):
    """Test submitting certificate for non-existent achievement."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    initial_count = db.session.query(UserCertificate).count()

    response = client.post(
        "/achievements/submit_certificate",
        data={
            "certificate_url": "https://codecombat.com/certificates/abc123?course=nonexistent-course",
        },
        content_type="multipart/form-data",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )

    assert response.status_code == 200
    assert db.session.query(UserCertificate).count() == initial_count

    assert response.is_json
    assert response.json.get("success") is False
    assert "No matching achievement" in response.json.get("error", "")





@patch("application.utilities.cert_generator.generate_certificate")
def test_submit_certificate_update_existing(
    mock_gen, client, init_db, sample_user, sample_achievement
):
    """Test updating an existing certificate submission."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # Pre-seed a certificate
    initial_cert = UserCertificate(
        user_id=sample_user.id,
        achievement_id=sample_achievement.id,
        url="https://codecombat.com/certificates/old?course=test",
        file_path="old.pdf",
    )
    db.session.add(initial_cert)
    db.session.commit()

    old_id = initial_cert.id

    # Submit new data
    new_url = (
        f"https://codecombat.com/certificates/new?course={sample_achievement.slug}"
    )

    response = client.post(
        "/achievements/submit_certificate",
        data={"certificate_url": new_url},
        content_type="multipart/form-data",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )

    assert response.status_code == 200
    assert response.json.get("success") is True

    assert db.session.query(UserCertificate).count() == 1
    updated_cert = db.session.get(UserCertificate, old_id)
    assert updated_cert.url == new_url
    assert updated_cert.file_path != "old.pdf"
    assert updated_cert.status == "pending"


def test_submit_certificate_no_user(client, init_db):
    """Test submitting certificate without logged in user."""
    # Direct POST without session
    response = client.post(
        "/achievements/submit_certificate",
        data={
            "certificate_url": "https://codecombat.com/certificates/abc?course=test",
        },
        content_type="multipart/form-data",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )

    assert response.status_code == 400
    assert response.json["success"] is False


def test_achievements_page_no_user(client, init_db):
    """Test achievements page without logged in user."""
    response = client.get("/achievements/")

    assert response.status_code == 404
    assert response.is_json
    assert "User not found" in response.json["error"]


def test_add_achievement_get(client, init_db, sample_admin, mock_render_template):
    """Test GET request to add achievement page."""
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    response = client.get("/achievements/add")
    assert response.status_code == 200
    assert b"Mocked Template Content" in response.data


def test_user_achievement_uniqueness(init_db, sample_user, sample_achievement):
    """Test that the same achievement cannot be earned twice by a user."""
    ua1 = UserAchievement(user_id=sample_user.id, achievement_id=sample_achievement.id)
    db.session.add(ua1)
    db.session.commit()

    # Try to create duplicate
    ua2 = UserAchievement(user_id=sample_user.id, achievement_id=sample_achievement.id)
    db.session.add(ua2)

    # We expect a Database Integrity Error
    with pytest.raises(Exception) as excinfo:
        db.session.commit()

    assert (
        "integrity" in str(excinfo.value).lower()
        or "unique" in str(excinfo.value).lower()
    )
    db.session.rollback()


def test_achievement_types(init_db):
    """Test creating achievements with different types."""
    achievement_types = [
        ("ducks", "Duck Collector", "Collect ducks", "50"),
        ("project", "Project Master", "Complete projects", "3"),
        ("progress", "Progressor", "Make progress", "75"),
        ("chat", "Chatterbox", "Send messages", "100"),
        ("consistency", "Consistent", "Daily login streak", "7"),
        ("community", "Community Helper", "Help others", "10"),
        ("session", "Session Pro", "Complete sessions", "5"),
        ("trade", "Trader", "Complete trades", "3"),
        ("certificate", "Certified", "Earn certificate", None),
    ]

    for ach_type, name, desc, req_val in achievement_types:
        achievement = Achievement(
            name=name,
            slug=f"{ach_type}-test",
            type=ach_type,
            reward=10,
            description=desc,
            requirement_value=req_val,
        )
        db.session.add(achievement)

    db.session.commit()

    for ach_type, _, _, _ in achievement_types:
        ach = Achievement.query.filter_by(type=ach_type).first()
        assert ach is not None
        assert ach.type == ach_type


def test_achievement_reward_values(init_db):
    """Test achievements with different reward values."""
    achievements = [
        Achievement(
            name="Small",
            slug="small-1",
            type="ducks",
            reward=1,
            description="Small reward",
        ),
        Achievement(
            name="Medium",
            slug="medium-50",
            type="ducks",
            reward=50,
            description="Medium reward",
        ),
        Achievement(
            name="Large",
            slug="large-100",
            type="ducks",
            reward=100,
            description="Large reward",
        ),
        Achievement(
            name="Huge",
            slug="huge-500",
            type="ducks",
            reward=500,
            description="Huge reward",
        ),
    ]

    db.session.add_all(achievements)
    db.session.commit()

    small = Achievement.query.filter_by(slug="small-1").first()
    assert small.reward == 1

    huge = Achievement.query.filter_by(slug="huge-500").first()
    assert huge.reward == 500


def test_user_achievement_earned_at_timestamp(init_db, sample_user, sample_achievement):
    """Test that earned_at timestamp is set when achievement is earned."""
    from datetime import datetime

    before_time = datetime.utcnow()

    user_achievement = UserAchievement(
        user_id=sample_user.id, achievement_id=sample_achievement.id
    )
    db.session.add(user_achievement)
    db.session.commit()

    after_time = datetime.utcnow()

    assert user_achievement.earned_at is not None
    # Allow for small time differences in test execution
    assert before_time <= user_achievement.earned_at <= after_time


def test_calculate_consistency_year_transition(init_db, sample_user):
    """Test that consistency streak handles 53-week year transitions correctly."""
    from datetime import datetime

    from application.models.challenge_log import ChallengeLog
    from application.services.achievement_engine import _calculate_consistency

    # 2020 was a 53-week year:
    # 2020 ISO week 52 Monday is 2020-12-21
    # 2020 ISO week 53 Monday is 2020-12-28
    # 2021 ISO week 1 Monday is 2021-01-04
    ts_w52 = datetime(2020, 12, 22)
    ts_w53 = datetime(2020, 12, 29)
    ts_w1 = datetime(2021, 1, 5)

    log1 = ChallengeLog(
        user_id=sample_user.id,
        domain="python",
        challenge_slug="challenge-1",
        timestamp=ts_w52,
    )
    log2 = ChallengeLog(
        user_id=sample_user.id,
        domain="python",
        challenge_slug="challenge-2",
        timestamp=ts_w53,
    )
    log3 = ChallengeLog(
        user_id=sample_user.id,
        domain="python",
        challenge_slug="challenge-3",
        timestamp=ts_w1,
    )

    db.session.add_all([log1, log2, log3])
    db.session.commit()

    streak = _calculate_consistency(sample_user.id)
    assert streak == 3


def test_add_achievement_get_json(client, init_db, sample_admin):
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id
    response = client.get("/achievements/add", headers={"Accept": "application/json"})
    assert response.status_code == 200
    assert response.json["status"] == "ready"


def test_add_achievement_post_json(client, init_db, sample_admin):
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id
    response = client.post(
        "/achievements/add",
        json={
            "name": "JSON Achievement",
            "slug": "json-ach",
            "description": "desc",
            "type": "ducks",
            "reward": 10,
        },
    )
    assert response.status_code == 200
    assert response.json["status"] == "success"
    ach = Achievement.query.filter_by(slug="json-ach").first()
    assert ach is not None


def test_add_achievement_missing_fields(client, init_db, sample_admin):
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id
    response = client.post("/achievements/add", data={"name": ""})
    assert response.status_code == 400
    assert response.json["status"] == "error"
    assert "required" in response.json["message"]


def test_add_achievement_duplicate_slug(
    client, init_db, sample_admin, sample_achievement
):
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id
    response = client.post(
        "/achievements/add",
        data={
            "name": "Duplicate",
            "slug": sample_achievement.slug,
            "type": "ducks",
            "reward": 10,
        },
    )
    assert response.status_code == 400
    assert response.json["status"] == "error"
    assert "already exists" in response.json["message"]


@patch("werkzeug.datastructures.FileStorage.save")
@patch("application.routes.achievement_routes.allowed_file")
@patch("application.routes.achievement_routes.os.makedirs")
@patch("application.routes.achievement_routes.subprocess.run")
def test_add_achievement_with_badge(
    mock_subprocess,
    mock_makedirs,
    mock_allowed,
    mock_save,
    client,
    init_db,
    sample_admin,
):
    mock_allowed.return_value = True
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    img_data = b"fake image"
    img_file = (BytesIO(img_data), "badge.png")

    response = client.post(
        "/achievements/add",
        data={
            "name": "Badge Ach",
            "slug": "badge-ach",
            "type": "ducks",
            "reward": 10,
            "badge": img_file,
        },
        content_type="multipart/form-data",
    )
    assert response.status_code == 200
    assert response.json["status"] == "success"
    mock_subprocess.assert_called_once()
    mock_save.assert_called_once()


@patch("application.routes.achievement_routes.allowed_file")
def test_add_achievement_invalid_badge_ext(mock_allowed, client, init_db, sample_admin):
    mock_allowed.return_value = False
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    img_data = b"fake image"
    img_file = (BytesIO(img_data), "badge.txt")

    response = client.post(
        "/achievements/add",
        data={
            "name": "Badge Ach 2",
            "slug": "badge-ach-2",
            "type": "ducks",
            "reward": 10,
            "badge": img_file,
        },
        content_type="multipart/form-data",
    )
    assert response.status_code == 200
    assert response.json["status"] == "error"
    assert "Invalid badge file type" in response.json["message"]


@patch("werkzeug.datastructures.FileStorage.save")
@patch("application.routes.achievement_routes.allowed_file")
@patch("application.routes.achievement_routes.subprocess.run")
def test_add_achievement_badge_subprocess_fail(
    mock_subprocess, mock_allowed, mock_save, client, init_db, sample_admin
):
    import subprocess

    mock_allowed.return_value = True
    mock_subprocess.side_effect = subprocess.CalledProcessError(
        1, "cmd", stderr="error"
    )
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    img_file = (BytesIO(b"fake image"), "badge.png")
    response = client.post(
        "/achievements/add",
        data={
            "name": "Badge Ach 3",
            "slug": "badge-ach-3",
            "type": "ducks",
            "reward": 10,
            "badge": img_file,
        },
        content_type="multipart/form-data",
    )
    assert response.status_code == 500
    assert response.json["status"] == "error"


@patch("werkzeug.datastructures.FileStorage.save")
@patch("application.routes.achievement_routes.allowed_file")
@patch("application.routes.achievement_routes.subprocess.run")
def test_add_achievement_badge_subprocess_exception(
    mock_subprocess, mock_allowed, mock_save, client, init_db, sample_admin
):
    mock_allowed.return_value = True
    mock_subprocess.side_effect = Exception("unexpected error")
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    img_file = (BytesIO(b"fake image"), "badge.png")
    response = client.post(
        "/achievements/add",
        data={
            "name": "Badge Ach 4",
            "slug": "badge-ach-4",
            "type": "ducks",
            "reward": 10,
            "badge": img_file,
        },
        content_type="multipart/form-data",
    )
    assert response.status_code == 500
    assert response.json["status"] == "error"


def test_submit_certificate_get_json(client, init_db, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
    response = client.get(
        "/achievements/submit_certificate", headers={"Accept": "application/json"}
    )
    assert response.status_code == 200
    assert response.json["status"] == "ready"


def test_view_certificate(
    client, init_db, sample_admin, sample_user, sample_achievement
):
    cert = UserCertificate(
        user_id=sample_user.id,
        achievement_id=sample_achievement.id,
        url="http://test",
        file_path="test.pdf",
    )
    db.session.add(cert)
    db.session.commit()
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    with patch(
        "application.routes.achievement_routes.os.path.exists", return_value=False
    ):
        response = client.get(f"/achievements/view_certificate/{cert.id}")
        assert response.status_code == 404

    with (
        patch(
            "application.routes.achievement_routes.os.path.exists", return_value=True
        ),
        patch(
            "application.routes.achievement_routes.send_from_directory",
            return_value="fake_file",
        ),
    ):
        response = client.get(f"/achievements/view_certificate/{cert.id}")
        assert response.status_code == 200


def test_view_certificate_is_public(client, init_db, sample_user, sample_achievement):
    """Certificate viewing is intentionally public (no login required) —
    this is a disclosed and accepted tradeoff, not an oversight."""
    cert = UserCertificate(
        user_id=sample_user.id,
        achievement_id=sample_achievement.id,
        url="http://test",
        file_path="test.pdf",
    )
    db.session.add(cert)
    db.session.commit()

    with (
        patch(
            "application.routes.achievement_routes.os.path.exists", return_value=True
        ),
        patch(
            "application.routes.achievement_routes.send_from_directory",
            return_value="fake_file",
        ),
    ):
        response = client.get(f"/achievements/view_certificate/{cert.id}")
        assert response.status_code == 200


def test_admin_certificates(client, init_db, sample_admin):
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id
    response = client.get("/achievements/admin/certificates")
    assert response.status_code == 200


def test_mark_reviewed(client, init_db, sample_admin, sample_user, sample_achievement):
    cert = UserCertificate(
        user_id=sample_user.id,
        achievement_id=sample_achievement.id,
        url="http://test",
        file_path="test.pdf",
    )
    db.session.add(cert)
    db.session.commit()
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    response = client.post(
        f"/achievements/admin/certificates/reviewed/{cert.id}",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert response.status_code == 200
    assert response.json["status"] == "success"
    assert cert.status == "approved"

    cert.status = "pending"
    db.session.commit()
    response2 = client.post(f"/achievements/admin/certificates/reviewed/{cert.id}")
    assert response2.status_code == 302


def test_reject_certificate(client, init_db, sample_admin, sample_user, sample_achievement):
    cert = UserCertificate(
        user_id=sample_user.id,
        achievement_id=sample_achievement.id,
        url="http://test",
        file_path="test.pdf",
    )
    db.session.add(cert)
    db.session.commit()
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    response = client.post(
        f"/achievements/admin/certificates/reject/{cert.id}",
        json={"review_note": "Not a valid certificate."},
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert response.status_code == 200
    assert response.json["status"] == "success"
    assert cert.status == "rejected"
    assert cert.review_note == "Not a valid certificate."

    cert.status = "pending"
    cert.review_note = None
    db.session.commit()
    response2 = client.post(f"/achievements/admin/certificates/reject/{cert.id}")
    assert response2.status_code == 302


def test_download_certificate(
    client, init_db, sample_admin, sample_user, sample_achievement
):
    cert = UserCertificate(
        user_id=sample_user.id,
        achievement_id=sample_achievement.id,
        url="http://test",
        file_path="test.pdf",
    )
    db.session.add(cert)
    db.session.commit()
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    with patch(
        "application.routes.achievement_routes.os.path.exists", return_value=False
    ):
        response = client.get(f"/achievements/download_certificate/{cert.id}")
        assert response.status_code == 302

    with (
        patch(
            "application.routes.achievement_routes.os.path.exists", return_value=True
        ),
        patch(
            "application.routes.achievement_routes.send_from_directory",
            return_value="fake_file",
        ),
    ):
        response = client.get(f"/achievements/download_certificate/{cert.id}")
        assert response.status_code == 200


def test_mark_all_reviewed(
    client, init_db, sample_admin, sample_user, sample_achievement
):
    # Just need one cert to test the logic
    cert1 = UserCertificate(
        user_id=sample_user.id,
        achievement_id=sample_achievement.id,
        url="http://test1",
        file_path="test1.pdf",
    )
    db.session.add(cert1)
    db.session.commit()
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    response = client.post(
        "/achievements/admin/certificates/reviewed/all",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert response.status_code == 200
    assert cert1.status == "approved"

    cert1.status = "pending"
    db.session.commit()
    response2 = client.post("/achievements/admin/certificates/reviewed/all")
    assert response2.status_code == 302


@patch("application.routes.achievement_routes.io.BytesIO")
@patch("application.routes.achievement_routes.zipfile.ZipFile")
def test_download_all_certificates(
    mock_zip,
    mock_bytesio,
    client,
    init_db,
    sample_admin,
    sample_user,
    sample_achievement,
):
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    # No certs
    response = client.get("/achievements/admin/certificates/download_all")
    assert response.status_code == 302

    cert = UserCertificate(
        user_id=sample_user.id,
        achievement_id=sample_achievement.id,
        url="http://test",
        file_path="test.pdf",
    )
    db.session.add(cert)
    db.session.commit()

    with (
        patch(
            "application.routes.achievement_routes.os.path.exists", return_value=True
        ),
        patch(
            "application.routes.achievement_routes.send_file", return_value="fake_zip"
        ),
    ):
        response = client.get("/achievements/admin/certificates/download_all")
        assert response.status_code == 200


def test_admin_certificate_templates(client, init_db, sample_admin):
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id
    response = client.get("/achievements/admin/certificate_templates")
    assert response.status_code == 200
    assert "templates" in response.json.get("data", response.json)


def test_admin_certificate_templates_view(client, init_db, sample_admin):
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id
    with patch("application.routes.achievement_routes.send_from_directory", return_value="fake_file"):
        response = client.get("/achievements/admin/certificate_templates/cs-1/view")
        assert response.status_code == 200


def test_admin_certificate_templates_upload(client, init_db, sample_admin):
    from io import BytesIO
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id
    img_data = b"fake pdf content"
    img_file = (BytesIO(img_data), "template.pdf")
    with patch("werkzeug.datastructures.FileStorage.save"):
        response = client.post(
            "/achievements/admin/certificate_templates/cs-1/upload",
            data={"template_file": img_file},
            content_type="multipart/form-data"
        )
        assert response.status_code == 200
        assert response.json["success"] is True


def test_admin_certificate_templates_test_generate(client, init_db, sample_admin):
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id
    with patch("application.utilities.cert_generator.generate_certificate", return_value=b"fake pdf content"), patch("application.routes.achievement_routes.send_file", return_value="fake_file"):
        response = client.post(
            "/achievements/admin/certificate_templates/cs-1/test_generate",
            data={"student_name": "Test Student"}
        )
        assert response.status_code == 200


def test_get_achievements_json_success(client, init_db, sample_user, sample_achievement):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/achievements/all")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert "achievements" in data["data"]


def test_get_achievements_json_no_user(client, init_db):
    response = client.get("/achievements/all")
    assert response.status_code == 404
    assert response.get_json()["error"] == "User not found!"


def test_submit_certificate_generation_failure(client, init_db, sample_user, sample_achievement):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    valid_url = f"https://codecombat.com/certificates/abc123?course={sample_achievement.slug}"

    with patch("application.utilities.cert_generator.generate_certificate", side_effect=Exception("Generator Failed")):
        response = client.post(
            "/achievements/submit_certificate",
            data={"certificate_url": valid_url},
            content_type="multipart/form-data",
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert response.status_code == 500
        assert "Failed to generate certificate" in response.get_json()["error"]


def test_admin_certificate_templates_view_fallback_and_error(client, init_db, sample_admin):
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    # Fallback preview generation
    with patch("os.path.exists", return_value=False), patch("application.utilities.cert_generator.generate_certificate", return_value=b"generated pdf"):
        response = client.get("/achievements/admin/certificate_templates/cs-1/view")
        assert response.status_code == 200

    # Exception during fallback preview generation
    with patch("os.path.exists", return_value=False), patch("application.utilities.cert_generator.generate_certificate", side_effect=Exception("Render error")):
        response = client.get("/achievements/admin/certificate_templates/cs-1/view")
        assert response.status_code == 500
        assert response.get_json()["error"] == "Render error"


def test_admin_certificate_templates_upload_invalid_file(client, init_db, sample_admin):
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    # No file uploaded
    res1 = client.post("/achievements/admin/certificate_templates/cs-1/upload", data={})
    assert res1.status_code == 400
    assert res1.get_json()["error"] == "No file uploaded"

    # Non-PDF file
    file_data = (BytesIO(b"not a pdf"), "test.txt")
    res2 = client.post(
        "/achievements/admin/certificate_templates/cs-1/upload",
        data={"template_file": file_data},
        content_type="multipart/form-data"
    )
    assert res2.status_code == 400
    assert res2.get_json()["error"] == "Only PDF files allowed"


def test_admin_certificate_templates_test_generate_error(client, init_db, sample_admin):
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    with patch("application.utilities.cert_generator.generate_certificate", side_effect=Exception("Test gen error")):
        response = client.post(
            "/achievements/admin/certificate_templates/cs-1/test_generate",
            data={"student_name": "Test Student"}
        )
        assert response.status_code == 500
        assert response.get_json()["error"] == "Test gen error"

