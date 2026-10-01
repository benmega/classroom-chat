"""
File: test_query_counts.py
Summary: Query-count guards for the paths that used to load whole message and
         classroom graphs. Each test measures the statements a path sends with a
         small message history and again after thousands more messages were
         added: the count must be a small constant that does not move.
"""

import threading
from contextlib import contextmanager
from datetime import datetime, timedelta

import pytest
import sqlalchemy as sa
from application.extensions import db, socketio
from application.models.classroom import Classroom, user_classrooms
from application.models.message import Message, message_classrooms, message_users
from application.models.project import Project
from application.models.user import User
from application.models.user_certificate import UserCertificate
from application.services import moderation_service
from flask import g, session
from sqlalchemy import event
from tests.factories import (
    AchievementFactory,
    AdminFactory,
    ClassroomFactory,
    ParentFactory,
    UserFactory,
)

SMALL_HISTORY = 50
LARGE_HISTORY = 3000


@pytest.fixture(autouse=True)
def setup_socketio(app):
    from application import tasks

    tasks.set_app_instance(app)


@pytest.fixture(autouse=True)
def clean_socket_registry():
    """Start every test with no socket open, as a fresh process would.

    The registry of open sockets decides whether a connect starts a session log, and so
    whether a send then updates one: a socket another test left behind would change the
    statements counted here.
    """
    from application import socket_events

    socket_events._active_sessions.clear()
    socket_events._sid_users.clear()
    yield
    socket_events._active_sessions.clear()
    socket_events._sid_users.clear()


class World:
    """Ids of a small school: four classrooms, six enrolled students, an admin and a parent."""

    def __init__(self):
        self.classroom_ids = [ClassroomFactory().id for _ in range(4)]
        self.student_ids = []
        for i in range(6):
            student = UserFactory()
            db.session.execute(
                sa.insert(user_classrooms).values(
                    user_id=student.id, classroom_id=self.classroom_ids[i % 4]
                )
            )
            self.student_ids.append(student.id)
        db.session.commit()
        self.admin_id = AdminFactory(is_approved=True).id
        self.parent_id = ParentFactory().id


@pytest.fixture
def world(init_db):
    return World()


def seed_messages(world, count):
    """Insert `count` old messages in bulk: global, classroom-targeted and direct ones."""
    first_id = (db.session.scalar(sa.select(sa.func.max(Message.id))) or 0) + 1
    long_ago = datetime.utcnow() - timedelta(days=2)
    authors = [*world.student_ids, world.admin_id]
    messages, in_classrooms, to_users = [], [], []
    for i in range(count):
        message_id = first_id + i
        messages.append(
            {
                "id": message_id,
                "user_id": authors[i % len(authors)],
                "content": f"seeded message {message_id}",
                "message_type": "text",
                "is_struck": False,
                "created_at": long_ago + timedelta(seconds=i),
                "is_global": i % 3 == 0,
                "target_live": False,
                "has_animated_border": False,
                "animated_border_speed": "normal",
            }
        )
        if i % 3 == 1:
            in_classrooms.append(
                {
                    "message_id": message_id,
                    "classroom_id": world.classroom_ids[i % len(world.classroom_ids)],
                }
            )
        if i % 7 == 0:
            to_users.append(
                {
                    "message_id": message_id,
                    "user_id": world.student_ids[i % len(world.student_ids)],
                }
            )
    db.session.execute(sa.insert(Message), messages)
    if in_classrooms:
        db.session.execute(sa.insert(message_classrooms), in_classrooms)
    if to_users:
        db.session.execute(sa.insert(message_users), to_users)
    db.session.commit()


def log_in(client, user_id):
    with client.session_transaction() as sess:
        sess["user"] = user_id


def cold_session():
    """Forget every loaded row, as at the start of a real request."""
    db.session.remove()


@contextmanager
def loaded_rows(*models):
    """Collect the instances of `models` the ORM loads inside the block, per model."""
    seen = {model: [] for model in models}
    thread_id = threading.get_ident()

    def on_load(target, context, model):
        if threading.get_ident() == thread_id:
            seen[model].append(target)

    listeners = [
        (model, lambda target, context, m=model: on_load(target, context, m))
        for model in models
    ]
    for model, listener in listeners:
        event.listen(model, "load", listener)
    try:
        yield seen
    finally:
        for model, listener in listeners:
            event.remove(model, "load", listener)


