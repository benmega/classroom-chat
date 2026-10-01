"""
File: test_challenge_routes.py
Type: py
Summary: Unit tests for challenge routes Flask routes.
"""

import logging
import re
from unittest.mock import patch

import pytest
from application import db
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.configuration import Configuration
from application.models.duck_transaction import DuckTransaction
from sqlalchemy.exc import IntegrityError, OperationalError
from tests.factories import ChallengeFactory, ConfigurationFactory, CourseFactory, CourseInstanceFactory, UserFactory


def test_submit_challenge_get(client, init_db):
    """Test GET request to challenge submission page."""
    sample_user = UserFactory()
    ConfigurationFactory()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/challenge/submit", headers={"Accept": "application/json"})
    assert response.status_code == 200
    assert b"ready" in response.data


def test_submit_challenge_no_session(client, init_db):
    """Test submitting challenge without logged in user."""
    response = client.post(
        "/challenge/submit",
        data={
            "url": "https://codecombat.com/play/level/dungeons-of-kithgard?course=123&course-instance=456"
        },
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert "/login" in response.headers["Location"]

    with client.session_transaction() as sess:
        flashes = sess.get("_flashes", [])
        messages = [msg for cat, msg in flashes]
        assert any("No session user found" in m for m in messages)


def test_submit_challenge_no_url(client, init_db):
    """Test submitting challenge without URL."""
    sample_user = UserFactory()
    ConfigurationFactory()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post(
        "/challenge/submit",
        data={"url": "", "notes": "Some notes"},
        follow_redirects=True,
    )

    assert response.status_code == 400
    assert b"Challenge URL is required" in response.data


def test_submit_challenge_success(client, init_db):
    """Test successful challenge submission."""
    sample_user = UserFactory()
    ConfigurationFactory()

    course = CourseFactory(id="123")
    CourseInstanceFactory(id="456", course_id=course.id, classroom_id='cls1')
    ChallengeFactory(
        slug="dungeons-of-kithgard",
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        course_id=course.id,
        is_active=True
    )

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post(
        "/challenge/submit",
        data={
            "url": "https://codecombat.com/play/level/dungeons-of-kithgard?course=123&course-instance=456",
            "helpers": "",
            "notes": "Completed the challenge!",
        },
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Congratulations" in response.data
    assert b"10.0 ducks" in response.data


def test_submit_challenge_failed(client, init_db):
    """Test failed challenge submission."""
    sample_user = UserFactory()
    ConfigurationFactory()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post(
        "/challenge/submit",
        data={"url": "https://codecombat.com/play/level/invalid-challenge?course=123&course-instance=456"},
        follow_redirects=True,
    )

    assert response.status_code == 400
    assert b"This course wasn't connected yet" in response.data


def test_submit_challenge_no_configuration(client, init_db):
    """Test submitting challenge when configuration is missing."""
    sample_user = UserFactory()
    Configuration.query.delete()
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post(
        "/challenge/submit",
        data={
            "url": "https://codecombat.com/play/level/test?course=123&course-instance=456"
        },
        follow_redirects=False,
    )

    assert response.status_code == 302

    with client.session_transaction() as sess:
        flashes = sess.get("_flashes", [])
        messages = [msg for cat, msg in flashes]
        assert any("Configuration missing" in m for m in messages)


def test_submit_challenge_with_helper(client, init_db):
    """Test challenge submission with helper information."""
    sample_user = UserFactory()
    ConfigurationFactory()
    UserFactory(username="friend_user")

    course = CourseFactory(id="123")
    CourseInstanceFactory(id="456", course_id=course.id, classroom_id='cls1')
    ChallengeFactory(
        slug="dungeons-of-kithgard",
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        course_id=course.id,
        is_active=True
    )

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post(
        "/challenge/submit",
        data={
            "url": "https://codecombat.com/play/level/dungeons-of-kithgard?course=123&course-instance=456",
            "helpers": "friend_user",
            "notes": "",
        },
        follow_redirects=True,
    )

    assert response.status_code == 200

    log = ChallengeLog.query.filter_by(user_id=sample_user.id, challenge_slug="dungeons-of-kithgard").first()
    assert log is not None
    assert log.helper == "friend_user"


def test_submit_challenge_with_notes(client, init_db):
    """Test challenge submission with notes."""
    sample_user = UserFactory()
    ConfigurationFactory()

    course = CourseFactory(id="123")
    CourseInstanceFactory(id="456", course_id=course.id, classroom_id='cls1')
    ChallengeFactory(
        slug="dungeons-of-kithgard",
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        course_id=course.id,
        is_active=True
    )

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post(
        "/challenge/submit",
        data={
            "url": "https://codecombat.com/play/level/dungeons-of-kithgard?course=123&course-instance=456",
            "notes": "This challenge was really fun!",
        },
        follow_redirects=True,
    )

    assert response.status_code == 200


def test_detect_and_handle_challenge_url_valid(init_db):
    """Test detecting and handling a valid challenge URL."""
    from application.routes.challenge_routes import detect_and_handle_challenge_url

    sample_user = UserFactory()
    course = CourseFactory()
    course_instance = CourseInstanceFactory(course_id=course.id, classroom_id='cls1')
    ChallengeFactory(
        slug="dungeons-of-kithgard",
        course_id=course.id,
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        is_active=True
    )

    url = f"https://codecombat.com/play/level/dungeons-of-kithgard?course={course.id}&course-instance={course_instance.id}"
    result = detect_and_handle_challenge_url(url, sample_user, duck_multiplier=1)

    assert result["handled"] is True
    assert result["details"]["success"] is True
    assert "duck_reward" in result["details"]


def test_detect_and_handle_challenge_url_invalid(init_db):
    """Test detecting invalid URL."""
    from application.routes.challenge_routes import detect_and_handle_challenge_url

    sample_user = UserFactory()
    url = "https://invalid-url.com/not-a-challenge"
    result = detect_and_handle_challenge_url(url, sample_user, duck_multiplier=1)

    assert result["handled"] is False
    assert result["details"] is None


def test_detect_and_handle_challenge_url_duplicate(init_db):
    """Test handling duplicate challenge submission."""
    from application.routes.challenge_routes import detect_and_handle_challenge_url

    sample_user = UserFactory()
    course = CourseFactory()
    course_instance = CourseInstanceFactory(course_id=course.id, classroom_id='cls1')
    ChallengeFactory(
        slug="dungeons-of-kithgard",
        course_id=course.id,
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        is_active=True
    )

    url = f"https://codecombat.com/play/level/dungeons-of-kithgard?course={course.id}&course-instance={course_instance.id}"

    # Submit challenge first time
    result1 = detect_and_handle_challenge_url(url, sample_user, duck_multiplier=1)
    assert result1["handled"] is True
    assert result1["details"]["success"] is True

    # Try to submit same challenge again
    result2 = detect_and_handle_challenge_url(url, sample_user, duck_multiplier=1)
    assert result2["handled"] is True
    assert result2["details"]["success"] is False
    assert "already claimed" in result2["details"]["message"]


def test_detect_and_handle_challenge_url_with_multiplier(init_db):
    """Test challenge URL handling with duck multiplier."""
    from application.routes.challenge_routes import detect_and_handle_challenge_url

    sample_user = UserFactory(active_track="cs")
    course = CourseFactory()
    course_instance = CourseInstanceFactory(course_id=course.id, classroom_id='cls1')
    ChallengeFactory(
        slug="dungeons-of-kithgard",
        course_id=course.id,
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        is_active=True
    )

    url = f"https://codecombat.com/play/level/dungeons-of-kithgard?course={course.id}&course-instance={course_instance.id}"
    result = detect_and_handle_challenge_url(url, sample_user, duck_multiplier=3)

    assert result["handled"] is True
    assert result["details"]["success"] is True
    assert result["details"]["duck_reward"] == 30


def test_detect_and_handle_challenge_url_helper_self(init_db):
    """Test that user cannot help themselves."""
    from application.routes.challenge_routes import detect_and_handle_challenge_url

    sample_user = UserFactory()
    course = CourseFactory()
    course_instance = CourseInstanceFactory(course_id=course.id, classroom_id='cls1')
    ChallengeFactory(
        slug="dungeons-of-kithgard",
        course_id=course.id,
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        is_active=True
    )

    url = f"https://codecombat.com/play/level/dungeons-of-kithgard?course={course.id}&course-instance={course_instance.id}"
    detect_and_handle_challenge_url(
        url, sample_user, duck_multiplier=1, helper=sample_user.username
    )

    log = ChallengeLog.query.filter_by(
        user_id=sample_user.id, challenge_slug="dungeons-of-kithgard"
    ).first()

    assert log is not None
    assert log.helper == "" or log.helper is None


def test_extract_challenge_details_standard_url():
    """Test extracting details from standard challenge URL."""
    from application.routes.challenge_routes import _extract_challenge_details

    message = "https://www.ozaria.com/play/ozaria/level/1upm4l1l2b?course=5d8a57abe8919b28d5113af1&course-instance=634a512688e9fc00249dc9ba"
    result = _extract_challenge_details(message)

    assert result is not None
    assert result["domain"] == "www.ozaria.com"
    assert result["challenge_slug"] == "1upm4l1l2b"
    assert result["course_id"] == "5d8a57abe8919b28d5113af1"
    assert result["course_instance"] == "634a512688e9fc00249dc9ba"


def test_extract_challenge_details_alternative_url():
    """Test extracting details from alternative URL format."""
    from application.routes.challenge_routes import _extract_challenge_details

    message = "https://codecombat.com/s/python-basics/lessons/1/levels/123"
    result = _extract_challenge_details(message)

    assert result is not None
    assert result["domain"] == "codecombat.com"


def test_extract_challenge_details_no_match():
    """Test extracting details from invalid URL."""
    from application.routes.challenge_routes import _extract_challenge_details

    message = "This is not a challenge URL"
    result = _extract_challenge_details(message)

    assert result is None


def test_log_challenge_success(init_db):
    """Test successful challenge logging."""
    from application.routes.challenge_routes import _log_challenge

    sample_user = UserFactory()
    course = CourseFactory()
    course_instance = CourseInstanceFactory(course_id=course.id, classroom_id='cls1')
    ChallengeFactory(
        slug="dungeons-of-kithgard",
        course_id=course.id,
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        is_active=True
    )

    details = {
        "domain": "codecombat.com",
        "challenge_slug": "dungeons-of-kithgard",
        "course_id": course.id,
        "course_instance": course_instance.id,
    }

    result = _log_challenge(details, sample_user)

    assert result["success"] is True
    assert "Challenge logged successfully" in result["message"]

    log = ChallengeLog.query.filter_by(
        user_id=sample_user.id, challenge_slug="dungeons-of-kithgard"
    ).first()
    assert log is not None


def test_log_challenge_duplicate(init_db):
    """Test logging duplicate challenge."""
    from application.routes.challenge_routes import _log_challenge

    sample_user = UserFactory()
    course = CourseFactory()
    course_instance = CourseInstanceFactory(course_id=course.id, classroom_id='cls1')
    ChallengeFactory(
        name="Test Challenge",
        slug="test-challenge",
        domain="codecombat.com",
        difficulty="easy",
        value=10,
        course_id=course.id,
        is_active=True,
    )

    details = {
        "domain": "codecombat.com",
        "challenge_slug": "test-challenge",
        "course_id": course.id,
        "course_instance": course_instance.id,
    }

    result1 = _log_challenge(details, sample_user)
    assert result1["success"] is True

    result2 = _log_challenge(details, sample_user)
    assert result2["success"] is False
    assert "already claimed" in result2["message"]


def test_log_challenge_with_helper(init_db):
    """Test logging challenge with helper."""
    from application.routes.challenge_routes import _log_challenge

    sample_user = UserFactory()
    course = CourseFactory()
    course_instance = CourseInstanceFactory(course_id=course.id, classroom_id='cls1')
    ChallengeFactory(
        name="Helper Challenge",
        slug="helper-challenge",
        domain="codecombat.com",
        difficulty="easy",
        value=10,
        course_id=course.id,
        is_active=True,
    )

    details = {
        "domain": "codecombat.com",
        "challenge_slug": "helper-challenge",
        "course_id": course.id,
        "course_instance": course_instance.id,
    }

    result = _log_challenge(details, sample_user, helper="helper_user")

    assert result["success"] is True

    log = ChallengeLog.query.filter_by(
        user_id=sample_user.id, challenge_slug="helper-challenge"
    ).first()
    assert log.helper == "helper_user"


def test_update_user_ducks_success(init_db):
    """Test updating user ducks after challenge completion."""
    from application.routes.challenge_routes import _update_user_ducks

    sample_user = UserFactory()
    ChallengeFactory(
        slug="dungeons-of-kithgard",
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        is_active=True
    )

    initial_ducks = sample_user.duck_balance
    reward = _update_user_ducks(sample_user, "dungeons-of-kithgard", duck_multiplier=1)

    assert reward == 10
    db.session.commit()
    db.session.refresh(sample_user)
    assert sample_user.duck_balance == initial_ducks + 10


def test_update_user_ducks_with_multiplier(init_db):
    """Test updating user ducks with multiplier."""
    from application.routes.challenge_routes import _update_user_ducks

    sample_user = UserFactory()
    ChallengeFactory(
        slug="dungeons-of-kithgard",
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        is_active=True
    )

    initial_ducks = sample_user.duck_balance
    reward = _update_user_ducks(sample_user, "dungeons-of-kithgard", duck_multiplier=5)

    assert reward == 50
    db.session.commit()
    db.session.refresh(sample_user)
    assert sample_user.duck_balance == initial_ducks + 50


def test_update_user_ducks_user_not_found(init_db):
    """Test updating ducks for non-existent user."""
    from application.routes.challenge_routes import _update_user_ducks

    with pytest.raises(ValueError, match="User not found"):
        _update_user_ducks(None, "dungeons-of-kithgard", duck_multiplier=1)


def test_update_user_ducks_challenge_not_found(init_db):
    """Test updating ducks for non-existent challenge."""
    from application.routes.challenge_routes import _update_user_ducks

    sample_user = UserFactory()

    with pytest.raises(ValueError, match=r"Challenge .* not found"):
        _update_user_ducks(sample_user, "nonexistent-challenge", duck_multiplier=1)


def test_update_user_ducks_case_insensitive(init_db):
    """Test that challenge lookup is case-insensitive."""
    from application.routes.challenge_routes import _update_user_ducks

    sample_user = UserFactory()
    ChallengeFactory(
        slug="dungeons-of-kithgard",
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        is_active=True
    )

    reward = _update_user_ducks(sample_user, "DUNGEONS-OF-KITHGARD", duck_multiplier=1)
    assert reward == 10


def test_challenge_complete_challenge_method(init_db):
    """Test Challenge model's complete_challenge method."""
    sample_user = UserFactory()
    challenge = ChallengeFactory(
        slug="dungeons-of-kithgard",
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        is_active=True
    )

    initial_log_count = ChallengeLog.query.count()

    challenge.complete_challenge(sample_user)

    assert ChallengeLog.query.count() == initial_log_count + 1
    log = ChallengeLog.query.filter_by(user_id=sample_user.id).first()
    assert log.challenge_slug == challenge.slug


def test_challenge_scale_value_easy(init_db):
    """Test scaling challenge value for easy difficulty."""
    challenge = ChallengeFactory(
        name="Easy Challenge",
        slug="easy-challenge",
        domain="codecombat.com",
        difficulty="easy",
        value=10,
        is_active=True,
    )

    scaled_value = challenge.scale_value()
    assert scaled_value == 5  # 10 * 0.5


def test_challenge_scale_value_medium(init_db):
    """Test scaling challenge value for medium difficulty."""
    challenge = ChallengeFactory(
        name="Medium Challenge",
        slug="medium-challenge",
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        is_active=True,
    )

    scaled_value = challenge.scale_value()
    assert scaled_value == 10  # 10 * 1.0


def test_challenge_scale_value_hard(init_db):
    """Test scaling challenge value for hard difficulty."""
    challenge = ChallengeFactory(
        name="Hard Challenge",
        slug="hard-challenge",
        domain="codecombat.com",
        difficulty="hard",
        value=10,
        is_active=True,
    )

    scaled_value = challenge.scale_value()
    assert scaled_value == 20  # 10 * 2.0


def test_challenge_scale_value_with_multiplier(init_db):
    """Test scaling challenge value with additional multiplier."""
    challenge = ChallengeFactory(
        name="Test Challenge",
        slug="test-challenge",
        domain="codecombat.com",
        difficulty="hard",
        value=10,
        is_active=True,
    )

    scaled_value = challenge.scale_value(difficulty_multiplier=2.0)
    assert scaled_value == 40  # 10 * 2.0 * 2.0


def test_challenge_default_slug_listener(init_db):
    """Test that default slug is set from name if not provided."""
    challenge = Challenge(
        name="Test Challenge Without Slug",
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        is_active=True,
    )
    db.session.add(challenge)
    db.session.commit()

    assert challenge.slug == "Test Challenge Without Slug"


def test_challenge_model_repr(init_db):
    """Test Challenge model string representation."""
    challenge = ChallengeFactory(
        name="Dungeons of Kithgard",
        slug="dungeons-of-kithgard",
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        is_active=True,
    )
    repr_str = repr(challenge)
    assert "Challenge" in repr_str
    assert "Dungeons of Kithgard" in repr_str
    assert "codecombat.com" in repr_str


def test_url_pattern_matches_various_formats():
    """Test URL pattern regex matches various URL formats."""
    from application.routes.challenge_routes import URL_PATTERN

    test_urls = [
        "https://codecombat.com/play/level/dungeons-of-kithgard",
        "https://codecombat.com/play/level/dungeons-of-kithgard?course=intro-to-python",
        "https://codecombat.com/play/level/dungeons-of-kithgard?course=intro-to-python&course-instance=fall2024",
        "https://www.ozaria.com/play/ozaria/level/1upm4l1l2b?course=5d8a57abe8919b28d5113af1&course-instance=634a512688e9fc00249dc9ba",
        "https://codecombat.com/play/junior/level/step-change?course=65f32b6c87c07dbeb5ba1936",
    ]

    for url in test_urls:
        match = re.search(URL_PATTERN, url)
        assert match is not None, f"Failed to match URL: {url}"


def test_extract_challenge_details_domains():
    """Test extracting details from various domain URLs."""
    from application.routes.challenge_routes import _extract_challenge_details

    cc_url = "https://codecombat.com/play/level/dungeons-of-kithgard"
    cc_res = _extract_challenge_details(cc_url)
    assert cc_res["domain"] == "codecombat.com"
    assert cc_res["challenge_slug"] == "dungeons-of-kithgard"

    oz_url = "https://www.ozaria.com/play/ozaria/level/chapter-1-sky-mountain"
    oz_res = _extract_challenge_details(oz_url)
    assert oz_res["domain"] == "www.ozaria.com"
    assert oz_res["challenge_slug"] == "chapter-1-sky-mountain"

    junior_url = "https://codecombat.com/play/junior/level/step-change"
    junior_res = _extract_challenge_details(junior_url)
    assert junior_res["domain"] == "codecombat.com"
    assert junior_res["challenge_slug"] == "step-change"


def test_detect_and_handle_ozaria_domain(init_db):
    """Test full flow for an Ozaria domain challenge."""
    from application.routes.challenge_routes import detect_and_handle_challenge_url

    sample_user = UserFactory()
    course = CourseFactory()
    course_instance = CourseInstanceFactory(course_id=course.id, classroom_id='cls1')
    ChallengeFactory(
        slug="chapter-1-sky-mountain",
        domain="www.ozaria.com",
        difficulty="medium",
        value=10,
        course_id=course.id,
        is_active=True,
    )

    url = f"https://www.ozaria.com/play/ozaria/level/chapter-1-sky-mountain?course={course.id}&course-instance={course_instance.id}"

    result = detect_and_handle_challenge_url(url, sample_user, duck_multiplier=1)

    assert result["handled"] is True
    assert result["details"]["success"] is True


def test_submit_challenge_switch_track(client, init_db):
    """Test challenge completion on mismatched track automatically switches track and ducks are awarded."""
    sample_user = UserFactory(active_track="ozaria")
    ConfigurationFactory()

    course = CourseFactory(name="CS1")
    course_instance = CourseInstanceFactory(course_id=course.id, classroom_id='cls1')
    ChallengeFactory(
        slug="dungeons-of-kithgard",
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        course_id=course.id,
        is_active=True,
    )

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    url = f"https://codecombat.com/play/level/dungeons-of-kithgard?course={course.id}&course-instance={course_instance.id}"

    # Initial balance
    initial_ducks = sample_user.duck_balance

    response = client.post(
        "/challenge/submit",
        json={
            "url": url,
            "helpers": "",
            "notes": "Off-track complete",
        },
    )

    assert response.status_code == 200
    res_json = response.get_json()
    assert res_json["success"] is True
    assert res_json["reward_issued"] is True
    assert res_json["warning"] is None

    db.session.refresh(sample_user)
    assert sample_user.active_track == "cs"
    assert sample_user.duck_balance > initial_ducks


def test_submit_challenge_triggers_achievement(client, init_db):
    """Test that submitting a challenge evaluates achievements and returns new_awards."""
    from application.models.achievements import Achievement, UserAchievement

    sample_user = UserFactory()
    ConfigurationFactory()

    course = CourseFactory(name="CS1")
    course_instance = CourseInstanceFactory(course_id=course.id, classroom_id="cls1")
    ChallengeFactory(
        slug="first-steps",
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        course_id=course.id,
        is_active=True,
    )

    ach = Achievement(name="Duck Lover", slug="duck-lover", type="ducks", requirement_value="5", reward=1)
    db.session.add(ach)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    url = f"https://codecombat.com/play/level/first-steps?course={course.id}&course-instance={course_instance.id}"
    response = client.post(
        "/challenge/submit",
        json={"url": url, "helpers": ""},
    )

    assert response.status_code == 200
    res_json = response.get_json()
    assert res_json["success"] is True
    assert "new_awards" in res_json
    assert any(a["slug"] == "duck-lover" for a in res_json["new_awards"])

    # Verify UserAchievement in DB
    ua = UserAchievement.query.filter_by(user_id=sample_user.id, achievement_id=ach.id).first()
    assert ua is not None


# ---------------------------------------------------------------------------
# Atomic claim (log + track + reward in one transaction), double submits,
# slug matching, input handling and error reporting
# ---------------------------------------------------------------------------

CLAIM_SLUG = "dungeons-of-kithgard"
REWARD_PATCH = "application.routes.challenge_routes._update_user_ducks"
CHALLENGE_LOGGER = "application.routes.challenge_routes"
GENERIC_FAILURE = "Could not log your challenge right now. Please try again."


def _db_error(statement="INSERT INTO challenge_logs", orig="disk I/O error"):
    """An OperationalError whose text must never reach the client."""
    return OperationalError(statement, {}, Exception(orig))


def _duplicate_error():
    return IntegrityError(
        "INSERT INTO challenge_logs",
        {},
        Exception("UNIQUE constraint failed: challenge_logs.user_id"),
    )


def _seed_claim(slug=CLAIM_SLUG, value=10, **user_kwargs):
    """Create a user, configuration, course, instance and one challenge."""
    user = UserFactory(**user_kwargs)
    ConfigurationFactory()
    course = CourseFactory(name="CS1")
    instance = CourseInstanceFactory(course_id=course.id, classroom_id="cls1")
    challenge = ChallengeFactory(
        slug=slug,
        domain="codecombat.com",
        value=value,
        course_id=course.id,
        is_active=True,
    )
    url = (
        f"https://codecombat.com/play/level/{slug}"
        f"?course={course.id}&course-instance={instance.id}"
    )
    return user, course, instance, challenge, url


def _login(client, user):
    with client.session_transaction() as sess:
        sess["user"] = user.id


def _claim_rows(user):
    """(challenge logs, challenge duck transactions) persisted for the user."""
    db.session.expire_all()
    logs = ChallengeLog.query.filter_by(user_id=user.id).count()
    ducks = DuckTransaction.query.filter(
        DuckTransaction.user_id == user.id,
        DuckTransaction.reason.like("Challenge:%"),
    ).count()
    return logs, ducks


def _details(course, instance, slug=CLAIM_SLUG):
    return {
        "domain": "codecombat.com",
        "challenge_slug": slug,
        "course_id": course.id,
        "course_instance": instance.id,
    }


@pytest.mark.parametrize(
    "error",
    [
        RuntimeError("Error updating user ducks: (sqlite3.OperationalError) secret"),
        ValueError("Challenge not found"),
    ],
)
def test_submit_challenge_duck_failure_persists_nothing_and_retry_succeeds(
    client, init_db, error
):
    """A failed reward leaves no log/ducks/track change, and a retry then works."""
    user, _, _, _, url = _seed_claim(active_track="ozaria")
    _login(client, user)
    initial_ducks = user.duck_balance

    with patch(REWARD_PATCH, side_effect=error):
        response = client.post("/challenge/submit", json={"url": url})

    assert response.status_code == 400
    body = response.get_json()
    assert body["success"] is False
    assert "already claimed" not in body["message"]
    assert "secret" not in body["message"]
    assert _claim_rows(user) == (0, 0)
    db.session.refresh(user)
    assert user.duck_balance == initial_ducks
    assert user.active_track == "ozaria"

    # Retry with the failure gone: a real claim, not "already claimed"
    response = client.post("/challenge/submit", json={"url": url})

    assert response.status_code == 200
    assert response.get_json()["success"] is True
    assert _claim_rows(user) == (1, 1)
    db.session.refresh(user)
    assert user.duck_balance == initial_ducks + 10
    assert user.active_track == "cs"


def test_submit_challenge_double_submit_awards_once(client, init_db):
    """Submitting the same claim twice only pays out the first time."""
    user, _, _, _, url = _seed_claim()
    _login(client, user)
    initial_ducks = user.duck_balance

    first = client.post("/challenge/submit", json={"url": url})
    second = client.post("/challenge/submit", json={"url": url})

    assert first.status_code == 200
    assert second.status_code == 400
    assert "already claimed" in second.get_json()["message"]
    assert _claim_rows(user) == (1, 1)
    db.session.refresh(user)
    assert user.duck_balance == initial_ducks + 10


def test_submit_challenge_lost_race_is_told_already_claimed(client, init_db):
    """The loser of a double-submit race (IntegrityError on commit) gets no ducks."""
    user, _, _, _, url = _seed_claim(active_track="ozaria")
    _login(client, user)
    initial_ducks = user.duck_balance

    with patch.object(db.session, "commit", side_effect=_duplicate_error()):
        response = client.post("/challenge/submit", json={"url": url})

    assert response.status_code == 400
    body = response.get_json()
    assert body["success"] is False
    assert "already claimed" in body["message"]
    assert "UNIQUE" not in body["message"]
    assert _claim_rows(user) == (0, 0)
    db.session.refresh(user)
    assert user.duck_balance == initial_ducks
    assert user.active_track == "ozaria"


def test_detect_and_handle_commits_once(init_db):
    """The log, track/activity fields and ducks share a single commit."""
    from application.routes.challenge_routes import detect_and_handle_challenge_url

    user, _, _, _, url = _seed_claim()

    with patch.object(db.session, "commit", wraps=db.session.commit) as commit_spy:
        result = detect_and_handle_challenge_url(url, user, duck_multiplier=1)

    assert result["details"]["success"] is True
    assert commit_spy.call_count == 1
    # The ORM object used internally is not leaked to callers
    assert "challenge" not in result["details"]
    # Everything is really committed: a rollback now must not undo it
    db.session.rollback()
    assert _claim_rows(user) == (1, 1)


def test_log_challenge_stages_without_committing(init_db):
    """_log_challenge leaves the commit to its caller."""
    from application.routes.challenge_routes import _log_challenge

    user, course, instance, challenge, _ = _seed_claim()

    result = _log_challenge(_details(course, instance), user)

    assert result["success"] is True
    assert result["challenge"].id == challenge.id
    db.session.rollback()
    assert _claim_rows(user) == (0, 0)


@pytest.mark.parametrize(
    "error",
    [
        RuntimeError("boom"),
        ValueError("boom"),
        _db_error("UPDATE users SET duck_balance=?", "database is locked"),
    ],
)
def test_detect_and_handle_reward_failure_rolls_back_everything(init_db, error, caplog):
    """A failing duck update rolls back the log row and the track change too."""
    from application.routes.challenge_routes import detect_and_handle_challenge_url

    user, _, _, _, url = _seed_claim(active_track="ozaria")
    initial_ducks = user.duck_balance

    with caplog.at_level(logging.ERROR, logger=CHALLENGE_LOGGER):
        with patch(REWARD_PATCH, side_effect=error):
            result = detect_and_handle_challenge_url(url, user, duck_multiplier=1)

    assert result["handled"] is True
    details = result["details"]
    assert details["success"] is False
    assert details["message"] == GENERIC_FAILURE
    assert any(
        r.name == CHALLENGE_LOGGER and r.exc_info and CLAIM_SLUG in r.getMessage()
        for r in caplog.records
    )
    assert _claim_rows(user) == (0, 0)
    db.session.refresh(user)
    assert user.duck_balance == initial_ducks
    assert user.active_track == "ozaria"

    # A retry is a normal first claim
    retry = detect_and_handle_challenge_url(url, user, duck_multiplier=1)
    assert retry["details"]["success"] is True
    assert retry["details"]["duck_reward"] == 10
    assert _claim_rows(user) == (1, 1)


def test_detect_and_handle_commit_failure_is_generic_and_rolled_back(init_db):
    """A database error at commit time is not echoed and leaves nothing behind."""
    from application.routes.challenge_routes import detect_and_handle_challenge_url

    user, _, _, _, url = _seed_claim(active_track="ozaria")
    initial_ducks = user.duck_balance

    with patch.object(db.session, "commit", side_effect=_db_error()):
        result = detect_and_handle_challenge_url(url, user, duck_multiplier=1)

    details = result["details"]
    assert details["success"] is False
    assert details["message"] == GENERIC_FAILURE
    assert _claim_rows(user) == (0, 0)
    db.session.refresh(user)
    assert user.duck_balance == initial_ducks
    assert user.active_track == "ozaria"


def test_detect_and_handle_integrity_error_reports_already_claimed(init_db):
    """IntegrityError at commit means someone else claimed it first: no ducks."""
    from application.routes.challenge_routes import detect_and_handle_challenge_url

    user, _, _, _, url = _seed_claim()
    initial_ducks = user.duck_balance

    with patch.object(db.session, "commit", side_effect=_duplicate_error()):
        result = detect_and_handle_challenge_url(url, user, duck_multiplier=1)

    assert result["handled"] is True
    assert result["details"]["success"] is False
    assert "already claimed" in result["details"]["message"]
    assert _claim_rows(user) == (0, 0)
    db.session.refresh(user)
    assert user.duck_balance == initial_ducks


def test_log_challenge_integrity_error_on_insert_reports_already_claimed(init_db):
    """A duplicate rejected by the database at insert time is 'already claimed'."""
    from application.routes.challenge_routes import _log_challenge

    user, course, instance, _, _ = _seed_claim()

    with patch.object(db.session, "flush", side_effect=_duplicate_error()):
        result = _log_challenge(_details(course, instance), user)

    assert result["success"] is False
    assert "already claimed" in result["message"]
    assert "UNIQUE" not in result["message"]
    assert _claim_rows(user) == (0, 0)


def test_log_challenge_database_error_is_logged_not_returned(init_db, caplog):
    """DB error text is logged server-side and never returned to the client."""
    from application.routes.challenge_routes import _log_challenge

    user, course, instance, _, _ = _seed_claim()
    user_id = user.id

    with caplog.at_level(logging.ERROR, logger=CHALLENGE_LOGGER):
        with patch.object(db.session, "flush", side_effect=_db_error()):
            result = _log_challenge(_details(course, instance), user)

    assert result["success"] is False
    assert result["message"] == GENERIC_FAILURE
    records = [r for r in caplog.records if r.name == CHALLENGE_LOGGER]
    assert records
    assert records[0].exc_info is not None
    assert str(user_id) in records[0].getMessage()
    assert CLAIM_SLUG in records[0].getMessage()
    assert _claim_rows(user) == (0, 0)


def test_submit_challenge_unknown_slug_is_rejected(client, init_db):
    """A real course instance but no matching Challenge is refused."""
    user = UserFactory()
    ConfigurationFactory()
    course = CourseFactory()
    instance = CourseInstanceFactory(course_id=course.id, classroom_id="cls1")
    _login(client, user)
    initial_ducks = user.duck_balance

    url = (
        "https://codecombat.com/play/level/does-not-exist"
        f"?course={course.id}&course-instance={instance.id}"
    )
    response = client.post("/challenge/submit", json={"url": url})

    assert response.status_code == 400
    body = response.get_json()
    assert body["success"] is False
    assert "Couldn't identify challenge" in body["message"]
    assert not body["course_instance_not_found"]
    assert _claim_rows(user) == (0, 0)
    db.session.refresh(user)
    assert user.duck_balance == initial_ducks


@pytest.mark.parametrize("other_slug", ["a-b", "axb"])
def test_underscore_in_slug_is_not_a_wildcard(init_db, other_slug):
    """'_' in a URL slug must not match other characters (LIKE wildcard)."""
    from application.routes.challenge_routes import detect_and_handle_challenge_url

    user, _, _, _, url = _seed_claim(slug=other_slug)
    url = url.replace(f"/level/{other_slug}?", "/level/a_b?")

    result = detect_and_handle_challenge_url(url, user, duck_multiplier=1)

    assert result["handled"] is True
    assert result["details"]["success"] is False
    assert "Couldn't identify challenge 'a_b'" in result["details"]["message"]
    assert _claim_rows(user) == (0, 0)


def test_resolve_challenge_matching_rules(init_db):
    """Exact, case-insensitive and dash/space tolerant, never a LIKE match."""
    from application.routes.challenge_routes import _resolve_challenge

    spaced = ChallengeFactory(slug="lava lake", name="Lava Lake")
    plain = ChallengeFactory(slug="plain-slug", name="Plain")
    upper = ChallengeFactory(slug="Mixed-Case", name="Mixed Upper")
    lower = ChallengeFactory(slug="mixed-case", name="Mixed Lower")

    assert _resolve_challenge("lava-lake").id == spaced.id
    assert _resolve_challenge("LAVA-LAKE").id == spaced.id
    assert _resolve_challenge("PLAIN-slug").id == plain.id
    # An exact-case match wins when rows differ only by case
    assert _resolve_challenge("mixed-case").id == lower.id
    assert _resolve_challenge("Mixed-Case").id == upper.id
    # Otherwise the lowest id wins, so the choice is deterministic
    assert _resolve_challenge("MIXED-CASE").id == min(upper.id, lower.id)
    # No LIKE semantics
    assert _resolve_challenge("plain_slug") is None
    assert _resolve_challenge("%") is None
    assert _resolve_challenge("pl_in-slug") is None
    assert _resolve_challenge("") is None
    assert _resolve_challenge(None) is None


def test_claim_resolves_the_challenge_only_once(init_db):
    """The validated row is the one used for the track and the reward."""
    from application.routes import challenge_routes
    from application.routes.challenge_routes import detect_and_handle_challenge_url

    user, _, _, _, url = _seed_claim(active_track="ozaria")

    with patch.object(
        challenge_routes,
        "_resolve_challenge",
        wraps=challenge_routes._resolve_challenge,
    ) as resolve_spy:
        result = detect_and_handle_challenge_url(url, user, duck_multiplier=2)

    assert result["details"]["success"] is True
    assert result["details"]["duck_reward"] == 20
    assert resolve_spy.call_count == 1
    db.session.refresh(user)
    assert user.active_track == "cs"


def test_update_user_ducks_accepts_resolved_challenge(init_db):
    """_update_user_ducks can take the Challenge object itself."""
    from application.routes.challenge_routes import _update_user_ducks

    user = UserFactory()
    challenge = ChallengeFactory(slug=CLAIM_SLUG, value=7)

    assert _update_user_ducks(user, challenge, duck_multiplier=2) == 14
    db.session.commit()
    db.session.refresh(user)
    assert user.duck_balance == 14


@pytest.mark.parametrize("helpers", [5, ["friend"], {"name": "friend"}, True])
def test_submit_challenge_json_non_string_helpers_is_400(client, init_db, helpers):
    user, _, _, _, url = _seed_claim()
    _login(client, user)

    response = client.post("/challenge/submit", json={"url": url, "helpers": helpers})

    assert response.status_code == 400
    assert response.get_json()["success"] is False
    assert _claim_rows(user) == (0, 0)


@pytest.mark.parametrize("notes", [5, ["note"], {"a": 1}])
def test_submit_challenge_json_non_string_notes_is_400(client, init_db, notes):
    user, _, _, _, url = _seed_claim()
    _login(client, user)

    response = client.post("/challenge/submit", json={"url": url, "notes": notes})

    assert response.status_code == 400
    assert response.get_json()["success"] is False
    assert _claim_rows(user) == (0, 0)


@pytest.mark.parametrize("helpers", [None, 0, [], ""])
def test_submit_challenge_json_empty_helpers_still_works(client, init_db, helpers):
    """null/empty helpers keep meaning 'no helper'."""
    user, _, _, _, url = _seed_claim()
    _login(client, user)

    response = client.post(
        "/challenge/submit", json={"url": url, "helpers": helpers, "notes": None}
    )

    assert response.status_code == 200
    assert response.get_json()["success"] is True


@pytest.mark.parametrize(
    "url", [123, ["https://codecombat.com/play/level/x"], {"a": 1}, True]
)
def test_submit_challenge_json_non_string_url_is_400(client, init_db, url):
    user, _, _, _, _ = _seed_claim()
    _login(client, user)

    response = client.post("/challenge/submit", json={"url": url})

    assert response.status_code == 400
    assert response.get_json() == {
        "success": False,
        "message": "Challenge URL is required",
    }


@pytest.mark.parametrize(
    "body", ["[1, 2]", '"just a string"', "42", "null", "{not json", ""]
)
def test_submit_challenge_invalid_json_body_is_json_400(client, init_db, body):
    user, _, _, _, _ = _seed_claim()
    _login(client, user)

    response = client.post(
        "/challenge/submit", data=body, content_type="application/json"
    )

    assert response.status_code == 400
    assert response.is_json
    assert response.get_json() == {"success": False, "message": "Invalid JSON body"}


def test_submit_challenge_unknown_user_json_returns_401(client, init_db):
    ConfigurationFactory()
    with client.session_transaction() as sess:
        sess["user"] = 987654  # stale session: no such user

    response = client.post(
        "/challenge/submit",
        json={"url": "https://codecombat.com/play/level/x?course=1"},
    )

    assert response.status_code == 401
    assert response.get_json() == {"success": False, "message": "Unknown user"}


def test_submit_challenge_unknown_user_form_still_redirects(client, init_db):
    ConfigurationFactory()
    with client.session_transaction() as sess:
        sess["user"] = 987654

    response = client.post(
        "/challenge/submit",
        data={"url": "https://codecombat.com/play/level/x?course=1"},
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert "/login" in response.headers["Location"]
    with client.session_transaction() as sess:
        assert any("Unknown user" in m for _, m in sess.get("_flashes", []))


def test_submit_challenge_no_configuration_json_returns_503(client, init_db):
    user = UserFactory()
    Configuration.query.delete()
    db.session.commit()
    _login(client, user)

    response = client.post(
        "/challenge/submit",
        json={"url": "https://codecombat.com/play/level/test?course=1"},
    )

    assert response.status_code == 503
    assert response.get_json() == {
        "success": False,
        "message": "Configuration missing",
    }


@pytest.mark.parametrize(
    "transform",
    [
        str.upper,
        str.title,
        lambda name: f"  {name}  ",
        lambda name: f"\t{name.upper()}\n",
    ],
)
def test_log_challenge_helper_self_check_ignores_case_and_whitespace(
    init_db, transform
):
    from application.routes.challenge_routes import _log_challenge

    user, course, instance, _, _ = _seed_claim()

    result = _log_challenge(
        _details(course, instance), user, helper=transform(user.username)
    )

    assert result["success"] is True
    log = ChallengeLog.query.filter_by(user_id=user.id).one()
    assert log.helper == ""


@pytest.mark.parametrize(
    ("helper", "expected"),
    [
        ("  friend_user \t", "friend_user"),
        ("x" * 150, "x" * 100),
        (12345, ""),
        (None, ""),
    ],
)
def test_log_challenge_helper_is_normalised(init_db, helper, expected):
    """Direct callers get the same stripping, bounding and type safety."""
    from application.routes.challenge_routes import _log_challenge

    user, course, instance, _, _ = _seed_claim()

    result = _log_challenge(_details(course, instance), user, helper=helper)

    assert result["success"] is True
    log = ChallengeLog.query.filter_by(user_id=user.id).one()
    assert log.helper == expected


def test_real_unique_index_duplicate_is_already_claimed_and_session_recovers(
    client, init_db
):
    """A genuine IntegrityError (not a mocked one) means 'already claimed'.

    The schema has no unique constraint on challenge_logs yet, so one is created
    here on the throw-away test database only. The rival row differs by case, so
    the duplicate check misses it but the index rejects the claim's own insert,
    like the loser of a double-submit race.
    """
    from sqlalchemy import text

    user, course, instance, challenge, url = _seed_claim(active_track="ozaria")
    db.session.execute(
        text(
            "CREATE UNIQUE INDEX uq_test_claim ON challenge_logs "
            "(user_id, lower(challenge_slug), course_instance)"
        )
    )
    db.session.add(
        ChallengeLog(
            user_id=user.id,
            domain="codecombat.com",
            challenge_slug=challenge.slug.upper(),
            course_id=course.id,
            course_instance=instance.id,
        )
    )
    db.session.commit()
    _login(client, user)
    initial_ducks = user.duck_balance

    response = client.post("/challenge/submit", json={"url": url})

    assert response.status_code == 400
    body = response.get_json()
    assert body["success"] is False
    assert "already claimed" in body["message"]
    assert "UNIQUE" not in body["message"]
    # Only the rival's row exists; the loser got no ducks and no track change
    assert _claim_rows(user) == (1, 0)
    db.session.refresh(user)
    assert user.duck_balance == initial_ducks
    assert user.active_track == "ozaria"

    # The session recovered: a different level can still be claimed
    other = ChallengeFactory(
        slug="other-level",
        domain="codecombat.com",
        value=3,
        course_id=course.id,
        is_active=True,
    )
    other_url = url.replace(f"/level/{challenge.slug}?", f"/level/{other.slug}?")
    response = client.post("/challenge/submit", json={"url": other_url})

    assert response.status_code == 200
    assert response.get_json()["success"] is True
    assert _claim_rows(user) == (2, 1)
