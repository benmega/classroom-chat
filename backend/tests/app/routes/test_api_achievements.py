import json

import pytest
from application import db
from tests.factories import UserFactory, AchievementFactory

@pytest.fixture
def test_user(init_db):
    user = UserFactory()
    db.session.commit()
    return user

@pytest.fixture
def logged_in_client(client, test_user):
    """A Flask test client that is logged in as test_user."""
    with client.session_transaction() as sess:
        sess["user"] = test_user.id
    return client

def test_check_achievements_success(logged_in_client, init_db, test_user):
    """Test successful achievement check with new awards."""
    achievement = AchievementFactory(type="ducks", requirement_value="10")
    test_user.earned_ducks = 15 # >= 10
    test_user.duck_balance = 0
    db.session.commit()

    response = logged_in_client.get("/api/achievements/check")

    assert response.status_code == 200
    data = json.loads(response.data)

    assert data["success"] is True
    assert len(data["new_awards"]) >= 1

    returned_names = [a["name"] for a in data["new_awards"]]
    assert achievement.name in returned_names

def test_check_achievements_no_new_awards(logged_in_client, init_db, test_user):
    """Test achievement check when user has no new awards."""
    AchievementFactory(type="ducks", requirement_value="100")
    test_user.earned_ducks = 5 # < 100
    db.session.commit()

    response = logged_in_client.get("/api/achievements/check")

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert data["new_awards"] == []

def test_check_achievements_not_logged_in(client, init_db):
    """Test achievement check without being logged in."""
    response = client.get("/api/achievements/check")

    assert response.status_code == 401
    data = json.loads(response.data)
    assert data["success"] is False
    assert data.get("error")

def test_check_achievements_user_not_found(client, init_db):
    """Test achievement check with invalid user ID in session."""
    with client.session_transaction() as sess:
        sess["user"] = 99999999  # Non-existent ID

    response = client.get("/api/achievements/check")

    assert response.status_code == 404
    data = json.loads(response.data)
    assert data["success"] is False

def test_check_achievements_badge_url_format(logged_in_client, init_db, test_user):
    """Test that badge URLs contain the correct image reference."""
    achievement = AchievementFactory(type="ducks", requirement_value="10")
    test_user.earned_ducks = 10
    db.session.commit()

    response = logged_in_client.get("/api/achievements/check")

    assert response.status_code == 200
    data = json.loads(response.data)
    
    badge_url = None
    for award in data["new_awards"]:
        if award["name"] == achievement.name:
            badge_url = award["badge"]
            break
            
    assert badge_url is not None
    assert f"{achievement.slug}.png" in badge_url

def test_check_achievements_multiple_awards_correct_data(logged_in_client, init_db, test_user):
    """Test that multiple achievements return correct data structure."""
    ach1 = AchievementFactory(type="ducks", requirement_value="10")
    ach2 = AchievementFactory(type="ducks", requirement_value="20")
    test_user.earned_ducks = 25
    db.session.commit()

    response = logged_in_client.get("/api/achievements/check")

    assert response.status_code == 200
    data = json.loads(response.data)

    response_names = {item["name"] for item in data["new_awards"]}
    assert ach1.name in response_names
    assert ach2.name in response_names

def test_check_achievements_evaluate_user_called_correctly(logged_in_client, init_db, test_user):
    """Test that evaluate_user is actually persisting transactions (replaces mock test)."""
    achievement = AchievementFactory(type="ducks", requirement_value="10", reward=50)
    test_user.earned_ducks = 15
    db.session.commit()

    logged_in_client.get("/api/achievements/check")

    from application.models.duck_transaction import DuckTransaction
    txs = DuckTransaction.query.filter_by(user_id=test_user.id).all()
    assert len(txs) >= 1
    assert any(f"Achievement: {achievement.name}" in tx.reason for tx in txs)

def test_check_achievements_single_award(logged_in_client, init_db, test_user):
    """Test achievement check with a single new award."""
    achievement = AchievementFactory(type="ducks", requirement_value="15")
    test_user.earned_ducks = 15
    db.session.commit()

    response = logged_in_client.get("/api/achievements/check")

    assert response.status_code == 200
    data = json.loads(response.data)

    award_names = [a["name"] for a in data["new_awards"]]
    assert achievement.name in award_names

def test_check_achievements_response_structure(logged_in_client, init_db, test_user):
    """Test that the response structure matches expected format."""
    achievement = AchievementFactory(type="ducks", requirement_value="100")
    test_user.earned_ducks = 100
    db.session.commit()

    response = logged_in_client.get("/api/achievements/check")
    data = json.loads(response.data)

    award = [a for a in data["new_awards"] if a["name"] == achievement.name][0]
    assert all(k in award for k in ("id", "name", "badge"))

def test_check_achievements_session_persistence(logged_in_client, init_db, test_user):
    """Test that the session is maintained after checking achievements."""
    with logged_in_client.session_transaction() as sess:
        sess["test_key"] = "test_value"

    logged_in_client.get("/api/achievements/check")

    with logged_in_client.session_transaction() as sess:
        assert sess.get("user") == test_user.id
        assert sess.get("test_key") == "test_value"

def test_check_achievements_with_special_characters_in_slug(logged_in_client, init_db, test_user):
    """Test badge URL generation with special characters in slug."""
    achievement = AchievementFactory(slug="special-achievement_2024", type="ducks", requirement_value="1")
    test_user.earned_ducks = 1
    db.session.commit()

    response = logged_in_client.get("/api/achievements/check")
    data = json.loads(response.data)

    badge_url = None
    for award in data["new_awards"]:
        if award["name"] == achievement.name:
            badge_url = award["badge"]
            break

    assert badge_url is not None
    assert achievement.slug in badge_url

def test_check_achievements_content_type(logged_in_client, init_db):
    """Test that the response has correct content type."""
    response = logged_in_client.get("/api/achievements/check")
    assert response.content_type == "application/json"

def test_api_achievements_all_integration(logged_in_client, init_db, test_user):
    """
    Comprehensive integration test for /api/achievements/all.
    Ensures that the JSON structure and 200 OK status are verified.
    """
    ach1 = AchievementFactory(type="ducks")
    ach2 = AchievementFactory(type="project")
    db.session.commit()

    response = logged_in_client.get("/api/achievements/all")

    assert response.status_code == 200
    assert response.is_json

    data = response.get_json()
    assert data["status"] == "success"
    assert "data" in data

    response_data = data["data"]
    assert "achievements" in response_data
    assert "user_achievements" in response_data

    achievements = response_data["achievements"]
    assert len(achievements) >= 2

    slugs = [ach["slug"] for ach in achievements]
    for sample_ach in [ach1, ach2]:
        assert sample_ach.slug in slugs

        ach_dict = next(ach for ach in achievements if ach["slug"] == sample_ach.slug)
        assert "current_progress" in ach_dict
        assert "requirement_value" in ach_dict
        assert "name" in ach_dict
        assert "description" in ach_dict

def test_api_achievements_all_not_logged_in(client, init_db):
    """Test /api/achievements/all returns 404 with JSON error if not logged in."""
    response = client.get("/api/achievements/all")

    assert response.status_code == 404
    assert response.is_json

    data = response.get_json()
    assert data["success"] is False
    assert data["error"] == "User not found!"