def statements_of(count_queries, action):
    cold_session()
    with count_queries() as statements:
        result = action()
    return statements, result


def measure(count_queries, action, *models):
    """Like statements_of, plus the instances of `models` that were loaded."""
    cold_session()
    with count_queries() as statements, loaded_rows(*models) as loaded:
        result = action()
    return statements, loaded, result


# --------------------------------------------------------------------------- #
# load_user
# --------------------------------------------------------------------------- #


def test_load_user_is_one_query_that_leaves_every_collection_unloaded(
    test_app, world, count_queries
):
    seed_messages(world, LARGE_HISTORY)
    student_id = world.student_ids[0]

    def load():
        with test_app.test_request_context("/"):
            session["user"] = student_id
            test_app.preprocess_request()
            return sa.inspect(g.user).unloaded

    statements, unloaded = statements_of(count_queries, load)

    assert len(statements) == 1
    assert {
        "messages",
        "targeted_messages",
        "classrooms",
        "children",
        "parents",
    } <= unloaded


# --------------------------------------------------------------------------- #
# GET /message/api/feed and /message/api/unread-count
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize("who", ["student", "admin"])
def test_feed_statements_do_not_grow_with_the_message_history(
    client, world, count_queries, who
):
    user_id = world.student_ids[0] if who == "student" else world.admin_id
    log_in(client, user_id)

    def fetch():
        return client.get("/message/api/feed?limit=50")

    seed_messages(world, SMALL_HISTORY)
    small, small_response = statements_of(count_queries, fetch)
    seed_messages(world, LARGE_HISTORY)
    large, loaded, large_response = measure(count_queries, fetch, Message)

    assert small_response.status_code == large_response.status_code == 200
    assert len(large_response.json["messages"]) == 50
    assert len(small) == len(large)
    assert len(large) <= 8
    # Only the page is loaded, never the history behind it
    assert len(loaded[Message]) == 50


@pytest.mark.parametrize(
    "limit, expected", [(1000000, 100), (100, 100), (0, 1), (-5, 1), (7, 7)]
)
def test_feed_limit_is_clamped(client, world, limit, expected):
    seed_messages(world, 300)
    log_in(client, world.admin_id)

    response = client.get(f"/message/api/feed?limit={limit}")

    assert response.status_code == 200
    assert len(response.json["messages"]) == expected


def test_feed_limit_that_is_not_a_number_falls_back_to_the_default(client, world):
    seed_messages(world, 300)
    log_in(client, world.admin_id)

    response = client.get("/message/api/feed?limit=lots")

    assert len(response.json["messages"]) == 50


@pytest.mark.parametrize("who", ["student", "admin"])
def test_unread_count_statements_do_not_grow_with_the_message_history(
    client, world, count_queries, who
):
    user_id = world.student_ids[0] if who == "student" else world.admin_id
    log_in(client, user_id)

    def fetch():
        return client.get("/message/api/unread-count?last_read_id=1")

    seed_messages(world, SMALL_HISTORY)
    small, small_response = statements_of(count_queries, fetch)
    seed_messages(world, LARGE_HISTORY)
    large, large_response = statements_of(count_queries, fetch)

    assert small_response.status_code == large_response.status_code == 200
    assert len(small) == len(large)
    assert len(large) <= 4


# --------------------------------------------------------------------------- #
# Sending a message over the socket
# --------------------------------------------------------------------------- #


@pytest.fixture
def connect(app):
    clients = []

    def _connect(user_id):
        flask_client = app.test_client()
        with flask_client.session_transaction() as sess:
            sess["user"] = user_id
        socket_client = socketio.test_client(app, flask_test_client=flask_client)
        assert socket_client.is_connected()
        clients.append(socket_client)
        socket_client.get_received()
        return socket_client

    yield _connect

    for socket_client in clients:
        if socket_client.is_connected():
            socket_client.disconnect()


