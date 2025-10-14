import json
import os
import uuid
from io import BytesIO
from unittest.mock import patch, MagicMock

import pytest

from application import db
from application.models.achievements import Achievement, UserAchievement
from application.models.user_certificate import UserCertificate




def test_achievements_page(client, init_db, sample_user, sample_achievement):
    """Test retrieving achievements page."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    response = client.get('/achievements/')
    assert response.status_code == 200
    assert b'Python Master' in response.data


def test_achievements_page_with_user_achievements(client, init_db, sample_user, sample_achievement,
                                                  sample_user_achievement):
    """Test achievements page showing user's completed achievements."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    response = client.get('/achievements/')
    assert response.status_code == 200
    assert b'Python Master' in response.data


def test_achievements_page_no_user(client, init_db):
    """Test achievements page without logged in user."""
    response = client.get('/achievements/')
    assert response.status_code == 404
    data = json.loads(response.data)
    assert data['success'] is False
    assert 'User not found' in data['error']


def test_achievements_page_multiple_types(client, init_db, sample_user):
    """Test achievements page with multiple achievement types."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    # Create achievements of different types
    achievements = [
        Achievement(name="Duck Master", slug="duck-100", type="ducks", reward=50,
                    description="Collect 100 ducks", requirement_value="100"),
        Achievement(name="Project Pro", slug="project-5", type="project", reward=25,
                    description="Complete 5 projects", requirement_value="5"),
        Achievement(name="Chat Champion", slug="chat-50", type="chat", reward=15,
                    description="Send 50 messages", requirement_value="50"),
        Achievement(name="Course Complete", slug="course-complete", type="certificate", reward=100,
                    description="Complete a course", source="CodeCombat")
    ]
    db.session.add_all(achievements)
    db.session.commit()

    response = client.get('/achievements/')
    assert response.status_code == 200
    assert b'Duck Master' in response.data
    assert b'Project Pro' in response.data
    assert b'Chat Champion' in response.data
    assert b'Course Complete' in response.data


def test_add_achievement_get(client, init_db, sample_admin):
    """Test GET request to add achievement page."""
    with client.session_transaction() as sess:
        sess['user'] = sample_admin.username

    with patch('application.routes.achievement_routes.local_only', lambda f: f):
        response = client.get('/achievements/add')
        assert response.status_code == 200
        assert b'add_achievement' in response.data or response.status_code == 200


def test_add_achievement_post(client, init_db, sample_admin):
    """Test POST request to create a new achievement."""
    with client.session_transaction() as sess:
        sess['user'] = sample_admin.username

    with patch('application.routes.achievement_routes.local_only', lambda f: f):
        response = client.post('/achievements/add', data={
            'name': 'JavaScript Expert',
            'slug': 'javascript-advanced',
            'description': 'Complete advanced JavaScript course',
            'requirement_value': '150',
            'type': 'certificate',
            'reward': '10'
        }, follow_redirects=True)

        assert response.status_code == 200

        # Verify achievement was created
        achievement = Achievement.query.filter_by(slug='javascript-advanced').first()
        assert achievement is not None
        assert achievement.name == 'JavaScript Expert'


def test_add_achievement_no_requirement(client, init_db, sample_admin):
    """Test creating achievement without requirement value."""
    with client.session_transaction() as sess:
        sess['user'] = sample_admin.username

    with patch('application.routes.achievement_routes.local_only', lambda f: f):
        response = client.post('/achievements/add', data={
            'name': 'Quick Starter',
            'slug': 'quick-start',
            'description': 'Complete the tutorial',
            'requirement_value': '',
            'type': 'progress',
            'reward': '5'
        }, follow_redirects=True)

        assert response.status_code == 200

        achievement = Achievement.query.filter_by(slug='quick-start').first()
        assert achievement is not None


def test_add_achievement_no_user(client, init_db):
    """Test adding achievement without logged in user."""
    with patch('application.routes.achievement_routes.local_only', lambda f: f):
        response = client.post('/achievements/add', data={
            'name': 'Test Achievement',
            'slug': 'test-ach',
            'description': 'Test description',
            'requirement_value': '50',
            'type': 'ducks',
            'reward': '5'
        })

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False


def test_submit_certificate_get(client, init_db, sample_user):
    """Test GET request to submit certificate page."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    response = client.get('/achievements/submit_certificate')
    assert response.status_code == 200

