"""
File: conftest.py
Type: py
Summary: Pytest configuration and fixtures (Restored + New Helpers).
"""

import base64
import random
import string
import threading
import uuid
from contextlib import contextmanager
from io import BytesIO
from unittest.mock import patch

import pytest
from application import create_app
from application.config import Config, TestingConfig
from application.extensions import db, limiter, socketio
from application.models.achievements import Achievement, UserAchievement
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.classroom import Classroom
from application.models.configuration import Configuration
from application.models.course import Course
from application.models.course_instance import CourseInstance
from application.models.message import Message
from application.models.note import Note
from application.models.project import Project
from application.models.skill import Skill
from application.models.user import User
from application.services import moderation_service
from flask_login import LoginManager
from PIL import Image
from sqlalchemy import event


@pytest.fixture(scope="session", autouse=True)
def _isolated_upload_folder(tmp_path_factory):
    """Send every upload to a throwaway folder instead of the real userData/.

    Routes read the folder both from the Config class attribute and from
    app.config["UPLOAD_FOLDER"], so the class attribute is patched for the whole
    session and create_app() copies it into the app config.
    """
    folder = tmp_path_factory.mktemp("userData")
    with pytest.MonkeyPatch.context() as patch_config:
        patch_config.setattr(Config, "UPLOAD_FOLDER", str(folder))
        yield folder


@pytest.fixture(scope="session")
def test_app(_isolated_upload_folder):
    app = create_app(TestingConfig)
    app.config.update(
        {
            "TESTING": True,
            "WTF_CSRF_ENABLED": False,
            "UPLOAD_FOLDER": str(_isolated_upload_folder),
            "COGNITO_CLIENT_ID": "test_client_id",
            "COGNITO_USER_POOL_ID": "test_user_pool_id",
        }
    )

    if not hasattr(app, "login_manager"):
        login_manager = LoginManager()
        login_manager.init_app(app)
        app.login_manager = login_manager

        @login_manager.user_loader
        def load_user(user_id):
            return db.session.get(User, int(user_id))

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


# NEW HELPERS & OVERRIDES


@pytest.fixture(scope="session")
def app(test_app):
    return test_app


@pytest.fixture(autouse=True)
def restore_app_config(test_app):
    """test_app lives for the whole session: undo any config change a test makes."""
    saved = dict(test_app.config)
    yield
    for key in set(test_app.config) - set(saved):
        del test_app.config[key]
    test_app.config.update(saved)


@pytest.fixture
def client(test_app):
    return test_app.test_client()


@pytest.fixture
def rate_limited_app():
    """A real app with the global limiter switched on (it is off in TestingConfig)."""

    class RateLimitedTesting(TestingConfig):
        RATELIMIT_ENABLED = True

    was_enabled = limiter.enabled
    try:
        with patch.object(socketio, "init_app"):
            app = create_app(RateLimitedTesting)
        limiter.reset()
        yield app
    finally:
        # The limiter is a module-level singleton shared with every other app
        limiter.enabled = was_enabled
        if limiter._storage is not None:
            limiter.reset()


@pytest.fixture
def count_queries(init_db):
    """Context manager counting the SQL statements sent to the database.

    with count_queries() as statements:
        ...
    len(statements)  # statements the block sent, as text, in order

    Only statements sent from the calling thread count, so a thread left over
    from another test cannot change the figure.
    """

    @contextmanager
    def _count():
        statements = []
        thread_id = threading.get_ident()

        def record(conn, cursor, statement, parameters, context, executemany):
            if threading.get_ident() == thread_id:
                statements.append(statement)

        event.listen(db.engine, "before_cursor_execute", record)
        try:
            yield statements
        finally:
            event.remove(db.engine, "before_cursor_execute", record)

    return _count


@pytest.fixture
def logged_in_client(client, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
        sess["_user_id"] = str(sample_user.id)
    return client


@pytest.fixture(autouse=True)
def reset_moderation_cache():
    """The banned-word patterns are cached per process; start and end each test without them."""
    moderation_service.clear_cache()
    yield
    moderation_service.clear_cache()


@pytest.fixture(autouse=True)
def init_db(test_app):
    with test_app.app_context():
        db.create_all()
        from application import seed_global_data

        seed_global_data()
        yield db
        db.session.rollback()
        db.drop_all()


def generate_random_slug(length=10):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=length))


@pytest.fixture
def add_sample_user(init_db):
    def _add_user(
        username, password, earned_ducks=0, profile_picture="Default_pfp.jpg"
    ):
        from tests.factories import UserFactory
        user = UserFactory(
            username=username,
            earned_ducks=earned_ducks,
            duck_balance=earned_ducks,
            profile_picture=profile_picture,
        )
        user.set_password(password)
        db.session.commit()
        return user

    return _add_user


