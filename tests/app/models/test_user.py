"""
File: test_user.py
Type: py
Summary: Unit tests for user model.
"""

from sqlalchemy.testing import db


def test_user_creation(add_sample_user):
    user = add_sample_user('testuser', 'hashed_pwd')
    assert user.username == 'testuser'
    assert user.duck_balance == 0

def test_user_duck_update(add_sample_user):
    user = add_sample_user('testuser', 'hashed_pwd')
    user.add_ducks(5)
    # Access the correct `db` instance from your app
    from application import db
    db.session.commit()
    assert user.duck_balance == 5

def test_user_creation(add_sample_user, init_db):
    user = add_sample_user('testuser', 'hashed_pwd')
    assert user.username == 'testuser'
    assert user.duck_balance == 0

def test_user_query(add_sample_user, init_db):
    user = add_sample_user('testuser', 'hashed_pwd')
    from application.models.user import User
    from application import db
    queried_user = db.session.query(User).filter_by(username='testuser').first()
    assert queried_user is not None
    assert queried_user.username == 'testuser'
