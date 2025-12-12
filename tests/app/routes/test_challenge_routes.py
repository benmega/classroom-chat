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

# --- FIXTURES ---

@pytest.fixture
def sample_challenge_active(init_db):
    """Fixture to create an active challenge with known difficulty."""
    challenge = Challenge(
        name="Dungeons of Kithgard",
        slug="dungeons-of-kithgard",
        domain="codecombat.com",
        difficulty="medium",  # Medium = 1.0x multiplier. Base value 10 -> 10 points.
        value=10,
        is_active=True,
        course_id="intro-to-python"
    )
    db.session.add(challenge)
    db.session.commit()
    return challenge


@pytest.fixture
def sample_configuration_with_multiplier(init_db):
    """Fixture to create a configuration with duck multiplier."""
    config = Configuration(
        ai_teacher_enabled=True,
        message_sending_enabled=True,
        duck_multiplier=2
    )
    db.session.add(config)
    db.session.commit()
    return config

# --- HELPER TO MOCK RENDER_TEMPLATE ---
@pytest.fixture
def mock_render_template(client):
    """
    Mocks render_template to return a static string.
    This prevents TemplateNotFound errors when templates are missing in the test env.
    """
    with patch('application.routes.challenge_routes.render_template') as mock:
        mock.return_value = "Mocked Template Content"
        yield mock

# --- TESTS ---

def test_submit_challenge_get(client, init_db, sample_user, sample_configuration, mock_render_template):
    """Test GET request to challenge submission page."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    response = client.get('/challenge/submit')

    assert response.status_code == 200
    assert b'Mocked Template Content' in response.data


def test_submit_challenge_no_session(client, init_db):
    """Test submitting challenge without logged in user."""
    # Do not follow redirects so we can check the 302 location
    response = client.post('/challenge/submit', data={
        'url': 'https://codecombat.com/play/level/dungeons-of-kithgard'
    }, follow_redirects=False)

    # Should redirect to user.login
    assert response.status_code == 302
    assert '/login' in response.headers['Location']

    # Check flash message by inspecting the session directly
    with client.session_transaction() as sess:
        flashes = sess.get('_flashes', [])
        # Flashes are list of (category, message)
        messages = [msg for cat, msg in flashes]
        assert any("No session username found" in m for m in messages)


def test_submit_challenge_no_url(client, init_db, sample_user, sample_configuration, mock_render_template):
    """Test submitting challenge without URL."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    response = client.post('/challenge/submit', data={
        'url': '',
        'notes': 'Some notes'
    }, follow_redirects=True)

    assert response.status_code == 200

    # Check flash message in session
    with client.session_transaction() as sess:
        flashes = sess.get('_flashes', [])
        messages = [msg for cat, msg in flashes]
        assert any("Challenge URL is required" in m for m in messages)


def test_submit_challenge_success(client, init_db, sample_user, sample_configuration, sample_challenge_active, mock_render_template):
    """Test successful challenge submission."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    with patch('application.routes.challenge_routes.detect_and_handle_challenge_url') as mock_detect:
        mock_detect.return_value = {
            'handled': True,
            'details': {
                'success': True,
                'duck_reward': 10,
                'message': 'Challenge logged successfully'
            }
        }

        # Follow redirects = True because success redirects to same page
        response = client.post('/challenge/submit', data={
            'url': 'https://codecombat.com/play/level/dungeons-of-kithgard?course=intro-to-python',
            'helpers': '',
            'notes': 'Completed the challenge!'
        }, follow_redirects=True)

        assert response.status_code == 200

        # Check flash messages
        with client.session_transaction() as sess:
            flashes = sess.get('_flashes', [])
            messages = [msg for cat, msg in flashes]
            assert any("Congrats" in m for m in messages)
            assert any("10 ducks" in m for m in messages)


def test_submit_challenge_failed(client, init_db, sample_user, sample_configuration, mock_render_template):
    """Test failed challenge submission."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    with patch('application.routes.challenge_routes.detect_and_handle_challenge_url') as mock_detect:
        mock_detect.return_value = {
            'handled': True,
            'details': {
                'success': False,
                'message': 'Challenge could not be validated'
            }
        }

        response = client.post('/challenge/submit', data={
            'url': 'https://codecombat.com/play/level/invalid-challenge'
        }, follow_redirects=True)

        assert response.status_code == 200

        with client.session_transaction() as sess:
            flashes = sess.get('_flashes', [])
            messages = [msg for cat, msg in flashes]
            assert any("Challenge could not be validated" in m for m in messages)


