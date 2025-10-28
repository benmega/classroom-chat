import json
from unittest.mock import patch, MagicMock
import pytest

from application import db
from application.models.achievements import Achievement, UserAchievement


def test_check_achievements_success(client, init_db, sample_user, sample_new_achievements):
    """Test successful achievement check with new awards."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    # Mock the evaluate_user function to return new achievements
    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = sample_new_achievements

        response = client.get('/api/achievements/check')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['success'] is True
        assert 'new_awards' in data
        assert len(data['new_awards']) == 3

        # Verify structure of returned achievements
        first_award = data['new_awards'][0]
        assert 'id' in first_award
        assert 'name' in first_award
        assert 'badge' in first_award
        assert first_award['name'] == 'First Message'
        assert 'first-message.png' in first_award['badge']


def test_check_achievements_no_new_awards(client, init_db, sample_user):
    """Test achievement check when user has no new awards."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    # Mock evaluate_user to return empty list
    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = []

        response = client.get('/api/achievements/check')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['success'] is True
        assert data['new_awards'] == []


def test_check_achievements_not_logged_in(client, init_db):
    """Test achievement check without being logged in."""
    response = client.get('/api/achievements/check')

    assert response.status_code == 401
    data = json.loads(response.data)

    assert data['success'] is False
    assert 'Not logged in' in data['error']


def test_check_achievements_user_not_found(client, init_db):
    """Test achievement check with invalid user in session."""
    with client.session_transaction() as sess:
        sess['user'] = 'nonexistent_user_12345'

    response = client.get('/api/achievements/check')

    assert response.status_code == 404
    data = json.loads(response.data)

    assert data['success'] is False
    assert 'User not found' in data['error']


def test_check_achievements_badge_url_format(client, init_db, sample_user, sample_ducks_achievement):
    """Test that badge URLs are formatted correctly."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = [sample_ducks_achievement]

        response = client.get('/api/achievements/check')

        assert response.status_code == 200
        data = json.loads(response.data)

        badge_url = data['new_awards'][0]['badge']
        assert '/static/images/achievement_badges/duck-collector-50.png' in badge_url


def test_check_achievements_multiple_awards_correct_data(client, init_db, sample_user, sample_multiple_achievements):
    """Test that multiple achievements return correct data structure."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = sample_multiple_achievements

        response = client.get('/api/achievements/check')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert len(data['new_awards']) == 2

        # Check first achievement
        assert data['new_awards'][0]['name'] == 'Achievement One'
        assert 'achievement-one.png' in data['new_awards'][0]['badge']

        # Check second achievement
        assert data['new_awards'][1]['name'] == 'Achievement Two'
        assert 'achievement-two.png' in data['new_awards'][1]['badge']


def test_check_achievements_evaluate_user_called_correctly(client, init_db, sample_user):
    """Test that evaluate_user is called with the correct user object."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = []

        response = client.get('/api/achievements/check')

        # Verify evaluate_user was called once
        assert mock_evaluate.call_count == 1

        # Verify it was called with the correct user
        called_user = mock_evaluate.call_args[0][0]
        assert called_user.id == sample_user.id
        assert called_user.username == sample_user.username


def test_check_achievements_single_award(client, init_db, sample_user, sample_chat_achievement):
    """Test achievement check with a single new award."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = [sample_chat_achievement]

        response = client.get('/api/achievements/check')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['success'] is True
        assert len(data['new_awards']) == 1
        assert data['new_awards'][0]['name'] == 'First Message'


def test_check_achievements_response_structure(client, init_db, sample_user):
    """Test that the response structure matches expected format."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    # Create a specific achievement for structure testing
    achievement = Achievement(
        id=999,
        name="Structure Test",
        slug="structure-test",
        type="ducks",
        reward=100,
        description="Testing response structure",
        requirement_value="100"
    )
    db.session.add(achievement)
    db.session.commit()

    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = [achievement]

        response = client.get('/api/achievements/check')

        assert response.status_code == 200
        data = json.loads(response.data)

        # Check top-level structure
        assert 'success' in data
        assert 'new_awards' in data
        assert isinstance(data['new_awards'], list)

        # Check award structure
        award = data['new_awards'][0]
        assert 'id' in award
        assert 'name' in award
        assert 'badge' in award
        assert award['id'] == 999
        assert award['name'] == 'Structure Test'


def test_check_achievements_session_persistence(client, init_db, sample_user):
    """Test that the session is maintained after checking achievements."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username
        sess['test_key'] = 'test_value'

    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = []

        response = client.get('/api/achievements/check')

        assert response.status_code == 200

        # Verify session is still intact
        with client.session_transaction() as sess:
            assert sess.get('user') == sample_user.username
            assert sess.get('test_key') == 'test_value'


def test_check_achievements_with_special_characters_in_slug(client, init_db, sample_user):
    """Test badge URL generation with special characters in slug."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    achievement = Achievement(
        name="Special Achievement",
        slug="special-achievement_2024",
        type="progress",
        reward=30,
        description="Achievement with special slug",
        requirement_value="1"
    )
    db.session.add(achievement)
    db.session.commit()

    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = [achievement]

        response = client.get('/api/achievements/check')

        assert response.status_code == 200
        data = json.loads(response.data)

        badge_url = data['new_awards'][0]['badge']
        assert 'special-achievement_2024.png' in badge_url


def test_check_achievements_evaluate_user_exception_handling(client, init_db, sample_user):
    """Test handling when evaluate_user raises an exception."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.side_effect = Exception("Evaluation error")

        response = client.get('/api/achievements/check')

        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Failed to evaluate achievements' in data['error']


def test_check_achievements_content_type(client, init_db, sample_user):
    """Test that the response has correct content type."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    with patch('application.routes.api_achievements.evaluate_user') as mock_evaluate:
        mock_evaluate.return_value = []

        response = client.get('/api/achievements/check')

        assert response.status_code == 200
        assert response.content_type == 'application/json'


def test_check_achievements_empty_session(client, init_db):
    """Test with completely empty session."""
    # Don't set any session data
    response = client.get('/api/achievements/check')

    assert response.status_code == 401
    data = json.loads(response.data)
    assert data['success'] is False