@pytest.fixture
def sample_user_with_ducks(init_db):
    from tests.factories import UserFactory
    user = UserFactory(
        username="user_with_ducks",
        earned_ducks=50,
        duck_balance=50,
    )
    user.set_password("test_password")
    db.session.commit()
    return user


@pytest.fixture
def sample_challenge(init_db):
    from tests.factories import ChallengeFactory
    slug = f"sample-challenge-{generate_random_slug()}"
    challenge = ChallengeFactory(
        name=f"Sample Challenge-{generate_random_slug()}",
        slug=slug,
        domain="Test Domain",
        difficulty="medium",
        value=10,
        is_active=True,
    )
    return challenge


@pytest.fixture
def sample_user(init_db):
    from tests.factories import UserFactory
    username = f"user_{uuid.uuid4().hex[:8]}"
    user = UserFactory(username=username, is_approved=True)
    user.set_password("hashedpassword")
    db.session.commit()
    return user


@pytest.fixture
def sample_admin(init_db):
    from tests.factories import AdminFactory
    admin_user = AdminFactory(is_approved=True)
    admin_user.set_password("hashedpassword")
    db.session.commit()
    return admin_user


@pytest.fixture
def logged_in_admin(client, sample_admin):
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id
    return client


@pytest.fixture
def sample_challenge_log(init_db):
    from tests.factories import ChallengeLogFactory
    challenge_log = ChallengeLogFactory(
        domain="codecombat.com",
        challenge_slug=f"challenge-slug-{uuid.uuid4()}",
        course_id="12345",
        course_instance="spring2025",
    )
    return challenge_log


@pytest.fixture
def sample_classroom(init_db, sample_user):
    from tests.factories import ClassroomFactory
    classroom = ClassroomFactory(
        name="Test Classroom",
        language="python",
    )
    return classroom


@pytest.fixture
def sample_configuration(init_db):
    from tests.factories import ConfigurationFactory
    config = ConfigurationFactory(
        message_sending_enabled=True,
        duck_multiplier=1.0,
    )
    return config


@pytest.fixture
def sample_users(init_db):
    from tests.factories import UserFactory
    user1 = UserFactory(username=f"user_{uuid.uuid4().hex[:8]}")
    user1.set_password("test")
    user2 = UserFactory(username=f"user_{uuid.uuid4().hex[:8]}")
    user2.set_password("test")
    db.session.commit()
    return [user1, user2]


@pytest.fixture
def sample_course(init_db):
    from tests.factories import CourseFactory
    course = CourseFactory(
        id=f"course_{uuid.uuid4().hex[:8]}",
        name="Intro to Programming",
        domain="codecombat.com",
        description="Learn the basics of programming.",
        is_active=True,
    )
    return course


@pytest.fixture
def sample_message(init_db, sample_user, sample_classroom):
    from tests.factories import MessageFactory
    message = MessageFactory(
        user_id=sample_user.id,
        content="This is a test message.",
        message_type="text",
        target_classrooms=[sample_classroom],
        is_global=False,
        target_live=False,
    )
    return message


@pytest.fixture
def sample_project(init_db, sample_user):
    from tests.factories import ProjectFactory
    project = ProjectFactory(
        name=f"Project_{uuid.uuid4().hex[:8]}",
        description="This is a sample project description.",
        link="http://example.com",
        user_id=sample_user.id,
    )
    return project


@pytest.fixture
def sample_skill(init_db, sample_user):
    from tests.factories import SkillFactory
    skill = SkillFactory(name="Python", user_id=sample_user.id)
    return skill


@pytest.fixture
def sample_image_data():
    image = Image.new("RGB", (100, 100), color=(73, 109, 137))
    img_io = BytesIO()
    image.save(img_io, "PNG")
    img_io.seek(0)
    image_data = base64.b64encode(img_io.read()).decode("utf-8")
    return f"data:image/png;base64,{image_data}"


@pytest.fixture
def sample_duck_trade(init_db, sample_user):
    from tests.factories import DuckTradeLogFactory
    sample_user.duck_balance = 100
    trade = DuckTradeLogFactory(
        user_id=sample_user.id,
        digital_ducks=1,
        bit_ducks=[1, 0, 0, 0, 0, 0, 0],
        byte_ducks=[0, 0, 0, 0, 0, 0, 0],
        status="pending",
    )
    return trade


@pytest.fixture
def sample_course_instance(init_db, sample_classroom, sample_course):
    """Creates a course instance linked to a classroom and a course."""
    instance = CourseInstance(
        id="inst_987654321",
        classroom_id=sample_classroom.id,
        course_id=sample_course.id,
    )
    db.session.add(instance)
    db.session.commit()
    return instance


@pytest.fixture
def sample_note(init_db, sample_user):
    """Creates a sample note entry without actual S3 upload."""
    note = Note(
        user_id=sample_user.id, filename=f"notes/{sample_user.username}/test_image.png"
    )
    db.session.add(note)
    db.session.commit()
    return note