def send_and_count(count_queries, socket_client, payload, *models):
    statements, loaded, ack = measure(
        count_queries,
        lambda: socket_client.emit("send_message", payload, callback=True),
        *models,
    )
    return (statements, ack, loaded) if models else (statements, ack)


def test_send_message_statements_do_not_grow_with_the_message_history(
    world, connect, count_queries
):
    first, second = world.student_ids[0], world.student_ids[4]
    # Same shape for both senders: one classroom of their own, no message sent yet today
    first_room = world.classroom_ids[0]
    second_room = world.classroom_ids[0]

    seed_messages(world, SMALL_HISTORY)
    small, small_ack = send_and_count(
        count_queries,
        connect(first),
        {"content": "hello", "target_classrooms": [first_room]},
    )
    seed_messages(world, LARGE_HISTORY)
    # The banned-word list is cached between sends; drop it so both sends load it once
    moderation_service.clear_cache()
    large, large_ack, loaded = send_and_count(
        count_queries,
        connect(second),
        {"content": "hello again", "target_classrooms": [second_room]},
        Message,
        User,
        Classroom,
    )

    assert small_ack["success"] is True
    assert large_ack["success"] is True
    assert len(small) == len(large)
    assert len(large) <= 30
    # No message is loaded at all, and only the sender and the target classroom are
    assert loaded[Message] == []
    assert len(loaded[User]) <= 2
    assert len(loaded[Classroom]) == 1
    # The message is built from what was just saved, not loaded back with its relationships
    assert not any(
        s.lstrip().startswith("SELECT") and "message_users" in s for s in large
    )
    assert not any(
        s.lstrip().startswith("SELECT") and "message_classrooms" in s for s in large
    )


def test_send_message_to_live_users_does_not_cost_a_query_per_online_user(
    world, connect, count_queries
):
    online = [UserFactory(is_online=True).id for _ in range(3)]
    seed_messages(world, SMALL_HISTORY)
    admin = connect(world.admin_id)
    # The first send also runs the once-in-five-minutes achievement evaluation
    assert admin.emit("send_message", {"content": "warm up"}, callback=True)["success"]
    few, ack = send_and_count(
        count_queries, admin, {"content": "to the live ones", "target_live": True}
    )
    assert ack["success"] is True

    online += [UserFactory(is_online=True).id for _ in range(40)]
    many, ack = send_and_count(
        count_queries, admin, {"content": "to all the live ones", "target_live": True}
    )
    assert ack["success"] is True

    assert len(few) == len(many), (few, many)
    stored = db.session.scalars(
        sa.select(message_users.c.user_id)
        .join(Message, Message.id == message_users.c.message_id)
        .where(Message.content == "to all the live ones")
    ).all()
    assert set(online) <= set(stored)


# --------------------------------------------------------------------------- #
# GET /message/api/me/context
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize("who", ["student", "admin"])
def test_context_statements_do_not_grow_with_classrooms_users_or_messages(
    client, world, count_queries, who
):
    user_id = world.student_ids[0] if who == "student" else world.admin_id
    log_in(client, user_id)

    def fetch():
        return client.get("/message/api/me/context")

    seed_messages(world, SMALL_HISTORY)
    small, small_response = statements_of(count_queries, fetch)
    seed_messages(world, LARGE_HISTORY)
    for _ in range(10):
        ClassroomFactory()
        UserFactory()
    large, loaded, large_response = measure(count_queries, fetch, Message)

    assert small_response.status_code == large_response.status_code == 200
    assert len(small) == len(large)
    assert len(large) <= 5
    assert loaded[Message] == []


# --------------------------------------------------------------------------- #
# Admin pages
# --------------------------------------------------------------------------- #


