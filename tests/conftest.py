
import pytest
from application import create_app, db
from application.models.user import User

@pytest.fixture(scope='session')
def test_app():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:'})
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture(scope='function')
def test_client(test_app):
    return test_app.test_client()

@pytest.fixture(scope='function')
def add_sample_user():
    def _add_user(username, password, ducks=0):
        user = User(username=username, password_hash=password, ducks=ducks)
        db.session.add(user)
        db.session.commit()
        return user
    return _add_user
