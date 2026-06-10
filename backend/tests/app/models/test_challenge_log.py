"""
File: test_challenge_log.py
Type: py
Summary: Unit tests for challenge log model.
"""

from datetime import datetime

import pytest

from application.extensions import db
from application.models.challenge_log import ChallengeLog
from application.models.user import User


def test_challenge_log_creation(sample_challenge_log):
    """Test creating a ChallengeLog entry."""
    challenge_log = sample_challenge_log

    assert db.session.get(User, challenge_log.user_id).username.startswith("user_")
    assert challenge_log.domain == "codecombat.com"

    # UPDATED: Check challenge_slug instead of challenge_name
    # The fixture generates a slug starting with "challenge-slug-"
    assert challenge_log.challenge_slug.startswith("challenge-slug-")

    assert challenge_log.course_id == "12345"
    assert challenge_log.course_instance == "spring2025"
    assert isinstance(challenge_log.timestamp, datetime)


def test_challenge_log_timestamp(init_db):
    """Test that the timestamp is set correctly when creating a new ChallengeLog."""
    # UPDATED: Use challenge_slug in constructor
    challenge_log = ChallengeLog(
        user_id=123,
        domain="LeetCode",
        challenge_slug="leetcode-challenge-slug",
        course_id="54321",
        course_instance="winter2025",
    )
    db.session.add(challenge_log)
    db.session.commit()

    # Check if timestamp is automatically set to the current time
    assert isinstance(challenge_log.timestamp, datetime)
    assert challenge_log.timestamp <= datetime.utcnow()


def test_challenge_log_repr(sample_challenge_log):
    """Test the __repr__ method of ChallengeLog."""
    challenge_log = sample_challenge_log
    repr_output = repr(challenge_log)

    # Check that the user_id in the repr_output is correct
    assert repr_output.startswith("<ChallengeLog(user_id=")
    assert "domain=codecombat.com" in repr_output

    # UPDATED: The new __repr__ returns 'slug=' instead of 'challenge='
    assert "slug=" in repr_output
    assert "timestamp=" in repr_output


def test_challenge_log_missing_field():
    """Test the behavior when required fields are missing."""
    with pytest.raises(Exception):  # Should raise an IntegrityError
        # UPDATED: Use challenge_slug in constructor
        challenge_log = ChallengeLog(
            user_id=123,
            domain="codecombat.com",
            challenge_slug=None,  # Missing required challenge_slug
        )
        db.session.add(challenge_log)
        db.session.commit()


def test_challenge_log_with_optional_fields(init_db):
    """Test creating ChallengeLog with missing optional fields."""
    # UPDATED: Use challenge_slug in constructor
    challenge_log = ChallengeLog(
        user_id=123,
        domain="HackerRank",
        challenge_slug="sample-challenge-slug",
        # Missing course_id and course_instance, which are optional
    )
    db.session.add(challenge_log)
    db.session.commit()

    # Assert the ChallengeLog was created without errors
    assert challenge_log.user_id == 123
    assert challenge_log.domain == "HackerRank"

    # UPDATED: Check challenge_slug
    assert challenge_log.challenge_slug == "sample-challenge-slug"

    assert challenge_log.course_id is None
    assert challenge_log.course_instance is None
