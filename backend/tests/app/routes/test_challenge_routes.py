"""
File: test_challenge_routes.py
Type: py
Summary: Unit tests for challenge routes Flask routes.
"""

import re
from unittest.mock import patch

import pytest
from application import db
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.configuration import Configuration
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
    assert b"seem to be part of a valid course instance" in response.data


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
