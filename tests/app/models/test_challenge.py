import pytest
from application import create_app
from application.extensions import db
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from datetime import datetime




# Test challenge completion logging
def test_complete_challenge(sample_challenge, sample_user):
    # Ensure no ChallengeLog entries exist before completion
    assert ChallengeLog.query.count() == 0

    # Call complete_challenge method
    sample_challenge.complete_challenge(sample_user)

    # Ensure a new log entry is created
    log_entry = ChallengeLog.query.filter_by(username=sample_user._username).first()
    assert log_entry is not None
    assert log_entry.challenge_name == sample_challenge.name
    assert log_entry.username == sample_user.username


# Test scaling of challenge value based on difficulty
@pytest.mark.parametrize(
    "difficulty, expected_value",
    [
        ("easy", 5),  # 10 * 0.5
        ("medium", 10),  # 10 * 1.0
        ("hard", 20),  # 10 * 2.0
    ]
)
def test_scale_value(sample_challenge, difficulty, expected_value):
    sample_challenge.difficulty = difficulty
    assert sample_challenge.scale_value() == expected_value


# Test that the slug is automatically set if not provided (via event listener)
def test_slug_auto_set(init_db):
    challenge_without_slug = Challenge(name="Challenge Without Slug", domain="Test Domain")
    db.session.add(challenge_without_slug)
    db.session.commit()

    # Assert that the slug was auto-generated based on the name
    assert challenge_without_slug.slug == "Challenge Without Slug"


# Test setting default value for 'created_at' timestamp
def test_created_at_timestamp(init_db):
    challenge_with_timestamp = Challenge(
        name="Timestamp Challenge", slug="timestamp-challenge", domain="Test Domain"
    )
    db.session.add(challenge_with_timestamp)
    db.session.commit()

    # Assert that 'created_at' is populated with the current timestamp
    assert challenge_with_timestamp.created_at is not None
    assert isinstance(challenge_with_timestamp.created_at, datetime)


# Test scaling with a custom difficulty multiplier
def test_scale_value_with_custom_multiplier(sample_challenge):
    sample_challenge.difficulty = "medium"
    assert sample_challenge.scale_value(difficulty_multiplier=1.5) == 15  # 10 * 1.0 * 1.5