from flask import template_rendered
from contextlib import contextmanager

@contextmanager
def captured_templates(app):
    recorded = []

    def record(sender, template, context, **extra):
        recorded.append((template, context))

    template_rendered.connect(record, app)
    try:
        yield recorded
    finally:
        template_rendered.disconnect(record, app)


def test_submit_certificate_valid(client, init_db, sample_user, sample_achievement, test_app):
    """Test submitting a valid certificate and check message context."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    pdf_data = b'%PDF-1.4 mock pdf content'
    pdf_file = (BytesIO(pdf_data), f'{sample_user.username}_certificate.pdf')

    valid_url = f'https://codecombat.com/certificates/abc123?course={sample_achievement.slug}'

    with captured_templates(test_app) as templates:
        response = client.post(
            '/achievements/submit_certificate',
            data={'certificate_url': valid_url, 'certificate_file': pdf_file},
            content_type='multipart/form-data'
        )

    assert response.status_code == 200

    # Grab the template context
    assert templates, "No template was rendered"
    _, context = templates[0]

    assert context['success'] is True
    assert context['message'] == "Certificate submitted successfully."

    # Verify certificate in DB
    cert = UserCertificate.query.filter_by(
        user_id=sample_user.id,
        achievement_id=sample_achievement.id
    ).first()

    assert cert is not None
    assert cert.url == valid_url
    assert cert.file_path.endswith(f"{sample_user.username}_{sample_achievement.slug}.pdf")



def test_submit_certificate_invalid_url(client, init_db, sample_user):
    """Test submitting certificate with invalid URL."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    pdf_data = b'%PDF-1.4 mock pdf content'
    pdf_file = (BytesIO(pdf_data), 'certificate.pdf')

    response = client.post('/achievements/submit_certificate', data={
        'certificate_url': 'https://invalid-url.com',
        'certificate_file': pdf_file
    }, content_type='multipart/form-data')

    assert response.status_code == 200
    assert b'Invalid certificate URL' in response.data


def test_submit_certificate_no_matching_achievement(client, init_db, sample_user):
    """Test submitting certificate for non-existent achievement."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    pdf_data = b'%PDF-1.4 mock pdf content'
    pdf_file = (BytesIO(pdf_data), 'certificate.pdf')

    response = client.post('/achievements/submit_certificate', data={
        'certificate_url': 'https://codecombat.com/certificates/abc123?course=nonexistent-course',
        'certificate_file': pdf_file
    }, content_type='multipart/form-data')

    assert response.status_code == 200
    assert b'No matching achievement found' in response.data


def test_submit_certificate_no_file(client, init_db, sample_user, sample_achievement):
    """Test submitting certificate without file."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    response = client.post('/achievements/submit_certificate', data={
        'certificate_url': f'https://codecombat.com/certificates/abc123?course={sample_achievement.slug}'
    }, content_type='multipart/form-data')

    assert response.status_code == 200