def test_submit_challenge_with_helper(client, init_db, sample_user, sample_configuration, sample_challenge_active, mock_render_template):
    """Test challenge submission with helper information."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    with patch('application.routes.challenge_routes.detect_and_handle_challenge_url') as mock_detect:
        mock_detect.return_value = {
            'handled': True,
            'details': {
                'success': True,
                'duck_reward': 10,
                'message': 'Logged'
            }
        }

        response = client.post('/challenge/submit', data={
            'url': 'https://codecombat.com/play/level/dungeons-of-kithgard',
            'helpers': 'friend_user',
            'notes': ''
        }, follow_redirects=True)

        assert response.status_code == 200

        # Verify mock was called with helper
        call_args = mock_detect.call_args

        # Helper is the 4th argument (index 3) OR a kwarg
        if 'helper' in call_args.kwargs:
            assert call_args.kwargs['helper'] == 'friend_user'
        else:
            assert call_args.args[3] == 'friend_user'


def test_submit_challenge_with_notes(client, init_db, sample_user, sample_configuration, sample_challenge_active, mock_render_template):
    """Test challenge submission with notes."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    with patch('application.routes.challenge_routes.detect_and_handle_challenge_url') as mock_detect:
        mock_detect.return_value = {
            'handled': True,
            'details': {
                'success': True,
                'duck_reward': 10,
                'message': 'Logged'
            }
        }

        response = client.post('/challenge/submit', data={
            'url': 'https://codecombat.com/play/level/dungeons-of-kithgard',
            'notes': 'This challenge was really fun!'
        }, follow_redirects=True)

        assert response.status_code == 200


def test_detect_and_handle_challenge_url_valid(init_db, sample_user, sample_challenge_active):
    """Test detecting and handling a valid challenge URL."""
    from application.routes.challenge_routes import detect_and_handle_challenge_url

    url = 'https://codecombat.com/play/level/dungeons-of-kithgard?course=intro-to-python&course-instance=fall2024'
    result = detect_and_handle_challenge_url(url, sample_user.username, duck_multiplier=1)

    assert result['handled'] is True
    assert result['details']['success'] is True
    assert 'duck_reward' in result['details']


def test_detect_and_handle_challenge_url_invalid(init_db, sample_user):
    """Test detecting invalid URL."""
    from application.routes.challenge_routes import detect_and_handle_challenge_url

    url = 'https://invalid-url.com/not-a-challenge'
    result = detect_and_handle_challenge_url(url, sample_user.username, duck_multiplier=1)

    assert result['handled'] is False
    assert result['details'] is None


def test_detect_and_handle_challenge_url_duplicate(init_db, sample_user, sample_challenge_active):
    """Test handling duplicate challenge submission."""
    from application.routes.challenge_routes import detect_and_handle_challenge_url

    # Submit challenge first time
    url = 'https://codecombat.com/play/level/dungeons-of-kithgard?course=intro-to-python'
    result1 = detect_and_handle_challenge_url(url, sample_user.username, duck_multiplier=1)
    assert result1['handled'] is True
    assert result1['details']['success'] is True

    # Try to submit same challenge again
    result2 = detect_and_handle_challenge_url(url, sample_user.username, duck_multiplier=1)
    assert result2['handled'] is True
    assert result2['details']['success'] is False
    assert 'already claimed' in result2['details']['message']


def test_detect_and_handle_challenge_url_with_multiplier(init_db, sample_user, sample_challenge_active):
    """Test challenge URL handling with duck multiplier."""
    from application.routes.challenge_routes import detect_and_handle_challenge_url

    url = 'https://codecombat.com/play/level/dungeons-of-kithgard'
    # sample_challenge is 'medium' (1.0). Multiplier is 3. 10 * 1.0 * 3 = 30.
    result = detect_and_handle_challenge_url(url, sample_user.username, duck_multiplier=3)

    assert result['handled'] is True
    assert result['details']['success'] is True
    assert result['details']['duck_reward'] == 30


def test_detect_and_handle_challenge_url_helper_self(init_db, sample_user, sample_challenge_active):
    """Test that user cannot help themselves."""
    from application.routes.challenge_routes import detect_and_handle_challenge_url

    url = 'https://codecombat.com/play/level/dungeons-of-kithgard'
    result = detect_and_handle_challenge_url(
        url, sample_user.username, duck_multiplier=1, helper=sample_user.username
    )

    # Check that helper was removed/ignored
    log = ChallengeLog.query.filter_by(
        username=sample_user.username,
        challenge_slug='dungeons-of-kithgard'
    ).first()

    if log:
        assert log.helper == '' or log.helper is None


