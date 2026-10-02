"""
File: test_achievement_routes.py
Type: py
Summary: Unit tests for achievement routes Flask routes.
"""

import os
import re
import zipfile
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from application.extensions import db
from application.models.achievements import Achievement, UserAchievement
from application.models.user_certificate import UserCertificate
from application.routes import achievement_routes
from application.routes.achievement_routes import (
    CERT_URL_REGEX,
    MAX_CERT_URL_LENGTH,
    _certificate_download_name,
)
from application.utilities.helper_functions import utcnow_naive
from PIL import Image
from sqlalchemy.exc import IntegrityError
from tests.factories import (
    AchievementFactory,
    AdminFactory,
    UserAchievementFactory,
    UserFactory,
)
from tests.image_helpers import animated_gif_bytes, image_bytes, jpeg_bytes, png_bytes


@pytest.fixture
def test_user(init_db):
    user = UserFactory()
    db.session.commit()
    return user

@pytest.fixture
def test_admin(init_db):
    admin = AdminFactory()
    db.session.commit()
    return admin

@pytest.fixture
def test_achievement(init_db):
    ach = AchievementFactory(type='ducks', requirement_value='100')
    db.session.commit()
    return ach


REAL_BADGE_DIR = achievement_routes._badge_dir  # the autouse fixture below replaces it per test


@pytest.fixture(autouse=True)
def badge_dir(tmp_path, monkeypatch):
    """Badges are written to a scratch folder, never to the real static/images/achievement_badges."""
    folder = tmp_path / "achievement_badges"
    monkeypatch.setattr(achievement_routes, "_badge_dir", lambda: str(folder))
    return folder



