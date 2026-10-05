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
from tests.factories import ChallengeFactory

# tests/app/models/test_challenge.py


@pytest.mark.parametrize(
    "difficulty, expected_value",
    [
        ("easy", 5),  # 10 * 0.5
        ("medium", 10),  # 10 * 1.0
        ("hard", 20),  # 10 * 2.0
    ],
)
def test_scale_value(init_db, difficulty, expected_value):
    sample_challenge = ChallengeFactory(value=10)
    sample_challenge.difficulty = difficulty
    assert sample_challenge.scale_value() == expected_value


@pytest.mark.parametrize(
    "name, expected_slug",
    [
        ("Challenge Without Slug", "challenge-without-slug"),
        ("Intro to Python_Loops!", "intro-to-python-loops"),
        ("  Signs -- and   Portents  ", "signs-and-portents"),
        # Nothing to build a slug from: the name is kept rather than an empty slug
        ("???", "???"),
    ],
)
def test_missing_slug_defaults_to_the_kebab_case_name(init_db, name, expected_slug):
    """The before_insert listener fills in a slug only when none was given."""
    challenge = Challenge(name=name, domain="codecombat.com")
    db.session.add(challenge)
    db.session.commit()

    assert challenge.slug == expected_slug
    assert challenge.name == name


def test_created_at_timestamp(init_db):
    challenge_with_timestamp = Challenge(
        name="Timestamp Challenge", slug="timestamp-challenge", domain="Test Domain"
    )
    db.session.add(challenge_with_timestamp)
    db.session.commit()

    # Assert that 'created_at' is populated with the current timestamp
    assert challenge_with_timestamp.created_at is not None
    assert isinstance(challenge_with_timestamp.created_at, datetime)


@pytest.mark.parametrize(
    "difficulty, multiplier, expected_value",
    [
        ("medium", 1.5, 15),  # 10 * 1.0 * 1.5
        ("hard", 2.0, 40),  # 10 * 2.0 * 2.0
    ],
)
def test_scale_value_with_custom_multiplier(
    init_db, difficulty, multiplier, expected_value
):
    sample_challenge = ChallengeFactory(value=10)
    sample_challenge.difficulty = difficulty
    assert sample_challenge.scale_value(difficulty_multiplier=multiplier) == expected_value


def test_challenge_repr(init_db):
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

