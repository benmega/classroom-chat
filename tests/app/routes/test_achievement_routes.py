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


# --- FIXTURES ---


@pytest.fixture
def mock_render_template(client):
    """
    Mocks render_template to prevent TemplateNotFound errors if templates are missing.
    """
    with patch("application.routes.achievement_routes.render_template") as mock:
        mock.return_value = "Mocked Template Content"
        yield mock


# --- TESTS ---


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

    # Patch 'local_only' to allow the test client request
    with patch("application.routes.achievement_routes.local_only", lambda f: f):
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

    # Check the database to confirm it worked
    ach = Achievement.query.filter_by(slug="javascript-advanced").first()
    assert ach is not None
    assert ach.name == "JavaScript Expert"
    assert ach.reward == 10


def test_add_achievement_no_requirement(client, init_db, sample_admin):
    """Test creating achievement without requirement value."""
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    with patch("application.routes.achievement_routes.local_only", lambda f: f):
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
    initial_count = Achievement.query.count()

    # Pass a non-local IP to trigger the 403 Forbidden
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

    # Ensure the achievement was NOT added
    final_count = Achievement.query.count()
    assert final_count == initial_count
    assert response.status_code == 403


def test_submit_certificate_get(client, init_db, sample_user, mock_render_template):
    """Test GET request to submit certificate page."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/achievements/submit_certificate")
    assert response.status_code == 200
    assert b"Mocked Template Content" in response.data


def test_submit_certificate_valid(client, init_db, sample_user, sample_achievement):
    """Test submitting a valid certificate via AJAX."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    pdf_data = b"%PDF-1.4 mock pdf content"
    pdf_file = (BytesIO(pdf_data), "certificate.pdf")
    valid_url = (
        f"https://codecombat.com/certificates/abc123?course={sample_achievement.slug}"
    )

    # Use X-Requested-With to get a JSON response
    response = client.post(
        "/achievements/submit_certificate",
        data={"certificate_url": valid_url, "certificate_file": pdf_file},
        content_type="multipart/form-data",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )

    assert response.status_code == 200
    assert response.is_json
    data = response.get_json()
    assert data.get("success") is True

    # Verify Database Side Effects
    cert = UserCertificate.query.filter_by(url=valid_url).first()
    assert cert is not None
    assert cert.user_id == sample_user.id


def test_submit_certificate_invalid_url(client, init_db, sample_user):
    """Test submitting certificate with invalid URL."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    initial_count = UserCertificate.query.count()
    pdf_file = (BytesIO(b"pdf"), "certificate.pdf")

    response = client.post(
        "/achievements/submit_certificate",
        data={
            "certificate_url": "https://invalid-url.com",
            "certificate_file": pdf_file,
        },
        content_type="multipart/form-data",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )

    assert response.status_code == 200

    # Check that no record was created
    assert UserCertificate.query.count() == initial_count

    assert response.is_json
    assert response.json.get("success") is False
    assert "Invalid certificate URL" in response.json.get("error", "")


def test_submit_certificate_no_matching_achievement(client, init_db, sample_user):
    """Test submitting certificate for non-existent achievement."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    initial_count = UserCertificate.query.count()
    pdf_file = (BytesIO(b"pdf"), "certificate.pdf")

    response = client.post(
        "/achievements/submit_certificate",
        data={
            "certificate_url": "https://codecombat.com/certificates/abc123?course=nonexistent-course",
            "certificate_file": pdf_file,
        },
        content_type="multipart/form-data",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )

    assert response.status_code == 200
    assert UserCertificate.query.count() == initial_count

    assert response.is_json
    assert response.json.get("success") is False
    assert "No matching achievement" in response.json.get("error", "")


def test_submit_certificate_no_file(client, init_db, sample_user, sample_achievement):
    """Test submitting certificate without file."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post(
        "/achievements/submit_certificate",
        data={
            "certificate_url": f"https://codecombat.com/certificates/abc123?course={sample_achievement.slug}"
        },
        content_type="multipart/form-data",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )

    assert response.status_code == 200

    assert response.is_json
    assert response.json.get("success") is False
    assert "required" in response.json.get("error", "").lower()


def test_submit_certificate_invalid_file_type(
    client, init_db, sample_user, sample_achievement
):
    """Test submitting certificate with invalid file type."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    initial_count = UserCertificate.query.count()
    txt_file = (BytesIO(b"text"), "certificate.txt")

    response = client.post(
        "/achievements/submit_certificate",
        data={
            "certificate_url": f"https://codecombat.com/certificates/abc123?course={sample_achievement.slug}",
            "certificate_file": txt_file,
        },
        content_type="multipart/form-data",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )

    assert response.status_code == 200
    assert UserCertificate.query.count() == initial_count

    assert response.is_json
    assert response.json.get("success") is False


def test_submit_certificate_update_existing(
    client, init_db, sample_user, sample_achievement
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
    pdf_file = (BytesIO(b"new pdf"), "new.pdf")
    new_url = (
        f"https://codecombat.com/certificates/new?course={sample_achievement.slug}"
    )

    response = client.post(
        "/achievements/submit_certificate",
        data={"certificate_url": new_url, "certificate_file": pdf_file},
        content_type="multipart/form-data",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )

    assert response.status_code == 200
    assert response.json.get("success") is True

    # Check that count is still 1 (uniqueness constraint) and values updated
    assert UserCertificate.query.count() == 1
    updated_cert = UserCertificate.query.get(old_id)
    assert updated_cert.url == new_url
    assert updated_cert.file_path != "old.pdf"


def test_submit_certificate_no_user(client, init_db):
    """Test submitting certificate without logged in user."""
    # Direct POST without session
    response = client.post(
        "/achievements/submit_certificate",
        data={
            "certificate_url": "https://codecombat.com/certificates/abc?course=test",
            "certificate_file": (BytesIO(b"test"), "test.pdf"),
        },
        content_type="multipart/form-data",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )

    # Route returns 400 with JSON error when user not found in API mode
    assert response.status_code == 400
    assert response.json["success"] is False


def test_achievements_page_no_user(client, init_db):
    """Test achievements page without logged in user."""
    response = client.get("/achievements/")

    # Per your route code, returns 404 with JSON error if user not found
    assert response.status_code == 404
    assert response.is_json
    assert "User not found" in response.json["error"]


def test_add_achievement_get(client, init_db, sample_admin, mock_render_template):
    """Test GET request to add achievement page."""
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    with patch("application.routes.achievement_routes.local_only", lambda f: f):
        response = client.get("/achievements/add")
        assert response.status_code == 200
        assert b"Mocked Template Content" in response.data


def test_user_achievement_uniqueness(init_db, sample_user, sample_achievement):
    """Test that the same achievement cannot be earned twice by a user."""
    # Create first user achievement
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