def test_add_achievement_post(client, init_db, test_admin):
    """Test POST request to create a new achievement (Admin)."""
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = client.post(
        "/api/achievements/add",
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


def test_add_achievement_no_requirement(client, init_db, test_admin):
    """Test creating achievement without requirement value."""
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = client.post(
        "/api/achievements/add",
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

    response = client.post(
        "/api/achievements/add",
        data={
            "name": "Test Achievement",
            "slug": "test-ach",
            "type": "certificate",
            "reward": 10,
        },
        environ_base={"REMOTE_ADDR": "8.8.8.8"},
    )

    assert response.status_code == 401
    assert Achievement.query.count() == initial_count
    assert Achievement.query.filter_by(slug="test-ach").first() is None


def test_submit_certificate_valid(client, init_db, test_user, test_achievement):
    """Test submitting a valid certificate via AJAX."""
    with client.session_transaction() as sess:
        sess["user"] = test_user.id

    valid_url = (
        f"https://codecombat.com/certificates/abc123?course={test_achievement.slug}"
    )

    # Use X-Requested-With to get a JSON response
    response = client.post(
        "/api/achievements/submit_certificate",
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
    assert cert.user_id == test_user.id
    assert cert.status == "pending"
    assert cert.is_auto_recommended is True


def test_submit_certificate_invalid_url(client, init_db, test_user):
    """Test submitting certificate with invalid URL."""
    with client.session_transaction() as sess:
        sess["user"] = test_user.id

    initial_count = db.session.query(UserCertificate).count()

    response = client.post(
        "/api/achievements/submit_certificate",
        data={
            "certificate_url": "https://invalid-url.com",
        },
        content_type="multipart/form-data",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )

    assert response.status_code == 400

    assert db.session.query(UserCertificate).count() == initial_count

    assert response.is_json
    assert response.json.get("success") is False
    assert "Invalid certificate URL" in response.json.get("error", "")


def test_submit_certificate_no_matching_achievement(client, init_db, test_user):
    """Test submitting certificate for non-existent achievement."""
    with client.session_transaction() as sess:
        sess["user"] = test_user.id

    initial_count = db.session.query(UserCertificate).count()

    response = client.post(
        "/api/achievements/submit_certificate",
        data={
            "certificate_url": "https://codecombat.com/certificates/abc123?course=nonexistent-course",
        },
        content_type="multipart/form-data",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )

    assert response.status_code == 422
    assert db.session.query(UserCertificate).count() == initial_count

    assert response.is_json
    assert response.json.get("success") is False
    assert "No matching achievement" in response.json.get("error", "")





def test_submit_certificate_update_existing(
    client, init_db, test_user, test_achievement
):
    """Test updating an existing certificate submission."""
    with client.session_transaction() as sess:
        sess["user"] = test_user.id

    # Pre-seed a certificate
    initial_cert = UserCertificate(
        user_id=test_user.id,
        achievement_id=test_achievement.id,
        url="https://codecombat.com/certificates/old?course=test",
        file_path="old.pdf",
    )
    db.session.add(initial_cert)
    db.session.commit()

    old_id = initial_cert.id

    # Submit new data
    new_url = (
        f"https://codecombat.com/certificates/new?course={test_achievement.slug}"
    )

    response = client.post(
        "/api/achievements/submit_certificate",
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
        "/api/achievements/submit_certificate",
        data={
            "certificate_url": "https://codecombat.com/certificates/abc?course=test",
        },
        content_type="multipart/form-data",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )

    assert response.status_code == 400
    assert response.json["success"] is False


def test_user_achievement_uniqueness(init_db, test_user, test_achievement):
    """Test that the same achievement cannot be earned twice by a user."""
    ua1 = UserAchievement(user_id=test_user.id, achievement_id=test_achievement.id)
    db.session.add(ua1)
    db.session.commit()

    # Try to create duplicate
    ua2 = UserAchievement(user_id=test_user.id, achievement_id=test_achievement.id)
    db.session.add(ua2)

    # The unique (user_id, achievement_id) constraint rejects the second row
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()

    assert (
        UserAchievement.query.filter_by(
            user_id=test_user.id, achievement_id=test_achievement.id
        ).count()
        == 1
    )


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


def test_user_achievement_earned_at_timestamp(init_db, test_user, test_achievement):
    """Test that earned_at timestamp is set when achievement is earned."""
    before_time = utcnow_naive()

    user_achievement = UserAchievement(
        user_id=test_user.id, achievement_id=test_achievement.id
    )
    db.session.add(user_achievement)
    db.session.commit()

    after_time = utcnow_naive()

    assert user_achievement.earned_at is not None
    # Allow for small time differences in test execution
    assert before_time <= user_achievement.earned_at <= after_time


def test_calculate_consistency_year_transition(init_db, test_user):
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
        user_id=test_user.id,
        domain="python",
        challenge_slug="challenge-1",
        timestamp=ts_w52,
    )
    log2 = ChallengeLog(
        user_id=test_user.id,
        domain="python",
        challenge_slug="challenge-2",
        timestamp=ts_w53,
    )
    log3 = ChallengeLog(
        user_id=test_user.id,
        domain="python",
        challenge_slug="challenge-3",
        timestamp=ts_w1,
    )

    db.session.add_all([log1, log2, log3])
    db.session.commit()

    streak = _calculate_consistency(test_user.id)
    assert streak == 3


def test_add_achievement_post_json(client, init_db, test_admin):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id
    response = client.post(
        "/api/achievements/add",
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


def test_add_achievement_missing_fields(client, init_db, test_admin):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id
    response = client.post("/api/achievements/add", data={"name": ""})
    assert response.status_code == 400
    assert response.json["status"] == "error"
    assert "required" in response.json["message"]


def test_add_achievement_duplicate_slug(
    client, init_db, test_admin, test_achievement
):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id
    response = client.post(
        "/api/achievements/add",
        data={
            "name": "Duplicate",
            "slug": test_achievement.slug,
            "type": "ducks",
            "reward": 10,
        },
    )
    assert response.status_code == 400
    assert response.json["status"] == "error"
    assert "already exists" in response.json["message"]


@patch("application.routes.achievement_routes.subprocess.run")
def test_add_achievement_with_badge(
    mock_subprocess,
    client,
    init_db,
    test_admin,
    badge_dir,
):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    img_data = png_bytes()
    img_file = (BytesIO(img_data), "badge.png")

    response = client.post(
        "/api/achievements/add",
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
    assert mock_subprocess.call_args.kwargs["timeout"] == achievement_routes.SPRITE_REBUILD_TIMEOUT
    assert [p.name for p in badge_dir.iterdir()] == ["badge-ach.png"]
    assert Achievement.query.filter_by(slug="badge-ach").one().name == "Badge Ach"


@patch("application.routes.achievement_routes.allowed_file")
def test_add_achievement_invalid_badge_ext(mock_allowed, client, init_db, test_admin):
    mock_allowed.return_value = False
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    img_data = b"fake image"
    img_file = (BytesIO(img_data), "badge.txt")

    response = client.post(
        "/api/achievements/add",
        data={
            "name": "Badge Ach 2",
            "slug": "badge-ach-2",
            "type": "ducks",
            "reward": 10,
            "badge": img_file,
        },
        content_type="multipart/form-data",
    )
    assert response.status_code == 400
    assert response.json["status"] == "error"
    assert "Invalid badge file type" in response.json["message"]
    assert Achievement.query.filter_by(slug="badge-ach-2").first() is None


@pytest.mark.parametrize("filename", ["badge.gif", "badge.svg"])
@patch("werkzeug.datastructures.FileStorage.save")
@patch("application.routes.achievement_routes.subprocess.run")
def test_add_achievement_rejects_gif_and_svg_badges(
    mock_subprocess, mock_save, filename, client, init_db, test_admin
):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = client.post(
        "/api/achievements/add",
        data={
            "name": "Bad Badge",
            "slug": "bad-badge",
            "type": "ducks",
            "reward": 10,
            "badge": (BytesIO(b"fake image"), filename),
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert response.json["status"] == "error"
    assert "Invalid badge file type" in response.json["message"]
    mock_save.assert_not_called()
    mock_subprocess.assert_not_called()
    assert Achievement.query.filter_by(slug="bad-badge").first() is None


@pytest.mark.parametrize(
    "slug",
    ["Bad Slug", "../x", "a/b", "a\\b", "UPPER", "under_score", "dot.png", " lead"],
)
def test_add_achievement_rejects_unsafe_slug(client, init_db, test_admin, slug):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = client.post(
        "/api/achievements/add",
        data={"name": "Unsafe", "slug": slug, "type": "ducks", "reward": 10},
    )

    assert response.status_code == 400
    assert response.json["status"] == "error"
    assert "Slug may only contain" in response.json["message"]
    assert Achievement.query.filter_by(name="Unsafe").first() is None


def test_add_achievement_rejects_non_string_json_slug(client, init_db, test_admin):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = client.post(
        "/api/achievements/add", json={"name": "Num", "slug": 123, "type": "ducks"}
    )

    assert response.status_code == 400
    assert "Slug may only contain" in response.json["message"]


@pytest.mark.parametrize("reward", ["abc", "1.5", "0", "-3", "1e3"])
def test_add_achievement_rejects_invalid_reward(client, init_db, test_admin, reward):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = client.post(
        "/api/achievements/add",
        data={"name": "Bad Reward", "slug": "bad-reward", "reward": reward},
    )

    assert response.status_code == 400
    assert response.json["status"] == "error"
    assert "whole number" in response.json["message"]
    assert Achievement.query.filter_by(slug="bad-reward").first() is None


@pytest.mark.parametrize("reward", [1.5, 0, True, "nan", [1]])
def test_add_achievement_rejects_invalid_json_reward(
    client, init_db, test_admin, reward
):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = client.post(
        "/api/achievements/add",
        json={"name": "Bad JSON Reward", "slug": "bad-json-reward", "reward": reward},
    )

    assert response.status_code == 400
    assert "whole number" in response.json["message"]


@pytest.mark.parametrize(
    "form, expected",
    [({}, 1), ({"reward": ""}, 1), ({"reward": " 7 "}, 7), ({"reward": "12"}, 12)],
)
def test_add_achievement_reward_defaults_and_parsing(
    client, init_db, test_admin, form, expected
):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = client.post(
        "/api/achievements/add", data={"name": "Rewarded", "slug": "rewarded", **form}
    )

    assert response.status_code == 200
    assert Achievement.query.filter_by(slug="rewarded").one().reward == expected


def _login_admin(client, admin):
    with client.session_transaction() as sess:
        sess["user"] = admin.id


def test_edit_achievement_updates_name_slug_and_reward(client, init_db, test_admin, test_achievement):
    _login_admin(client, test_admin)

    response = client.put(
        f"/api/achievements/edit/{test_achievement.id}",
        data={"name": "Renamed", "slug": "renamed-slug", "reward": "25"},
    )

    assert response.status_code == 200
    ach = db.session.get(Achievement, test_achievement.id)
    assert (ach.name, ach.slug, ach.reward) == ("Renamed", "renamed-slug", 25)


@pytest.mark.parametrize("slug", ["Bad Slug", "../x", "a/b"])
def test_edit_achievement_rejects_unsafe_slug(
    client, init_db, test_admin, test_achievement, slug
):
    _login_admin(client, test_admin)
    old_slug, old_name = test_achievement.slug, test_achievement.name

    response = client.put(
        f"/api/achievements/edit/{test_achievement.id}",
        data={"name": "Changed", "slug": slug},
    )

    assert response.status_code == 400
    assert "Slug may only contain" in response.json["message"]
    db.session.expire_all()
    ach = db.session.get(Achievement, test_achievement.id)
    assert (ach.slug, ach.name) == (old_slug, old_name)


def test_edit_achievement_accepts_unchanged_legacy_slug(
    client, init_db, test_admin, test_achievement
):
    """An achievement created before slugs were restricted stays editable."""
    test_achievement.slug = "Legacy_Slug"
    db.session.commit()
    _login_admin(client, test_admin)

    response = client.put(
        f"/api/achievements/edit/{test_achievement.id}",
        data={"name": "Still Editable", "slug": "Legacy_Slug", "reward": "3"},
    )

    assert response.status_code == 200
    ach = db.session.get(Achievement, test_achievement.id)
    assert (ach.name, ach.slug, ach.reward) == ("Still Editable", "Legacy_Slug", 3)


@patch("application.routes.achievement_routes.subprocess.run")
def test_edit_achievement_legacy_slug_still_gets_its_badge(
    mock_subprocess, client, init_db, test_admin, test_achievement, badge_dir
):
    """A path-safe slug that predates SLUG_RE can still have a badge uploaded."""
    test_achievement.slug = "Legacy_Slug"
    db.session.commit()
    _login_admin(client, test_admin)

    response = client.put(
        f"/api/achievements/edit/{test_achievement.id}",
        data={"slug": "Legacy_Slug", "badge": (BytesIO(png_bytes()), "badge.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    assert [p.name for p in badge_dir.iterdir()] == ["Legacy_Slug.png"]
    mock_subprocess.assert_called_once()


@pytest.mark.parametrize("stored_slug", ["../evil", "sub/dir"])
@patch("application.routes.achievement_routes.subprocess.run")
def test_edit_achievement_never_writes_a_badge_outside_the_badge_dir(
    mock_subprocess, stored_slug, client, init_db, test_admin, test_achievement, badge_dir, tmp_path
):
    """A stored slug that is not path-safe (unchanged, so not re-validated) is refused for badges."""
    test_achievement.slug = stored_slug
    db.session.commit()
    _login_admin(client, test_admin)

    response = client.put(
        f"/api/achievements/edit/{test_achievement.id}",
        data={"slug": stored_slug, "badge": (BytesIO(png_bytes()), "badge.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert "Slug may only contain" in response.json["message"]
    mock_subprocess.assert_not_called()
    assert not badge_dir.exists()
    assert sorted(p.name for p in tmp_path.rglob("*.png")) == []


@pytest.mark.parametrize("reward", ["abc", "1.5", "0", "-2"])
def test_edit_achievement_rejects_invalid_reward(
    client, init_db, test_admin, test_achievement, reward
):
    _login_admin(client, test_admin)

    response = client.put(
        f"/api/achievements/edit/{test_achievement.id}",
        data={"name": "Changed", "reward": reward},
    )

    assert response.status_code == 400
    assert "whole number" in response.json["message"]
    db.session.expire_all()
    ach = db.session.get(Achievement, test_achievement.id)
    assert ach.reward == 10
    assert ach.name != "Changed"


@patch("application.routes.achievement_routes.subprocess.run")
@patch("werkzeug.datastructures.FileStorage.save")
def test_edit_achievement_invalid_badge_ext_is_400(
    mock_save, mock_subprocess, client, init_db, test_admin, test_achievement
):
    _login_admin(client, test_admin)

    response = client.put(
        f"/api/achievements/edit/{test_achievement.id}",
        data={"badge": (BytesIO(b"fake"), "badge.gif")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert "Invalid badge file type" in response.json["message"]
    mock_save.assert_not_called()
    mock_subprocess.assert_not_called()


@patch("application.routes.achievement_routes.subprocess.run")
def test_add_achievement_badge_subprocess_fail(
    mock_subprocess, client, init_db, test_admin, badge_dir
):
    import subprocess

    mock_subprocess.side_effect = subprocess.CalledProcessError(
        1, "cmd", stderr="error"
    )
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    img_file = (BytesIO(png_bytes()), "badge.png")
    response = client.post(
        "/api/achievements/add",
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
    assert "Sprite sheet rebuild failed: error" in response.json["message"]
    # nothing is left behind: no row and no badge file
    assert Achievement.query.filter_by(slug="badge-ach-3").first() is None
    assert list(badge_dir.glob("*")) == []


@patch("application.routes.achievement_routes.subprocess.run")
def test_add_achievement_badge_subprocess_exception(
    mock_subprocess, client, init_db, test_admin, badge_dir
):
    mock_subprocess.side_effect = Exception("unexpected error")
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    img_file = (BytesIO(png_bytes()), "badge.png")
    response = client.post(
        "/api/achievements/add",
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
    assert "Error rebuilding sprite sheet: unexpected error" in response.json["message"]
    assert Achievement.query.filter_by(slug="badge-ach-4").first() is None
    assert list(badge_dir.glob("*")) == []


def test_view_certificate(
    client, init_db, test_admin, test_user, test_achievement
):
    cert = UserCertificate(
        user_id=test_user.id,
        achievement_id=test_achievement.id,
        url="http://test",
        file_path="test.pdf",
    )
    db.session.add(cert)
    db.session.commit()
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    with patch(
        "application.routes.achievement_routes.os.path.exists", return_value=False
    ):
        response = client.get(f"/api/achievements/view_certificate/{cert.id}")
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
        response = client.get(f"/api/achievements/view_certificate/{cert.id}")
        assert response.status_code == 200


def test_view_certificate_is_public(client, init_db, test_user, test_achievement):
    """Certificate viewing is intentionally public (no login required) —
    this is a disclosed and accepted tradeoff, not an oversight."""
    cert = UserCertificate(
        user_id=test_user.id,
        achievement_id=test_achievement.id,
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
        response = client.get(f"/api/achievements/view_certificate/{cert.id}")
        assert response.status_code == 200


def test_admin_certificates(client, init_db, test_admin):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id
    response = client.get("/api/achievements/admin/certificates")
    assert response.status_code == 200


def test_mark_reviewed(client, init_db, test_admin, test_user, test_achievement):
    cert = UserCertificate(
        user_id=test_user.id,
        achievement_id=test_achievement.id,
        url="http://test",
        file_path="test.pdf",
    )
    db.session.add(cert)
    db.session.commit()
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = client.post(
        f"/api/achievements/admin/certificates/reviewed/{cert.id}",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert response.status_code == 200
    assert response.json["status"] == "success"
    assert cert.status == "approved"

    # /api/ routes answer in JSON whether or not the caller sends the AJAX header
    cert.status = "pending"
    db.session.commit()
    response2 = client.post(f"/api/achievements/admin/certificates/reviewed/{cert.id}")
    assert response2.status_code == 200
    assert response2.json["status"] == "success"
    assert cert.status == "approved"


def test_reject_certificate(client, init_db, test_admin, test_user, test_achievement):
    cert = UserCertificate(
        user_id=test_user.id,
        achievement_id=test_achievement.id,
        url="http://test",
        file_path="test.pdf",
    )
    db.session.add(cert)
    db.session.commit()
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = client.post(
        f"/api/achievements/admin/certificates/reject/{cert.id}",
        json={"review_note": "Not a valid certificate."},
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert response.status_code == 200
    assert response.json["status"] == "success"
    assert cert.status == "rejected"
    assert cert.review_note == "Not a valid certificate."

    # /api/ routes answer in JSON whether or not the caller sends the AJAX header
    cert.status = "pending"
    cert.review_note = None
    db.session.commit()
    response2 = client.post(f"/api/achievements/admin/certificates/reject/{cert.id}")
    assert response2.status_code == 200
    assert response2.json["status"] == "success"
    assert cert.status == "rejected"


def test_download_certificate(
    client, init_db, test_admin, test_user, test_achievement
):
    cert = UserCertificate(
        user_id=test_user.id,
        achievement_id=test_achievement.id,
        url="http://test",
        file_path="test.pdf",
    )
    db.session.add(cert)
    db.session.commit()
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    with patch(
        "application.routes.achievement_routes.os.path.exists", return_value=False
    ):
        response = client.get(f"/api/achievements/download_certificate/{cert.id}")
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
        response = client.get(f"/api/achievements/download_certificate/{cert.id}")
        assert response.status_code == 200


def test_mark_all_reviewed(
    client, init_db, test_admin, test_user, test_achievement
):
    # Just need one cert to test the logic
    cert1 = UserCertificate(
        user_id=test_user.id,
        achievement_id=test_achievement.id,
        url="http://test1",
        file_path="test1.pdf",
    )
    db.session.add(cert1)
    db.session.commit()
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = client.post(
        "/api/achievements/admin/certificates/reviewed/all",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert response.status_code == 200
    assert cert1.status == "approved"

    # /api/ routes answer in JSON whether or not the caller sends the AJAX header
    cert1.status = "pending"
    db.session.commit()
    response2 = client.post("/api/achievements/admin/certificates/reviewed/all")
    assert response2.status_code == 200
    assert response2.json["status"] == "success"
    assert cert1.status == "approved"


@patch("application.routes.achievement_routes.io.BytesIO")
@patch("application.routes.achievement_routes.zipfile.ZipFile")
def test_download_all_certificates(
    mock_zip,
    mock_bytesio,
    client,
    init_db,
    test_admin,
    test_user,
    test_achievement,
):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    # No certs
    response = client.get("/api/achievements/admin/certificates/download_all")
    assert response.status_code == 302

    cert = UserCertificate(
        user_id=test_user.id,
        achievement_id=test_achievement.id,
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
        response = client.get("/api/achievements/admin/certificates/download_all")
        assert response.status_code == 200


def test_admin_certificate_templates(client, init_db, test_admin):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id
    response = client.get("/api/achievements/admin/certificate_templates")
    assert response.status_code == 200
    assert "templates" in response.json.get("data", response.json)


def test_admin_certificate_templates_view(client, init_db, test_admin):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id
    with patch("application.routes.achievement_routes.send_from_directory", return_value="fake_file"):
        response = client.get("/api/achievements/admin/certificate_templates/cs-1/view")
        assert response.status_code == 200


def test_admin_certificate_templates_upload(client, init_db, test_admin):
    from io import BytesIO
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id
    img_data = b"fake pdf content"
    img_file = (BytesIO(img_data), "template.pdf")
    with patch("werkzeug.datastructures.FileStorage.save"):
        response = client.post(
            "/api/achievements/admin/certificate_templates/cs-1/upload",
            data={"template_file": img_file},
            content_type="multipart/form-data"
        )
        assert response.status_code == 200
        assert response.json["success"] is True


def test_admin_certificate_templates_test_generate(client, init_db, test_admin):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id
    with patch("application.utilities.cert_generator.generate_certificate", return_value=b"fake pdf content"), patch("application.routes.achievement_routes.send_file", return_value="fake_file"):
        response = client.post(
            "/api/achievements/admin/certificate_templates/cs-1/test_generate",
            data={"student_name": "Test Student"}
        )
        assert response.status_code == 200


def test_get_achievements_json_success(client, init_db, test_user, test_achievement):
    with client.session_transaction() as sess:
        sess["user"] = test_user.id

    response = client.get("/api/achievements/all")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert "achievements" in data["data"]


def test_get_achievements_json_reports_the_achievements_the_user_earned(
    client, init_db, test_user, test_achievement
):
    # Needs far more chat messages than the user has, so evaluate_user never awards it
    not_earned = AchievementFactory(type="chat", requirement_value="500")
    UserAchievementFactory(user_id=test_user.id, achievement_id=test_achievement.id)
    db.session.commit()
    with client.session_transaction() as sess:
        sess["user"] = test_user.id

    response = client.get("/api/achievements/all", headers={"Accept": "application/json"})

    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["user_achievements"] == [test_achievement.id]
    listed = {a["id"] for a in data["achievements"]}
    assert {test_achievement.id, not_earned.id} <= listed


def test_get_achievements_json_returns_every_achievement_type(
    client, init_db, test_user
):
    expected = {
        "duck-100": "ducks",
        "project-5": "project",
        "chat-50": "chat",
        "course-complete": "certificate",
    }
    requirements = {"duck-100": "100", "project-5": "5", "chat-50": "50"}
    for slug, achievement_type in expected.items():
        AchievementFactory(
            slug=slug,
            type=achievement_type,
            requirement_value=requirements.get(slug),
        )
    db.session.commit()
    with client.session_transaction() as sess:
        sess["user"] = test_user.id

    response = client.get("/api/achievements/all", headers={"Accept": "application/json"})

    assert response.status_code == 200
    data = response.get_json()["data"]
    type_by_slug = {a["slug"]: a["type"] for a in data["achievements"]}
    assert {slug: type_by_slug.get(slug) for slug in expected} == expected
    assert data["user_achievements"] == []


def test_get_achievements_json_no_user(client, init_db):
    response = client.get("/api/achievements/all")
    assert response.status_code == 404
    assert response.get_json()["error"] == "User not found!"


def test_submit_certificate_generation_failure(client, init_db, test_user, test_achievement):
    with client.session_transaction() as sess:
        sess["user"] = test_user.id

    valid_url = f"https://codecombat.com/certificates/abc123?course={test_achievement.slug}"

    with patch("application.utilities.cert_generator.generate_certificate", side_effect=Exception("Generator Failed")):
        response = client.post(
            "/api/achievements/submit_certificate",
            data={"certificate_url": valid_url},
            content_type="multipart/form-data",
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert response.status_code == 500
        assert "Failed to generate certificate" in response.get_json()["error"]


def test_admin_certificate_templates_view_fallback_and_error(client, init_db, test_admin):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    # Fallback preview generation
    with patch("os.path.exists", return_value=False), patch("application.utilities.cert_generator.generate_certificate", return_value=b"generated pdf"):
        response = client.get("/api/achievements/admin/certificate_templates/cs-1/view")
        assert response.status_code == 200

    # Exception during fallback preview generation
    with patch("os.path.exists", return_value=False), patch("application.utilities.cert_generator.generate_certificate", side_effect=Exception("Render error")):
        response = client.get("/api/achievements/admin/certificate_templates/cs-1/view")
        assert response.status_code == 500
        assert response.get_json()["error"] == "Render error"


def test_admin_certificate_templates_upload_invalid_file(client, init_db, test_admin):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    # No file uploaded
    res1 = client.post("/api/achievements/admin/certificate_templates/cs-1/upload", data={})
    assert res1.status_code == 400
    assert res1.get_json()["error"] == "No file uploaded"

    # Non-PDF file
    file_data = (BytesIO(b"not a pdf"), "test.txt")
    res2 = client.post(
        "/api/achievements/admin/certificate_templates/cs-1/upload",
        data={"template_file": file_data},
        content_type="multipart/form-data"
    )
    assert res2.status_code == 400
    assert res2.get_json()["error"] == "Only PDF files allowed"


def test_admin_certificate_templates_test_generate_error(client, init_db, test_admin):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    with patch("application.utilities.cert_generator.generate_certificate", side_effect=Exception("Test gen error")):
        response = client.post(
            "/api/achievements/admin/certificate_templates/cs-1/test_generate",
            data={"student_name": "Test Student"}
        )
        assert response.status_code == 500
        assert response.get_json()["error"] == "Test gen error"


def test_get_achievements_json_reports_progress_and_ignores_bad_requirements(
    client, init_db, test_user
):
    good = AchievementFactory(type="chat", requirement_value="3", reward=0)
    bad = AchievementFactory(type="ducks", requirement_value="abc", reward=5)
    missing = AchievementFactory(type="chat", requirement_value=None, reward=5)
    cert = AchievementFactory(type="certificate", requirement_value=None, reward=5)
    test_user.earned_ducks = 100
    db.session.commit()
    with client.session_transaction() as sess:
        sess["user"] = test_user.id

    response = client.get("/api/achievements/all")

    assert response.status_code == 200
    data = response.get_json()["data"]
    by_id = {a["id"]: a for a in data["achievements"]}
    assert by_id[good.id]["requirement_value"] == 3
    assert by_id[good.id]["current_progress"] == 0
    # No usable requirement: reported as 0 (no progress bar) and never awarded
    assert by_id[bad.id]["requirement_value"] == 0
    assert by_id[missing.id]["requirement_value"] == 0
    # Certificates have no numeric requirement; an approved certificate is it
    assert by_id[cert.id]["requirement_value"] == 1
    assert data["user_achievements"] == []


# --- /api/achievements/* is the only URL family -------------------------------


def test_legacy_achievements_urls_are_gone(test_app):
    rules = [rule.rule for rule in test_app.url_map.iter_rules()]
    assert not [r for r in rules if r.startswith("/achievements")]
    assert "/api/achievements/edit/<int:id>" in rules


def test_achievements_endpoints_resolve_under_api_prefix(test_app):
    """url_for() calls inside achievement_routes keep working under the new prefix."""
    from flask import url_for

    with test_app.test_request_context():
        assert (
            url_for("achievements.admin_certificates")
            == "/api/achievements/admin/certificates"
        )
        assert (
            url_for("achievements.admin_certificate_templates_view", course_id="cs-1")
            == "/api/achievements/admin/certificate_templates/cs-1/view"
        )


@pytest.mark.parametrize(
    "path", ["/api/achievements/add", "/api/achievements/submit_certificate"]
)
def test_form_page_gets_are_not_routed(client, init_db, test_admin, path):
    """The old page-style GETs on these URLs are gone; the endpoints are POST-only."""
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = client.get(path, headers={"Accept": "application/json"})

    # No GET rule matches, so the API catch-all answers with its JSON 404
    assert response.status_code == 404
    assert response.json["error"] == "Route not found"


def test_certificate_template_preview_url_is_under_api_prefix(
    client, init_db, test_admin
):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    with patch("application.routes.achievement_routes.os.path.exists", return_value=True):
        response = client.get("/api/achievements/admin/certificate_templates")

    assert response.status_code == 200
    templates = response.json["data"]["templates"]
    cs1 = next(t for t in templates if t["id"] == "cs-1")
    assert (
        cs1["preview_url"] == "/api/achievements/admin/certificate_templates/cs-1/view"
    )


def test_review_actions_never_redirect(
    client, init_db, test_admin, test_user, test_achievement
):
    """A plain (non-AJAX) POST gets the JSON answer, not a flash and a redirect."""
    cert = UserCertificate(
        user_id=test_user.id,
        achievement_id=test_achievement.id,
        url="http://test",
        file_path="test.pdf",
    )
    db.session.add(cert)
    db.session.commit()
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = client.post(f"/api/achievements/admin/certificates/reject/{cert.id}")

    assert response.status_code == 200
    assert response.is_json
    assert "Location" not in response.headers
    assert response.json == {"status": "success", "message": "Certificate rejected."}


def test_download_missing_certificate_without_referrer_redirects_to_react_page(
    client, init_db, test_admin, test_user, test_achievement
):
    cert = UserCertificate(
        user_id=test_user.id,
        achievement_id=test_achievement.id,
        url="http://test",
        file_path="test.pdf",
    )
    db.session.add(cert)
    db.session.commit()

    with patch(
        "application.routes.achievement_routes.os.path.exists", return_value=False
    ):
        response = client.get(f"/api/achievements/download_certificate/{cert.id}")

    assert response.status_code == 302
    assert response.headers["Location"] == "/achievements"


# --- PUT /api/achievements/edit/<id> (used by the admin achievements editor) ---


def _edit(client, achievement_id, **fields):
    """Mirror the admin UI: a multipart FormData PUT."""
    return client.put(
        f"/api/achievements/edit/{achievement_id}",
        data=fields,
        content_type="multipart/form-data",
    )


def test_edit_achievement_updates_fields(client, init_db, test_admin, test_achievement):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = _edit(
        client,
        test_achievement.id,
        name="Renamed",
        slug="renamed-slug",
        description="new description",
        type="chat",
        reward="25",
        requirement_value="7",
        source="codecombat.com",
    )

    assert response.status_code == 200
    assert response.json["status"] == "success"
    assert "Renamed" in response.json["message"]
    db.session.refresh(test_achievement)
    assert test_achievement.name == "Renamed"
    assert test_achievement.slug == "renamed-slug"
    assert test_achievement.description == "new description"
    assert test_achievement.type == "chat"
    assert test_achievement.reward == 25
    assert test_achievement.requirement_value == "7"
    assert test_achievement.source == "codecombat.com"


def test_edit_achievement_partial_update_keeps_other_fields(
    client, init_db, test_admin, test_achievement
):
    original_slug = test_achievement.slug
    original_reward = test_achievement.reward
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = _edit(client, test_achievement.id, name="Only The Name")

    assert response.status_code == 200
    db.session.refresh(test_achievement)
    assert test_achievement.name == "Only The Name"
    assert test_achievement.slug == original_slug
    assert test_achievement.reward == original_reward


def test_edit_achievement_can_keep_its_own_slug(
    client, init_db, test_admin, test_achievement
):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = _edit(client, test_achievement.id, slug=test_achievement.slug, name="Same Slug")

    assert response.status_code == 200
    assert response.json["status"] == "success"


def test_edit_achievement_not_found(client, init_db, test_admin):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = _edit(client, 999999, name="Ghost")

    assert response.status_code == 404
    assert response.json["status"] == "error"


def test_edit_achievement_rejects_duplicate_slug(
    client, init_db, test_admin, test_achievement
):
    other = AchievementFactory()
    db.session.commit()
    original_slug = test_achievement.slug
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = _edit(client, test_achievement.id, slug=other.slug)

    assert response.status_code == 400
    assert "already exists" in response.json["message"]
    db.session.refresh(test_achievement)
    assert test_achievement.slug == original_slug


def test_edit_achievement_requires_admin(client, init_db, test_user, test_achievement):
    response = _edit(client, test_achievement.id, name="Anonymous")
    assert response.status_code == 401

    with client.session_transaction() as sess:
        sess["user"] = test_user.id
    response = _edit(client, test_achievement.id, name="Student")
    assert response.status_code == 403

    db.session.refresh(test_achievement)
    assert test_achievement.name not in ("Anonymous", "Student")


@patch("application.routes.achievement_routes.subprocess.run")
def test_edit_achievement_with_badge(
    mock_subprocess, client, init_db, test_admin, test_achievement, badge_dir
):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = _edit(
        client, test_achievement.id, badge=(BytesIO(png_bytes()), "badge.png")
    )

    assert response.status_code == 200
    assert response.json["status"] == "success"
    assert [p.name for p in badge_dir.iterdir()] == [f"{test_achievement.slug}.png"]
    mock_subprocess.assert_called_once()


@patch("werkzeug.datastructures.FileStorage.save")
def test_edit_achievement_rejects_invalid_badge_type(
    mock_save, client, init_db, test_admin, test_achievement
):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = _edit(
        client, test_achievement.id, badge=(BytesIO(b"not an image"), "badge.txt")
    )

    assert response.status_code == 400
    assert "Invalid badge file type" in response.json["message"]
    mock_save.assert_not_called()


@patch("application.routes.achievement_routes.subprocess.run")
def test_edit_achievement_sprite_rebuild_failure(
    mock_subprocess, client, init_db, test_admin, test_achievement, badge_dir
):
    mock_subprocess.side_effect = Exception("boom")
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = _edit(
        client, test_achievement.id, badge=(BytesIO(png_bytes()), "badge.png")
    )

    assert response.status_code == 500
    assert response.json["status"] == "error"
    assert not list(badge_dir.glob("*"))


# --- Certificate submission: URL anchoring, stored file names, download names ---

PDF = b"%PDF-1.4 test certificate"


@pytest.fixture
def cert_folder(test_app, tmp_path, monkeypatch):
    """Point the certificate upload folder at an empty temp directory."""
    monkeypatch.setitem(test_app.config, "UPLOAD_FOLDER", str(tmp_path))
    return tmp_path


def _submit_cert(client, url, **extra):
    return client.post(
        "/api/achievements/submit_certificate",
        data={"certificate_url": url, **extra},
        content_type="multipart/form-data",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )


def _add_cert(user, achievement, file_path, **extra):
    cert = UserCertificate(
        user_id=user.id,
        achievement_id=achievement.id,
        url="http://test",
        file_path=file_path,
        **extra,
    )
    db.session.add(cert)
    db.session.commit()
    return cert


@pytest.mark.parametrize(
    ("url", "slug"),
    [
        ("https://codecombat.com/certificates/abc123?course=cs-1", "cs-1"),
        ("https://www.ozaria.com/certificates/abc123?course=oz1", "oz1"),
        ("https://codecombat.com/certificates/abc123?course=cs-1&x=2", "cs-1"),
        ("https://codecombat.com/certificates/abc123?class=9&course=cs-1", "cs-1"),
        ("https://codecombat.com/certificates/abc123?x=1&course=cs-1&y=2", "cs-1"),
        ("https://codecombat.com/certificates/abc123?course=cs-1#top", "cs-1"),
    ],
)
def test_cert_url_regex_accepts_certificate_urls(url, slug):
    match = re.fullmatch(CERT_URL_REGEX, url)

    assert match is not None
    assert match.group(1) == slug


@pytest.mark.parametrize(
    "url",
    [
        "https://evil.example/?x=https://codecombat.com/certificates/a?course=b",
        "xhttps://codecombat.com/certificates/a?course=b",
        "http://codecombat.com/certificates/a?course=b",
        "https://codecombat.com.evil.example/certificates/a?course=b",
        "https://codecombat.com/certificates/a?course=b extra",
        "https://codecombat.com/certificates/a?course=b\nhttps://evil.example",
        "https://codecombat.com/certificates/a?xcourse=b",
        "https://codecombat.com/certificates/a?course=",
        "https://codecombat.com/certificates/a#?course=b",
        "https://codecombat.com/certificates/a",
    ],
)
def test_cert_url_regex_rejects_prefixed_or_malformed_urls(url):
    assert re.fullmatch(CERT_URL_REGEX, url) is None


def test_submit_certificate_rejects_url_with_evil_prefix(
    client, init_db, test_user, test_achievement
):
    with client.session_transaction() as sess:
        sess["user"] = test_user.id
    url = (
        "https://evil.example/?x="
        f"https://codecombat.com/certificates/a?course={test_achievement.slug}"
    )

    response = _submit_cert(client, url)

    assert response.status_code == 400
    assert response.json["success"] is False
    assert "Invalid certificate URL" in response.json["error"]
    assert UserCertificate.query.count() == 0


def test_submit_certificate_url_length_is_capped(
    client, init_db, test_user, test_achievement, cert_folder
):
    """A valid link is only matched up to MAX_CERT_URL_LENGTH characters."""
    with client.session_transaction() as sess:
        sess["user"] = test_user.id
    start = f"https://codecombat.com/certificates/abc123?course={test_achievement.slug}&pad="
    longest = start + "x" * (MAX_CERT_URL_LENGTH - len(start))

    too_long = _submit_cert(client, longest + "x")
    assert too_long.status_code == 400
    assert "Invalid certificate URL" in too_long.json["error"]
    assert UserCertificate.query.count() == 0

    at_the_cap = _submit_cert(
        client, longest, certificate_file=(BytesIO(PDF), "cert.pdf")
    )
    assert at_the_cap.status_code == 200
    assert UserCertificate.query.one().url == longest


def test_submit_certificate_accepts_url_with_trailing_parameters(
    client, init_db, test_user, test_achievement, cert_folder
):
    with client.session_transaction() as sess:
        sess["user"] = test_user.id
    url = (
        "https://codecombat.com/certificates/abc123"
        f"?class=9&course={test_achievement.slug}&utm=x#top"
    )

    response = _submit_cert(client, url, certificate_file=(BytesIO(PDF), "cert.pdf"))

    assert response.status_code == 200
    assert response.json["success"] is True
    assert UserCertificate.query.one().url == url


def test_submit_certificate_trims_the_url(
    client, init_db, test_user, test_achievement, cert_folder
):
    with client.session_transaction() as sess:
        sess["user"] = test_user.id
    url = f"https://codecombat.com/certificates/abc123?course={test_achievement.slug}"

    response = _submit_cert(
        client, f"  {url}\t", certificate_file=(BytesIO(PDF), "cert.pdf")
    )

    assert response.status_code == 200
    assert UserCertificate.query.one().url == url


def test_submit_certificate_non_string_url_is_a_400(client, init_db, test_user):
    with client.session_transaction() as sess:
        sess["user"] = test_user.id

    response = client.post(
        "/api/achievements/submit_certificate", json={"certificate_url": 5}
    )

    assert response.status_code == 400
    assert "Invalid certificate URL" in response.json["error"]


def test_submit_certificate_rejects_non_pdf_upload(
    client, init_db, test_user, test_achievement, cert_folder
):
    with client.session_transaction() as sess:
        sess["user"] = test_user.id
    url = f"https://codecombat.com/certificates/abc123?course={test_achievement.slug}"

    response = _submit_cert(client, url, certificate_file=(BytesIO(b"x"), "cert.txt"))

    assert response.status_code == 400
    assert response.json["success"] is False
    assert "Only PDF is allowed" in response.json["error"]
    assert UserCertificate.query.count() == 0
    assert list(cert_folder.iterdir()) == []


def test_submit_certificate_stores_only_the_file_name(
    client, init_db, test_user, test_achievement, cert_folder
):
    with client.session_transaction() as sess:
        sess["user"] = test_user.id
    url = f"https://codecombat.com/certificates/abc123?course={test_achievement.slug}"

    response = _submit_cert(client, url, certificate_file=(BytesIO(PDF), "cert.pdf"))

    assert response.status_code == 200
    expected = f"{test_user.username}_{test_achievement.slug}.pdf"
    cert = UserCertificate.query.one()
    assert cert.file_path == expected
    assert (cert_folder / expected).read_bytes() == PDF
    # The stored name resolves against the upload folder when the file is served
    served = client.get(f"/api/achievements/view_certificate/{cert.id}")
    assert served.status_code == 200
    assert served.mimetype == "application/pdf"
    assert served.data == PDF


def test_resubmission_replaces_a_legacy_absolute_path(
    client, init_db, test_user, test_achievement, cert_folder
):
    with client.session_transaction() as sess:
        sess["user"] = test_user.id
    cert = _add_cert(
        test_user,
        test_achievement,
        "/home/ubuntu/classroom-chat/userData/old.pdf",
        status="approved",
    )
    url = f"https://codecombat.com/certificates/abc123?course={test_achievement.slug}"

    response = _submit_cert(client, url, certificate_file=(BytesIO(PDF), "cert.pdf"))

    assert response.status_code == 200
    db.session.refresh(cert)
    assert cert.file_path == f"{test_user.username}_{test_achievement.slug}.pdf"
    assert cert.status == "pending"


def test_view_certificate_serves_a_legacy_absolute_path_that_exists(
    client, init_db, test_user, test_achievement, cert_folder, tmp_path_factory
):
    legacy = tmp_path_factory.mktemp("legacy") / "old.pdf"
    legacy.write_bytes(b"%PDF legacy")
    cert = _add_cert(test_user, test_achievement, str(legacy))

    response = client.get(f"/api/achievements/view_certificate/{cert.id}")

    assert response.status_code == 200
    assert response.data == b"%PDF legacy"


@pytest.mark.parametrize(
    "stored",
    [
        "alice_cs1.pdf",
        "/home/ubuntu/classroom-chat/userData/alice_cs1.pdf",
        "C:\\srv\\classroom-chat\\userData\\alice_cs1.pdf",
    ],
)
def test_certificate_files_fall_back_to_the_upload_folder(
    client, init_db, test_user, test_achievement, cert_folder, stored
):
    """A bare name, or a stale absolute path from another host, finds the file by name."""
    (cert_folder / "alice_cs1.pdf").write_bytes(PDF)
    cert = _add_cert(test_user, test_achievement, stored)

    viewed = client.get(f"/api/achievements/view_certificate/{cert.id}")
    downloaded = client.get(f"/api/achievements/download_certificate/{cert.id}")

    assert viewed.status_code == 200
    assert viewed.data == PDF
    assert downloaded.status_code == 200
    assert downloaded.data == PDF
    assert downloaded.headers["Content-Disposition"].startswith("attachment")


def test_certificate_without_a_file_is_not_found(
    client, init_db, test_user, test_achievement, cert_folder
):
    cert = _add_cert(test_user, test_achievement, None)

    viewed = client.get(f"/api/achievements/view_certificate/{cert.id}")
    downloaded = client.get(f"/api/achievements/download_certificate/{cert.id}")

    assert viewed.status_code == 404
    assert downloaded.status_code == 302


def test_certificate_json_never_exposes_the_server_path(
    client, init_db, test_admin, test_user, test_achievement
):
    _add_cert(
        test_user,
        test_achievement,
        "/home/ubuntu/classroom-chat/userData/alice_cs1.pdf",
    )
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = client.get("/api/achievements/admin/certificates")

    certificates = response.json["data"]["certificates"]
    assert [c["file_path"] for c in certificates] == ["alice_cs1.pdf"]


@pytest.mark.parametrize(
    ("nickname", "achievement_name", "expected"),
    [
        ("Sam Lee", "Intro to CS", "Sam_Lee_Intro_to_CS.pdf"),
        (None, "CS 1", "samuser_CS_1.pdf"),
        ("", "CS 1", "samuser_CS_1.pdf"),
        ("../../etc/passwd", "CS/1", "etc_passwd_CS_1.pdf"),
        ("\u674e\u96f7", "CS 1", "samuser_CS_1.pdf"),
        ("\u674e\u96f7", "\u8bfe\u7a0b", "samuser.pdf"),
    ],
)
def test_certificate_download_name_is_sanitised(nickname, achievement_name, expected):
    cert = SimpleNamespace(
        id=7,
        user=SimpleNamespace(nickname=nickname, username="samuser"),
        achievement=SimpleNamespace(name=achievement_name),
    )

    assert _certificate_download_name(cert) == expected


def test_certificate_download_name_falls_back_when_nothing_is_left():
    cert = SimpleNamespace(
        id=7,
        user=SimpleNamespace(nickname="\u674e\u96f7", username="\u674e\u96f7"),
        achievement=SimpleNamespace(name="\u8bfe\u7a0b"),
    )

    assert _certificate_download_name(cert) == "certificate_7.pdf"
    assert _certificate_download_name(cert, with_id=True) == "certificate_7.pdf"


def test_download_certificate_names_the_file_after_student_and_achievement(
    client, init_db, test_user, test_achievement, cert_folder
):
    test_user.nickname = "Sam / Lee"
    db.session.commit()
    (cert_folder / "stored.pdf").write_bytes(PDF)
    cert = _add_cert(test_user, test_achievement, "stored.pdf")

    response = client.get(f"/api/achievements/download_certificate/{cert.id}")

    assert response.status_code == 200
    base = f"Sam_Lee_{test_achievement.name.replace(' ', '_')}"
    assert f"filename={base}.pdf" in response.headers["Content-Disposition"]


def test_download_all_certificates_zip_entries_are_safe_and_unique(
    client, init_db, test_admin, test_achievement, cert_folder
):
    users = [UserFactory(nickname="Sam / Lee") for _ in range(3)]
    db.session.commit()
    for i, user in enumerate(users[:2]):
        (cert_folder / f"cert{i}.pdf").write_bytes(PDF)
        _add_cert(user, test_achievement, f"cert{i}.pdf")
    _add_cert(users[2], test_achievement, None)  # no file: left out of the zip
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id

    response = client.get("/api/achievements/admin/certificates/download_all")

    assert response.status_code == 200
    names = zipfile.ZipFile(BytesIO(response.data)).namelist()
    base = f"Sam_Lee_{test_achievement.name.replace(' ', '_')}"
    assert len(names) == len(set(names)) == 2
    assert f"{base}.pdf" in names
    assert all(n.startswith(base) and n.endswith(".pdf") for n in names)


# --- Badge uploads: one validated PNG per slug, stale variants removed, and all-or-nothing saves ---

RUN_SPRITE = "application.routes.achievement_routes.subprocess.run"


def _names(folder):
    return sorted(p.name for p in folder.iterdir()) if folder.exists() else []


def _put(folder, name, data=b"old"):
    folder.mkdir(parents=True, exist_ok=True)
    (folder / name).write_bytes(data)


def _add_with_badge(client, slug, data, filename="badge.png", **extra):
    return client.post(
        "/api/achievements/add",
        data={"name": f"Badge {slug}", "slug": slug, "type": "ducks", "reward": 10,
              "badge": (BytesIO(data), filename), **extra},
        content_type="multipart/form-data",
    )


@pytest.fixture
def admin_session(client, test_admin):
    with client.session_transaction() as sess:
        sess["user"] = test_admin.id
    return client


@patch(RUN_SPRITE)
def test_add_badge_is_normalised_to_a_small_png(mock_run, admin_session, badge_dir):
    response = _add_with_badge(admin_session, "from-jpeg", jpeg_bytes(size=(600, 400)), "badge.jpg")

    assert response.status_code == 200
    assert _names(badge_dir) == ["from-jpeg.png"]
    with Image.open(badge_dir / "from-jpeg.png") as stored:
        assert (stored.format, stored.size) == ("PNG", (256, 171))


@patch(RUN_SPRITE)
def test_add_badge_keeps_the_alpha_of_a_webp(mock_run, admin_session, badge_dir):
    response = _add_with_badge(admin_session, "from-webp", image_bytes("WEBP", mode="RGBA"), "badge.webp")

    assert response.status_code == 200
    with Image.open(badge_dir / "from-webp.png") as stored:
        assert (stored.format, stored.mode) == ("PNG", "RGBA")
        assert stored.getpixel((0, 0))[3] > 0


@patch(RUN_SPRITE)
def test_add_badge_removes_leftover_files_of_other_types(mock_run, admin_session, badge_dir):
    for ext in ("jpg", "jpeg", "webp", "png"):
        _put(badge_dir, f"stale.{ext}")
    _put(badge_dir, "other.jpg")  # another slug is never touched

    response = _add_with_badge(admin_session, "stale", png_bytes())

    assert response.status_code == 200
    assert _names(badge_dir) == ["other.jpg", "stale.png"]
    with Image.open(badge_dir / "stale.png") as stored:
        assert stored.format == "PNG"


@patch(RUN_SPRITE)
def test_add_without_a_badge_does_not_touch_files_or_the_sprite(mock_run, admin_session, badge_dir):
    response = admin_session.post("/api/achievements/add", data={"name": "Plain", "slug": "plain"})

    assert response.status_code == 200
    mock_run.assert_not_called()
    assert not badge_dir.exists()


@pytest.mark.parametrize(
    "data, filename, status",
    [
        (b"not an image", "badge.png", 400),
        (animated_gif_bytes(), "badge.png", 400),
        (image_bytes("BMP"), "badge.webp", 400),
        (png_bytes(size=(10, 10))[:40], "badge.png", 400),
    ],
    ids=["garbage", "gif-content", "bmp-content", "truncated"],
)
@patch(RUN_SPRITE)
def test_add_badge_with_unusable_content_is_a_400_and_creates_nothing(
    mock_run, data, filename, status, admin_session, badge_dir
):
    response = _add_with_badge(admin_session, "bad-content", data, filename)

    assert response.status_code == status
    assert response.json["status"] == "error"
    assert Achievement.query.filter_by(slug="bad-content").first() is None
    assert not badge_dir.exists()
    mock_run.assert_not_called()


@patch(RUN_SPRITE)
def test_add_badge_over_the_size_cap_is_413(mock_run, admin_session, badge_dir, monkeypatch):
    data = png_bytes(size=(64, 64))
    monkeypatch.setitem(admin_session.application.config, "IMAGE_MAX_BYTES_BADGE", len(data) - 1)

    response = _add_with_badge(admin_session, "too-big", data)

    assert response.status_code == 413
    assert "File too large" in response.json["message"]
    assert Achievement.query.filter_by(slug="too-big").first() is None


@patch(RUN_SPRITE)
def test_add_badge_over_the_pixel_cap_is_400(mock_run, admin_session, badge_dir, monkeypatch):
    monkeypatch.setitem(admin_session.application.config, "MAX_IMAGE_PIXELS", 100)

    response = _add_with_badge(admin_session, "too-wide", png_bytes(size=(20, 20)))

    assert response.status_code == 400
    assert response.json["message"].startswith("Image dimensions too large")


@patch(RUN_SPRITE)
def test_add_badge_sprite_timeout_leaves_no_row_and_no_file(mock_run, admin_session, badge_dir):
    import subprocess

    mock_run.side_effect = subprocess.TimeoutExpired("make_sprite_sheet.py", 60)

    response = _add_with_badge(admin_session, "slow-sprite", png_bytes())

    assert response.status_code == 500
    assert "Error rebuilding sprite sheet" in response.json["message"]
    assert Achievement.query.filter_by(slug="slow-sprite").first() is None
    assert _names(badge_dir) == []


@patch(RUN_SPRITE)
def test_add_badge_failed_commit_removes_the_badge_and_rebuilds_the_sprite(mock_run, admin_session, badge_dir):
    with patch("application.extensions.db.session.commit", side_effect=Exception("DB Error")):
        response = _add_with_badge(admin_session, "commit-fails", png_bytes())

    assert response.status_code == 500
    assert response.json["message"] == "Error saving the achievement."
    assert Achievement.query.filter_by(slug="commit-fails").first() is None
    assert _names(badge_dir) == []
    assert mock_run.call_count == 2  # built with the badge, then again without it


@patch(RUN_SPRITE)
def test_add_badge_failed_flush_touches_no_file(mock_run, admin_session, badge_dir):
    with patch("application.extensions.db.session.flush", side_effect=Exception("constraint")):
        response = _add_with_badge(admin_session, "flush-fails", png_bytes())

    assert response.status_code == 500
    assert Achievement.query.filter_by(slug="flush-fails").first() is None
    assert not badge_dir.exists()
    mock_run.assert_not_called()


@patch(RUN_SPRITE)
def test_add_badge_failed_commit_and_failed_second_rebuild_still_reports_the_commit_error(
    mock_run, admin_session, badge_dir
):
    mock_run.side_effect = [None, Exception("sprite gone")]

    with patch("application.extensions.db.session.commit", side_effect=Exception("DB Error")):
        response = _add_with_badge(admin_session, "double-fail", png_bytes())

    assert response.status_code == 500
    assert _names(badge_dir) == []


# edit


def _edit_badge(client, achievement, data=None, filename="badge.png", **fields):
    payload = dict(fields)
    if data is not None:
        payload["badge"] = (BytesIO(data), filename)
    return client.put(
        f"/api/achievements/edit/{achievement.id}", data=payload, content_type="multipart/form-data"
    )


@patch(RUN_SPRITE)
def test_edit_badge_replaces_the_png_and_removes_other_types(mock_run, admin_session, test_achievement, badge_dir):
    slug = test_achievement.slug
    for ext in ("png", "jpg", "jpeg", "webp"):
        _put(badge_dir, f"{slug}.{ext}")

    response = _edit_badge(admin_session, test_achievement, jpeg_bytes(size=(80, 80)), "new.jpg")

    assert response.status_code == 200
    assert _names(badge_dir) == [f"{slug}.png"]
    with Image.open(badge_dir / f"{slug}.png") as stored:
        assert (stored.format, stored.size) == ("PNG", (80, 80))
    mock_run.assert_called_once()


@patch(RUN_SPRITE)
def test_edit_badge_failure_puts_the_previous_files_back(mock_run, admin_session, test_achievement, badge_dir):
    slug = test_achievement.slug
    _put(badge_dir, f"{slug}.png", b"previous png")
    _put(badge_dir, f"{slug}.jpg", b"previous jpg")
    mock_run.side_effect = Exception("boom")

    response = _edit_badge(admin_session, test_achievement, png_bytes(), name="Renamed")

    assert response.status_code == 500
    assert (badge_dir / f"{slug}.png").read_bytes() == b"previous png"
    assert (badge_dir / f"{slug}.jpg").read_bytes() == b"previous jpg"
    assert _names(badge_dir) == [f"{slug}.jpg", f"{slug}.png"]
    db.session.expire_all()
    assert db.session.get(Achievement, test_achievement.id).name != "Renamed"


@patch(RUN_SPRITE)
def test_edit_badge_failed_commit_restores_files_and_rebuilds(mock_run, admin_session, test_achievement, badge_dir):
    slug = test_achievement.slug
    _put(badge_dir, f"{slug}.png", b"previous png")

    with patch("application.extensions.db.session.commit", side_effect=Exception("DB Error")):
        response = _edit_badge(admin_session, test_achievement, png_bytes())

    assert response.status_code == 500
    assert (badge_dir / f"{slug}.png").read_bytes() == b"previous png"
    assert mock_run.call_count == 2


@patch(RUN_SPRITE)
def test_edit_renaming_the_slug_moves_the_badge_files(mock_run, admin_session, test_achievement, badge_dir):
    old = test_achievement.slug
    _put(badge_dir, f"{old}.png", b"png bytes")
    _put(badge_dir, f"{old}.webp", b"webp bytes")

    response = _edit_badge(admin_session, test_achievement, slug="renamed-badge")

    assert response.status_code == 200
    assert _names(badge_dir) == ["renamed-badge.png", "renamed-badge.webp"]
    assert (badge_dir / "renamed-badge.png").read_bytes() == b"png bytes"
    mock_run.assert_called_once()  # the sprite's CSS class is named after the slug
    db.session.expire_all()
    assert db.session.get(Achievement, test_achievement.id).slug == "renamed-badge"


@patch(RUN_SPRITE)
def test_edit_renaming_a_slug_without_badge_files_does_not_rebuild(mock_run, admin_session, test_achievement, badge_dir):
    response = _edit_badge(admin_session, test_achievement, slug="no-files-here")

    assert response.status_code == 200
    mock_run.assert_not_called()
    assert not badge_dir.exists()


@patch(RUN_SPRITE)
def test_edit_renaming_the_slug_with_a_new_badge_drops_the_old_files(mock_run, admin_session, test_achievement, badge_dir):
    old = test_achievement.slug
    _put(badge_dir, f"{old}.png")
    _put(badge_dir, f"{old}.jpg")

    response = _edit_badge(admin_session, test_achievement, png_bytes(), slug="fresh-slug")

    assert response.status_code == 200
    assert _names(badge_dir) == ["fresh-slug.png"]
    mock_run.assert_called_once()


@patch(RUN_SPRITE)
def test_edit_rename_failure_puts_the_files_back_under_the_old_slug(mock_run, admin_session, test_achievement, badge_dir):
    old = test_achievement.slug
    _put(badge_dir, f"{old}.png", b"png bytes")
    mock_run.side_effect = Exception("boom")

    response = _edit_badge(admin_session, test_achievement, slug="never-applied")

    assert response.status_code == 500
    assert _names(badge_dir) == [f"{old}.png"]
    assert (badge_dir / f"{old}.png").read_bytes() == b"png bytes"
    db.session.expire_all()
    assert db.session.get(Achievement, test_achievement.id).slug == old


@patch(RUN_SPRITE)
def test_edit_with_an_unusable_badge_changes_nothing(mock_run, admin_session, test_achievement, badge_dir):
    old_name = test_achievement.name

    response = _edit_badge(admin_session, test_achievement, b"not an image", name="Should Not Stick")

    assert response.status_code == 400
    assert response.json["message"] == "Invalid or corrupt image file."
    db.session.expire_all()
    assert db.session.get(Achievement, test_achievement.id).name == old_name
    mock_run.assert_not_called()


@patch(RUN_SPRITE)
def test_edit_with_a_duplicate_slug_changes_nothing(mock_run, admin_session, test_achievement, badge_dir):
    other = AchievementFactory()
    db.session.commit()
    old_name = test_achievement.name

    response = _edit_badge(admin_session, test_achievement, png_bytes(), name="Should Not Stick", slug=other.slug)

    assert response.status_code == 400
    assert "already exists" in response.json["message"]
    db.session.expire_all()
    assert db.session.get(Achievement, test_achievement.id).name == old_name
    assert not badge_dir.exists()


@patch(RUN_SPRITE)
def test_edit_badge_over_the_size_cap_is_413(mock_run, admin_session, test_achievement, badge_dir, monkeypatch):
    data = png_bytes(size=(64, 64))
    monkeypatch.setitem(admin_session.application.config, "IMAGE_MAX_BYTES_BADGE", len(data) - 1)

    response = _edit_badge(admin_session, test_achievement, data)

    assert response.status_code == 413
    assert not badge_dir.exists()


@patch(RUN_SPRITE)
def test_edit_with_a_legacy_unsafe_slug_can_move_to_a_valid_one_without_touching_files(
    mock_run, admin_session, test_achievement, badge_dir, tmp_path
):
    """The old slug is not a plain file name, so none of its files are read, moved or removed."""
    test_achievement.slug = "../legacy"
    db.session.commit()
    _put(tmp_path, "legacy.png", b"outside the badge folder")

    response = _edit_badge(admin_session, test_achievement, png_bytes(), slug="valid-now")

    assert response.status_code == 200
    assert _names(badge_dir) == ["valid-now.png"]
    assert (tmp_path / "legacy.png").read_bytes() == b"outside the badge folder"

    renamed_only = _edit_badge(admin_session, test_achievement, name="No Files", slug="valid-again")
    assert renamed_only.status_code == 200


def test_badges_live_in_the_static_images_folder(test_app):
    with test_app.app_context():
        assert REAL_BADGE_DIR() == os.path.join(str(test_app.static_folder), "images", "achievement_badges")


def test_badge_paths_refuse_unsafe_slugs(test_app):
    with test_app.app_context():
        for slug in ("", "../x", "a/b", "a\\b" if os.sep == "\\" else "a/../../b"):
            assert not achievement_routes._badge_slug_is_safe(slug)
            with pytest.raises(ValueError, match="Unsafe badge slug"):
                achievement_routes._badge_path(slug, "png")
        assert achievement_routes._badge_slug_is_safe("3-week-streak")
        assert achievement_routes._badge_slug_is_safe("Legacy_Slug")
        assert achievement_routes._badge_path("ok", "png").endswith("ok.png")


def test_badge_files_undo_ignores_a_file_it_cannot_restore(test_app, tmp_path, monkeypatch):
    target = tmp_path / "a.png"
    target.write_bytes(b"before")
    with test_app.app_context():
        files = achievement_routes._BadgeFiles()
        files.write(str(target), b"after")

        def broken(path, data):
            raise OSError("read-only")

        monkeypatch.setattr(achievement_routes, "write_bytes_atomic", broken)
        files.undo()  # logs and carries on

    assert target.read_bytes() == b"after"


def test_badge_files_remove_and_move_only_touch_existing_files(test_app, tmp_path):
    (tmp_path / "src.png").write_bytes(b"data")
    with test_app.app_context():
        files = achievement_routes._BadgeFiles()
        files.remove(str(tmp_path / "missing.png"))  # nothing to remove
        files.move(str(tmp_path / "src.png"), str(tmp_path / "dst.png"))
        assert sorted(p.name for p in tmp_path.iterdir()) == ["dst.png"]

        files.undo()

    assert (tmp_path / "src.png").read_bytes() == b"data"
    assert not (tmp_path / "dst.png").exists()
