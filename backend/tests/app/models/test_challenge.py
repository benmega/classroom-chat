"""
File: test_challenge.py
Type: py
Summary: Unit tests for challenge model.
"""

from datetime import datetime

import pytest
from application.extensions import db
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog

# tests/app/models/test_challenge.py


def test_complete_challenge(sample_challenge, sample_user):
    assert ChallengeLog.query.count() == 0

    # Call complete_challenge method
    sample_challenge.complete_challenge(sample_user)

    log_entry = ChallengeLog.query.filter_by(user_id=sample_user.id).first()
    assert log_entry is not None

    # UPDATED: Check 'challenge_slug' against 'sample_challenge.slug'
    assert log_entry.challenge_slug == sample_challenge.slug
    assert log_entry.user_id == sample_user.id


@pytest.mark.parametrize(
    "difficulty, expected_value",
    [
        ("easy", 5),  # 10 * 0.5
        ("medium", 10),  # 10 * 1.0
        ("hard", 20),  # 10 * 2.0
    ],
)
def test_scale_value(sample_challenge, difficulty, expected_value):
    sample_challenge.difficulty = difficulty
    assert sample_challenge.scale_value() == expected_value


def test_slug_auto_set(init_db):
    challenge_without_slug = Challenge(
        name="Challenge Without Slug", domain="Test Domain"
    )
    db.session.add(challenge_without_slug)
    db.session.commit()

    # Assert that the slug was auto-generated based on the name
    assert challenge_without_slug.slug == "Challenge Without Slug"


def test_created_at_timestamp(init_db):
    challenge_with_timestamp = Challenge(
        name="Timestamp Challenge", slug="timestamp-challenge", domain="Test Domain"
    )
    db.session.add(challenge_with_timestamp)
    db.session.commit()

    # Assert that 'created_at' is populated with the current timestamp
    assert challenge_with_timestamp.created_at is not None
    assert isinstance(challenge_with_timestamp.created_at, datetime)


def test_scale_value_with_custom_multiplier(sample_challenge):
    sample_challenge.difficulty = "medium"
    assert (
        sample_challenge.scale_value(difficulty_multiplier=1.5) == 15
    )  # 10 * 1.0 * 1.5


def test_challenge_slug_auto_generation(init_db):
    """
    Test that a slug is automatically generated from the name
    if not provided explicitly (via the before_insert listener).
    """
    challenge = Challenge(
        name="Intro to Python Loops",
        domain="codecombat.com",
        difficulty="easy",
        value=5,
    )
    db.session.add(challenge)
    db.session.commit()

    # The event listener should have copied name to slug
    assert challenge.slug == "Intro to Python Loops"


def test_challenge_explicit_slug(init_db):
    """
    Test that if a slug is provided explicitly, it is preserved.
    """
    challenge = Challenge(
        name="Complex Algorithms", slug="complex-algos-v1", domain="codecombat.com"
    )
    db.session.add(challenge)
    db.session.commit()

    assert challenge.slug == "complex-algos-v1"
    assert challenge.name == "Complex Algorithms"


def test_complete_challenge_logs_slug(init_db, sample_user):
    """
    Test that completing a challenge creates a log entry using the SLUG,
    not the name.
    """
    challenge_name = "Super Hard Level"
    challenge_slug = "super-hard-level-slug"

    challenge = Challenge(
        name=challenge_name, slug=challenge_slug, domain="codecombat.com", value=10
    )
    db.session.add(challenge)
    db.session.commit()

    challenge.complete_challenge(sample_user)

    log = ChallengeLog.query.filter_by(user_id=sample_user.id).first()

    assert log is not None
    assert log.challenge_slug == challenge_slug  # Crucial check: Must match slug
    assert log.challenge_slug != challenge_name  # Ensure it didn't use the name
    assert log.domain == "codecombat.com"


def test_challenge_log_model_structure(init_db):
    """
    Verify the ChallengeLog model has the correct columns after migration.
    This ensures the SQLAlchemy model matches our expectation.
    """
    log = ChallengeLog(user_id=1, domain="test.com", challenge_slug="test-slug")
    db.session.add(log)
    db.session.commit()

    # Retrieve and inspect
    saved_log = ChallengeLog.query.first()

    assert hasattr(saved_log, "challenge_slug")
    assert not hasattr(saved_log, "challenge_name")


def test_challenge_name_uniqueness_scoped_by_domain(init_db):
    """
    Verify that two challenges can share the same name if they are in different domains,
    but cannot share the same name in the same domain.
    """
    from sqlalchemy.exc import IntegrityError

    c1 = Challenge(name="Unique Test Name", slug="slug-c1", domain="codecombat.com")
    c2 = Challenge(name="Unique Test Name", slug="slug-c2", domain="www.ozaria.com")
    db.session.add(c1)
    db.session.add(c2)
    db.session.commit()  # Should succeed

    c3 = Challenge(name="Unique Test Name", slug="slug-c3", domain="codecombat.com")
    db.session.add(c3)
    with pytest.raises(IntegrityError):
        db.session.commit()