def test_dashboard_is_a_handful_of_statements_whatever_the_data(
    client, world, count_queries
):
    from application.models.duck_transaction import DuckTransaction

    log_in(client, world.admin_id)
    db.session.add_all(
        DuckTransaction(user_id=world.student_ids[0], amount=2.5, reason="seed")
        for _ in range(5)
    )
    db.session.commit()

    def fetch():
        return client.get("/api/admin/dashboard?days=30")

    seed_messages(world, SMALL_HISTORY)
    small, small_response = statements_of(count_queries, fetch)
    seed_messages(world, LARGE_HISTORY)
    for _ in range(25):
        UserFactory()
    for _ in range(40):
        ClassroomFactory()
    db.session.add_all(
        DuckTransaction(user_id=world.student_ids[1], amount=1, reason="more")
        for _ in range(100)
    )
    db.session.commit()
    large, loaded, large_response = measure(count_queries, fetch, Message, User)

    assert small_response.status_code == large_response.status_code == 200
    assert len(small) == len(large)
    # the session user's own lookup plus the dashboard's six
    assert len(large) <= 7
    # Nothing is loaded as an object but the admin who is looking
    assert loaded[Message] == []
    assert len(loaded[User]) == 1


def test_certificate_list_does_not_cost_a_query_per_certificate(
    client, world, count_queries
):
    log_in(client, world.admin_id)

    def add_certificates(count):
        for _ in range(count):
            achievement = AchievementFactory(type="certificate")
            student = UserFactory()
            db.session.add(
                UserCertificate(
                    user_id=student.id,
                    achievement_id=achievement.id,
                    url=f"https://example.com/{achievement.id}",
                    status="pending",
                )
            )
        db.session.commit()

    def fetch():
        return client.get("/api/achievements/admin/certificates")

    add_certificates(3)
    small, small_response = statements_of(count_queries, fetch)
    add_certificates(30)
    large, large_response = statements_of(count_queries, fetch)

    certificates = large_response.json["data"]["certificates"]
    assert len(small_response.json["data"]["certificates"]) == 3
    assert len(certificates) == 33
    assert all(c["user"] and c["achievement"] for c in certificates)
    assert len(small) == len(large)
    assert len(large) <= 3


def test_project_review_list_does_not_cost_a_query_per_project(
    client, world, count_queries
):
    log_in(client, world.admin_id)

    def add_projects(count):
        for i in range(count):
            student = UserFactory()
            db.session.add(Project(name=f"project {i}", user_id=student.id))
        db.session.commit()

    def fetch():
        return client.get("/api/admin/manage-projects?filter=pending")

    add_projects(3)
    small, small_response = statements_of(count_queries, fetch)
    add_projects(30)
    large, large_response = statements_of(count_queries, fetch)

    projects = large_response.json["data"]["projects"]
    assert len(small_response.json["data"]["projects"]) == 3
    assert len(projects) == 33
    assert all(p["user_username"] for p in projects)
    assert len(small) == len(large)
    assert len(large) <= 4


def test_classroom_list_does_not_cost_a_query_per_classroom(
    client, world, count_queries
):
    log_in(client, world.admin_id)

    def fetch():
        return client.get("/api/admin/classrooms")

    small, small_response = statements_of(count_queries, fetch)
    for _ in range(25):
        classroom = ClassroomFactory()
        student = UserFactory()
        db.session.execute(
            sa.insert(user_classrooms).values(
                user_id=student.id, classroom_id=classroom.id
            )
        )
    db.session.commit()
    large, large_response = statements_of(count_queries, fetch)

    classrooms = large_response.json["data"]["classrooms"]
    assert len(classrooms) == len(small_response.json["data"]["classrooms"]) + 25
    assert len(small) == len(large)
    assert len(large) <= 4
    # the counts are real: six students over four classrooms, then one each
    assert sorted(c["student_count"] for c in classrooms)[-2:] == [2, 2]
    assert sum(c["student_count"] for c in classrooms) == 6 + 25


def test_user_row_does_not_load_the_message_history(world):
    """A User or Classroom loads as one row: its message backrefs stay unloaded."""
    seed_messages(world, SMALL_HISTORY)
    cold_session()

    user = db.session.get(User, world.student_ids[0])
    classroom = db.session.get(Classroom, world.classroom_ids[0])

    assert {"messages", "targeted_messages", "classrooms"} <= sa.inspect(user).unloaded
    assert {"targeted_messages", "users"} <= sa.inspect(classroom).unloaded
    assert user.messages  # still there on demand
