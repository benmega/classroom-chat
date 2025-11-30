"""
File: test_api_achievements.py
Type: py
Summary: Unit tests for api achievements Flask routes.
"""

import json
from unittest.mock import patch
import pytest

from application import db
from application.models.achievements import Achievement


# FIXTURE: (Ideally this belongs in conftest.py, but keeping it here for context)
@pytest.fixture
def logged_in_client(client, sample_user):
    """A Flask test client that is logged in as sample_user."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.id
    return client


def test_check_achievements_success(logged_in_client, init_db, sample_user, sample_new_achievements):
    """Test successful achievement check with new awards."""
    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = sample_new_achievements

        response = logged_in_client.get('/api/achievements/check')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['success'] is True
        assert len(data['new_awards']) == len(sample_new_achievements)

        # IMPROVED: Dynamic assertion.
        # Don't hardcode "First Message". Check that the returned data matches the input data.
        returned_names = [a['name'] for a in data['new_awards']]
        expected_names = [a.name for a in sample_new_achievements]

        # specific check: ensure all expected achievements are present, regardless of order
        assert set(returned_names) == set(expected_names)


def test_check_achievements_no_new_awards(logged_in_client, init_db):
    """Test achievement check when user has no new awards."""
    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = []

        response = logged_in_client.get('/api/achievements/check')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['new_awards'] == []


def test_check_achievements_not_logged_in(client, init_db):
    """Test achievement check without being logged in."""
    response = client.get('/api/achievements/check')

    # IMPROVED: relying on Status Code as the contract.
    assert response.status_code == 401
    data = json.loads(response.data)
    assert data['success'] is False
    # Only check that an error message exists, not the exact wording.
    assert data.get('error')


def test_check_achievements_user_not_found(client, init_db):
    """Test achievement check with invalid user ID in session."""
    with client.session_transaction() as sess:
        sess['user'] = 99999999  # Non-existent ID

    response = client.get('/api/achievements/check')

    # IMPROVED: 404 is the contract. The text message is UI fluff.
    assert response.status_code == 404
    data = json.loads(response.data)
    assert data['success'] is False


def test_check_achievements_badge_url_format(logged_in_client, init_db, sample_ducks_achievement):
    """Test that badge URLs contain the correct image reference."""
    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = [sample_ducks_achievement]

        response = logged_in_client.get('/api/achievements/check')

        assert response.status_code == 200
        data = json.loads(response.data)
        badge_url = data['new_awards'][0]['badge']

        # IMPROVED: Don't test the folder structure (/static/images/...).
        # Just test that the correct file slug is being generated.
        assert f"{sample_ducks_achievement.slug}.png" in badge_url


def test_check_achievements_multiple_awards_correct_data(logged_in_client, init_db, sample_multiple_achievements):
    """Test that multiple achievements return correct data structure."""
    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = sample_multiple_achievements

        response = logged_in_client.get('/api/achievements/check')

        assert response.status_code == 200
        data = json.loads(response.data)

        # IMPROVED: Order agnostic check.
        # We verify that both items from the sample are found in the response
        response_names = {item['name'] for item in data['new_awards']}
        sample_names = {item.name for item in sample_multiple_achievements}

        assert response_names == sample_names


def test_check_achievements_evaluate_user_called_correctly(logged_in_client, init_db, sample_user):
    """Test that evaluate_user is called with the correct user object."""
    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = []

        logged_in_client.get('/api/achievements/check')

        # This test is fine as-is because it tests the integration point.
        assert mock_evaluate.call_count == 1
        called_user = mock_evaluate.call_args[0][0]
        assert called_user.id == sample_user.id


def test_check_achievements_single_award(logged_in_client, init_db, sample_chat_achievement):
    """Test achievement check with a single new award."""
    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = [sample_chat_achievement]

        response = logged_in_client.get('/api/achievements/check')

        assert response.status_code == 200
        data = json.loads(response.data)

        # IMPROVED: Compare against input object
        assert data['new_awards'][0]['name'] == sample_chat_achievement.name


def test_check_achievements_response_structure(logged_in_client, init_db):
    """Test that the response structure matches expected format."""
    achievement = Achievement(
        id=999, name="Structure Test", slug="structure-test",
        type="ducks", reward=100, description="Test", requirement_value="100"
    )
    db.session.add(achievement)
    db.session.commit()

    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = [achievement]

        response = logged_in_client.get('/api/achievements/check')
        data = json.loads(response.data)

        # This is a good "Contract Test"
        award = data['new_awards'][0]
        assert all(k in award for k in ('id', 'name', 'badge'))


def test_check_achievements_session_persistence(logged_in_client, init_db, sample_user):
    """Test that the session is maintained after checking achievements."""
    with logged_in_client.session_transaction() as sess:
        sess['test_key'] = 'test_value'

    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = []
        logged_in_client.get('/api/achievements/check')

        with logged_in_client.session_transaction() as sess:
            assert sess.get('user') == sample_user.id
            assert sess.get('test_key') == 'test_value'


def test_check_achievements_with_special_characters_in_slug(logged_in_client, init_db):
    """Test badge URL generation with special characters in slug."""
    achievement = Achievement(
        name="Special Achievement",
        slug="special-achievement_2024",
        type="progress",
        reward=30,
        description="Desc",
        requirement_value="1"
    )
    db.session.add(achievement)
    db.session.commit()

    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = [achievement]

        response = logged_in_client.get('/api/achievements/check')
        data = json.loads(response.data)

        # IMPROVED: Just check that the slug is correctly URL encoded/present
        assert achievement.slug in data['new_awards'][0]['badge']


def test_check_achievements_evaluate_user_exception_handling(logged_in_client, init_db):
    """Test handling when evaluate_user raises an exception."""
    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.side_effect = Exception("Evaluation error")

        response = logged_in_client.get('/api/achievements/check')

        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['success'] is False
        # IMPROVED: Ensure an error key exists, but don't check exact wording
        assert 'error' in data


def test_check_achievements_content_type(logged_in_client, init_db):
    """Test that the response has correct content type."""
    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = []
        response = logged_in_client.get('/api/achievements/check')
        assert response.content_type == 'application/json'