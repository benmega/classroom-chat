import pytest

from application import create_app


@pytest.fixture
def test_app():
    app = create_app('testing')  # Pass the correct config if needed
    with app.app_context():
        yield app
