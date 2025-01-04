import pytest
from datetime import datetime

from application.extensions import db
from application.models.challenge_log import ChallengeLog


def test_challenge_log_creation(sample_challenge_log):
    """Test creating a ChallengeLog entry."""
    challenge_log = sample_challenge_log
    # Assert the generated username matches the one created in the fixture
    assert challenge_log.username.startswith("user_")
    assert challenge_log.domain == "CodeCombat"
    assert challenge_log.challenge_name.startswith("challenge_")  # Asserts the challenge name starts with 'challenge_'
    assert challenge_log.course_id == "12345"
    assert challenge_log.course_instance == "spring2025"
    assert isinstance(challenge_log.timestamp, datetime)



def test_challenge_log_timestamp(init_db):
    """Test that the timestamp is set correctly when creating a new ChallengeLog."""
    challenge_log = ChallengeLog(
        username="testuser",
        domain="LeetCode",
        challenge_name="LeetCode Challenge",
        course_id="54321",
        course_instance="winter2025"
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

    # Check that the username in the repr_output starts with 'user_' (indicating it's a dynamically generated UUID)
    assert repr_output.startswith(f"<ChallengeLog(username=user_")  # Checking that the output has the user_ prefix
    assert "domain=CodeCombat" in repr_output
    assert "challenge=" in repr_output
    assert "timestamp=" in repr_output


def test_challenge_log_missing_field():
    """Test the behavior when required fields are missing."""
    with pytest.raises(Exception):  # Should raise an IntegrityError if fields are missing
        challenge_log = ChallengeLog(
            username="testuser",
            domain="CodeCombat",
            challenge_name=None  # Missing required challenge_name
***REMOVED***
        db.session.add(challenge_log)
        db.session.commit()


def test_challenge_log_with_optional_fields(init_db):
    """Test creating ChallengeLog with missing optional fields."""
    challenge_log = ChallengeLog(
        username="testuser",
        domain="HackerRank",
        challenge_name="Sample Challenge"
        # Missing course_id and course_instance, which are optional
    )
    db.session.add(challenge_log)
    db.session.commit()

    # Assert the ChallengeLog was created without errors, even with missing optional fields
    assert challenge_log.username == "testuser"
    assert challenge_log.domain == "HackerRank"
    assert challenge_log.challenge_name == "Sample Challenge"
    assert challenge_log.course_id is None
    assert challenge_log.course_instance is None