def test_extract_challenge_details_standard_url():
    """Test extracting details from standard challenge URL."""
    from application.routes.challenge_routes import _extract_challenge_details

    message = 'https://codecombat.com/play/level/dungeons-of-kithgard?course=intro-to-python&course-instance=fall2024'
    result = _extract_challenge_details(message)

    assert result is not None
    assert result['domain'] == 'codecombat.com'
    assert result['challenge_slug'] == 'dungeons-of-kithgard'
    assert result['course_id'] == 'intro-to-python'
    assert result['course_instance'] == 'fall2024'


def test_extract_challenge_details_alternative_url():
    """Test extracting details from alternative URL format."""
    from application.routes.challenge_routes import _extract_challenge_details

    message = 'https://codecombat.com/s/python-basics/lessons/1/levels/123'
    result = _extract_challenge_details(message)

    assert result is not None
    assert result['domain'] == 'codecombat.com'


def test_extract_challenge_details_no_match():
    """Test extracting details from invalid URL."""
    from application.routes.challenge_routes import _extract_challenge_details

    message = 'This is not a challenge URL'
    result = _extract_challenge_details(message)

    assert result is None


def test_log_challenge_success(init_db, sample_user):
    """Test successful challenge logging."""
    from application.routes.challenge_routes import _log_challenge

    details = {
        'domain': 'codecombat.com',
        'challenge_slug': 'dungeons-of-kithgard',
        'course_id': 'intro-to-python',
        'course_instance': 'fall2024'
    }

    result = _log_challenge(details, sample_user.username)

    assert result['success'] is True
    assert 'Challenge logged successfully' in result['message']

    # Verify log was created
    log = ChallengeLog.query.filter_by(
        username=sample_user.username,
        challenge_slug='dungeons-of-kithgard'
    ).first()
    assert log is not None


def test_log_challenge_duplicate(init_db, sample_user):
    """Test logging duplicate challenge."""
    from application.routes.challenge_routes import _log_challenge

    details = {
        'domain': 'codecombat.com',
        'challenge_slug': 'test-challenge',
        'course_id': 'test-course',
        'course_instance': None
    }

    # Log first time
    result1 = _log_challenge(details, sample_user.username)
    assert result1['success'] is True

    # Try to log again
    result2 = _log_challenge(details, sample_user.username)
    assert result2['success'] is False
    assert 'already claimed' in result2['message']


def test_log_challenge_with_helper(init_db, sample_user):
    """Test logging challenge with helper."""
    from application.routes.challenge_routes import _log_challenge

    details = {
        'domain': 'codecombat.com',
        'challenge_slug': 'helper-challenge',
        'course_id': 'test-course',
        'course_instance': None
    }

    result = _log_challenge(details, sample_user.username, helper='helper_user')

    assert result['success'] is True

    log = ChallengeLog.query.filter_by(
        username=sample_user.username,
        challenge_slug='helper-challenge'
    ).first()
    assert log.helper == 'helper_user'


def test_update_user_ducks_success(init_db, sample_user, sample_challenge_active):
    """Test updating user ducks after challenge completion."""
    from application.routes.challenge_routes import _update_user_ducks

    initial_ducks = sample_user.duck_balance
    reward = _update_user_ducks(sample_user.username, 'dungeons-of-kithgard', duck_multiplier=1)

    assert reward == 10
    db.session.refresh(sample_user)
    assert sample_user.duck_balance == initial_ducks + 10


def test_update_user_ducks_with_multiplier(init_db, sample_user, sample_challenge_active):
    """Test updating user ducks with multiplier."""
    from application.routes.challenge_routes import _update_user_ducks

    initial_ducks = sample_user.duck_balance
    reward = _update_user_ducks(sample_user.username, 'dungeons-of-kithgard', duck_multiplier=5)

    assert reward == 50
    db.session.refresh(sample_user)
    assert sample_user.duck_balance == initial_ducks + 50


def test_update_user_ducks_user_not_found(init_db):
    """Test updating ducks for non-existent user."""
    from application.routes.challenge_routes import _update_user_ducks

    with pytest.raises(ValueError, match="User with username .* not found"):
        _update_user_ducks('nonexistent_user', 'dungeons-of-kithgard', duck_multiplier=1)