def test_submit_certificate_invalid_file_type(client, init_db, sample_user, sample_achievement):
    """Test submitting certificate with invalid file type."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    txt_data = b'This is a text file'
    txt_file = (BytesIO(txt_data), 'certificate.txt')

    response = client.post('/achievements/submit_certificate', data={
        'certificate_url': f'https://codecombat.com/certificates/abc123?course={sample_achievement.slug}',
        'certificate_file': txt_file
    }, content_type='multipart/form-data')

    assert response.status_code == 200
    assert b'Invalid file type' in response.data


def test_submit_certificate_update_existing(client, init_db, sample_user, sample_achievement):
    """Test updating an existing certificate submission."""
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    # Create initial certificate
    initial_cert = UserCertificate(
        user_id=sample_user.id,
        achievement_id=sample_achievement.id,
        url='https://codecombat.com/certificates/old123?course=python-basics',
        file_path='old_path.pdf'
    )
    db.session.add(initial_cert)
    db.session.commit()

    # Submit new certificate
    pdf_data = b'%PDF-1.4 new mock pdf content'
    pdf_file = (BytesIO(pdf_data), 'new_certificate.pdf')

    response = client.post('/achievements/submit_certificate', data={
        'certificate_url': f'https://codecombat.com/certificates/new456?course={sample_achievement.slug}',
        'certificate_file': pdf_file
    }, content_type='multipart/form-data')

    assert response.status_code == 200
    assert b'Certificate submitted successfully' in response.data

    # Verify certificate was updated
    cert = UserCertificate.query.filter_by(
        user_id=sample_user.id,
        achievement_id=sample_achievement.id
    ).first()
    assert cert.url == f'https://codecombat.com/certificates/new456?course={sample_achievement.slug}'


def test_submit_certificate_no_user(client, init_db):
    """Test submitting certificate without logged in user."""
    response = client.post('/achievements/submit_certificate', data={
        'certificate_url': 'https://codecombat.com/certificates/abc123?course=test',
        'certificate_file': (BytesIO(b'test'), 'test.pdf')
    }, content_type='multipart/form-data')

    assert response.status_code == 404
    data = json.loads(response.data)
    assert data['success'] is False
    assert 'User not found' in data['error']


def test_user_achievement_uniqueness(init_db, sample_user, sample_achievement):
    """Test that the same achievement cannot be earned twice by a user."""
    # Create first user achievement
    ua1 = UserAchievement(
        user_id=sample_user.id,
        achievement_id=sample_achievement.id
    )
    db.session.add(ua1)
    db.session.commit()

    # Try to create duplicate
    ua2 = UserAchievement(
        user_id=sample_user.id,
        achievement_id=sample_achievement.id
    )
    db.session.add(ua2)

    with pytest.raises(Exception):  # Should raise IntegrityError due to unique constraint
        db.session.commit()

    db.session.rollback()


def test_achievement_types(init_db):
    """Test creating achievements with different types."""
    achievement_types = [
        ("ducks", "Duck Collector", "Collect ducks", "50"),
        ("project", "Project Master", "Complete projects", "3"),
        ("progress", "Progressor", "Make progress", "75"),
        ("chat", "Chatterbox", "Send messages", "100"),
        ("consistency", "Consistent", "Daily login streak", "7"),
        ("community", "Community Helper", "Help others", "10"),
        ("session", "Session Pro", "Complete sessions", "5"),
        ("trade", "Trader", "Complete trades", "3"),
        ("certificate", "Certified", "Earn certificate", None)
    ]

    for ach_type, name, desc, req_val in achievement_types:
        achievement = Achievement(
            name=name,
            slug=f"{ach_type}-test",
            type=ach_type,
            reward=10,
            description=desc,
            requirement_value=req_val
        )
        db.session.add(achievement)

    db.session.commit()

    # Verify all were created
    for ach_type, _, _, _ in achievement_types:
        ach = Achievement.query.filter_by(type=ach_type).first()
        assert ach is not None
        assert ach.type == ach_type


def test_achievement_reward_values(init_db):
    """Test achievements with different reward values."""
    achievements = [
        Achievement(name="Small", slug="small-1", type="ducks", reward=1, description="Small reward"),
        Achievement(name="Medium", slug="medium-50", type="ducks", reward=50, description="Medium reward"),
        Achievement(name="Large", slug="large-100", type="ducks", reward=100, description="Large reward"),
        Achievement(name="Huge", slug="huge-500", type="ducks", reward=500, description="Huge reward")
    ]

    db.session.add_all(achievements)
    db.session.commit()

    small = Achievement.query.filter_by(slug="small-1").first()
    assert small.reward == 1

    huge = Achievement.query.filter_by(slug="huge-500").first()
    assert huge.reward == 500


def test_user_achievement_earned_at_timestamp(init_db, sample_user, sample_achievement):
    """Test that earned_at timestamp is set when achievement is earned."""
    from datetime import datetime

    before_time = datetime.utcnow()

    user_achievement = UserAchievement(
        user_id=sample_user.id,
        achievement_id=sample_achievement.id
    )
    db.session.add(user_achievement)
    db.session.commit()

    after_time = datetime.utcnow()

    assert user_achievement.earned_at is not None
    assert before_time <= user_achievement.earned_at <= after_time