"""
File: test_general_routes.py
Type: py
Summary: Unit tests for general routes Flask routes.
"""


from flask import url_for


# Test the index route for logged-in users
def test_index_logged_in(client, sample_user):
    # Simulate login by setting the session manually
    with client.session_transaction() as sess:
        sess['user'] = sample_user.username

    response = client.get(url_for('general.index'))

    assert response.status_code == 200
    assert b"Classroom Chat" in response.data  # Check for the page title


# Test the index route for not logged-in users
def test_index_not_logged_in(client):
    with client.application.app_context():
        response = client.get(url_for('general.index'))

        assert response.status_code == 302  # Should redirect to login
        assert response.location == url_for('user.login', _external=False)