def test_update_user_ducks_challenge_not_found(init_db, sample_user):
    """Test updating ducks for non-existent challenge."""
    from application.routes.challenge_routes import _update_user_ducks

    with pytest.raises(ValueError, match="Challenge .* not found"):
        _update_user_ducks(sample_user.username, 'nonexistent-challenge', duck_multiplier=1)


def test_update_user_ducks_case_insensitive(init_db, sample_user, sample_challenge_active):
    """Test that challenge lookup is case-insensitive."""
    from application.routes.challenge_routes import _update_user_ducks

    # Challenge slug is 'dungeons-of-kithgard', test with different case
    reward = _update_user_ducks(sample_user.username, 'DUNGEONS-OF-KITHGARD', duck_multiplier=1)
    assert reward == 10


def test_challenge_complete_challenge_method(init_db, sample_user, sample_challenge_active):
    """Test Challenge model's complete_challenge method."""
    initial_log_count = ChallengeLog.query.count()

    sample_challenge_active.complete_challenge(sample_user)

    assert ChallengeLog.query.count() == initial_log_count + 1
    log = ChallengeLog.query.filter_by(username=sample_user.username).first()
    assert log.challenge_slug == sample_challenge_active.slug


def test_challenge_scale_value_easy(init_db):
    """Test scaling challenge value for easy difficulty."""
    challenge = Challenge(
        name="Easy Challenge",
        slug="easy-challenge",
        domain="codecombat.com",
        difficulty="easy",
        value=10,
        is_active=True
    )

    scaled_value = challenge.scale_value()
    assert scaled_value == 5  # 10 * 0.5


def test_challenge_scale_value_medium(init_db):
    """Test scaling challenge value for medium difficulty."""
    challenge = Challenge(
        name="Medium Challenge",
        slug="medium-challenge",
        domain="codecombat.com",
        difficulty="medium",
        value=10,
        is_active=True
    )

    scaled_value = challenge.scale_value()
    assert scaled_value == 10  # 10 * 1.0


def test_challenge_scale_value_hard(init_db):
    """Test scaling challenge value for hard difficulty."""
    challenge = Challenge(
        name="Hard Challenge",
        slug="hard-challenge",
        domain="codecombat.com",
        difficulty="hard",
        value=10,
        is_active=True
    )

    scaled_value = challenge.scale_value()
    assert scaled_value == 20  # 10 * 2.0


def test_challenge_scale_value_with_multiplier(init_db):
    """Test scaling challenge value with additional multiplier."""
    challenge = Challenge(
        name="Test Challenge",
        slug="test-challenge",
        domain="codecombat.com",
        difficulty="hard",
        value=10,
        is_active=True
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
        is_active=True
    )
    db.session.add(challenge)
    db.session.commit()

    assert challenge.slug == "Test Challenge Without Slug"


def test_challenge_model_repr(init_db, sample_challenge_active):
    """Test Challenge model string representation."""
    repr_str = repr(sample_challenge_active)
    assert 'Challenge' in repr_str
    assert 'Dungeons of Kithgard' in repr_str
    assert 'codecombat.com' in repr_str


def test_url_pattern_matches_various_formats():
    """Test URL pattern regex matches various URL formats."""
    from application.routes.challenge_routes import URL_PATTERN

    test_urls = [
        'https://codecombat.com/play/level/dungeons-of-kithgard',
        'https://codecombat.com/play/level/dungeons-of-kithgard?course=intro-to-python',
        'https://codecombat.com/play/level/dungeons-of-kithgard?course=intro-to-python&course-instance=fall2024',
        'https://codecombat.com/s/python-basics/lessons/1/levels/123'
    ]

    for url in test_urls:
        match = re.search(URL_PATTERN, url)
        assert match is not None, f"Failed to match URL: {url}"


def test_submit_challenge_no_configuration(client, init_db, sample_user, mock_render_template):
    """Test submitting challenge when configuration is missing."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    # Ensure no configuration exists
    Configuration.query.delete()
    db.session.commit()

    response = client.post('/challenge/submit', data={
        'url': 'https://codecombat.com/play/level/test'
    }, follow_redirects=True)

    assert response.status_code == 200

    with client.session_transaction() as sess:
        flashes = sess.get('_flashes', [])
        messages = [msg for cat, msg in flashes]
        assert any("Configuration missing" in m for m in messages)