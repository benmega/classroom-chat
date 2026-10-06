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


@pytest.mark.parametrize(
    "value, difficulty, expected_value",
    [
        (1.5, "medium", 1.5),
        (0.5, "Medium", 0.5),  # seeded difficulties are capitalised: no scaling
        (1.5, "easy", 0.75),
        (2.5, "hard", 5.0),
    ],
)
def test_scale_value_keeps_fractions(init_db, value, difficulty, expected_value):
    challenge = ChallengeFactory(value=value, difficulty=difficulty)

    assert challenge.scale_value() == pytest.approx(expected_value)


def test_fractional_value_survives_a_round_trip(init_db):
    challenge = ChallengeFactory(value=1.5)
    db.session.commit()
    db.session.expire_all()

    assert db.session.get(Challenge, challenge.id).value == 1.5


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


def test_only_the_slug_of_a_challenge_is_unique(init_db):
    """
    Challenges may share a name, in different domains or in the same one.
    The slug is what tells them apart and cannot be reused.
    """
    from sqlalchemy.exc import IntegrityError

    c1 = Challenge(name="Shared Name", slug="slug-c1", domain="codecombat.com")
    c2 = Challenge(name="Shared Name", slug="slug-c2", domain="www.ozaria.com")
    c3 = Challenge(name="Shared Name", slug="slug-c3", domain="codecombat.com")
    db.session.add_all([c1, c2, c3])
    db.session.commit()  # Should succeed

    assert Challenge.query.filter_by(name="Shared Name").count() == 3

    db.session.add(Challenge(name="Another Name", slug="slug-c1", domain="other.com"))
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()

