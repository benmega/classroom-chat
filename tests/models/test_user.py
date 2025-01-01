from sqlalchemy.testing import db


def test_user_creation(test_app, add_sample_user):
    user = add_sample_user('testuser', 'hashed_pwd')
    assert user.username == 'testuser'
    assert user.ducks == 0

def test_user_duck_update(test_app, add_sample_user):
    user = add_sample_user('testuser', 'hashed_pwd')
    user.ducks += 5
    db.session.commit()
    assert user.ducks == 5
