from application.extensions import db, socketio
from application.models.classroom import Classroom
from application.models.configuration import Configuration
from application.models.message import Message
from application.models.user import User


import pytest


@pytest.fixture(autouse=True)
def setup_socketio(app):
    from application import tasks
    tasks.set_app_instance(app)


def test_socket_connect_unauthenticated(app):
    # Reject connection when no user in session
    flask_client = app.test_client()
    with flask_client.session_transaction() as sess:
        sess.clear()
    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    assert not socket_client.is_connected()


def test_socket_connect_user_not_found(app):
    flask_client = app.test_client()
    with flask_client.session_transaction() as sess:
        sess["user"] = 99999  # Non-existent user id
    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    assert not socket_client.is_connected()


def test_socket_connect_disconnect_student(app, sample_user, init_db):
    flask_client = app.test_client()
    with flask_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    classroom = db.session.get(Classroom, "cs_101")
    if not classroom:
        classroom = Classroom(id="cs_101", name="CS 101", language="Python")
        db.session.add(classroom)
    if sample_user not in classroom.users:
        classroom.users.append(sample_user)
    db.session.commit()

    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    assert socket_client.is_connected()

    received = socket_client.get_received()
    status_change_events = [e for e in received if e["name"] == "user_status_change"]
    assert len(status_change_events) == 1
    assert status_change_events[0]["args"][0] == {
        "user_id": sample_user.id,
        "is_online": True,
    }

    # Clean up/Disconnect
    socket_client.disconnect()

    with app.app_context():
        u = db.session.get(User, sample_user.id)
        assert u.is_online is False


def test_socket_connect_admin(app, sample_admin, init_db):
    flask_client = app.test_client()
    with flask_client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    assert socket_client.is_connected()
    socket_client.disconnect()


def test_socket_send_message_student_success(app, sample_user, init_db):
    flask_client = app.test_client()
    with flask_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    classroom = db.session.get(Classroom, "cs_101")
    if not classroom:
        classroom = Classroom(id="cs_101", name="CS 101", language="Python")
        db.session.add(classroom)
    if sample_user not in classroom.users:
        classroom.users.append(sample_user)
    db.session.commit()

    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    assert socket_client.is_connected()

    # Enable message sending
    config = Configuration.query.first()
    if not config:
        config = Configuration(message_sending_enabled=True)
        db.session.add(config)
    else:
        config.message_sending_enabled = True
    db.session.commit()

    # Emit message
    socket_client.emit(
        "send_message",
        {
            "content": "Hello class!",
            "is_global": True,  # Students should have this forced to False
            "target_classrooms": [classroom.id],
        },
    )

    # Assert message received by client
    received = socket_client.get_received()
    msg_received = [e for e in received if e["name"] == "message_received"]
    assert len(msg_received) >= 1
    args = msg_received[0]["args"][0]
    assert args["content"] == "Hello class!"
    assert args["is_global"] is False  # Forced to False for students

    with app.app_context():
        msg = Message.query.filter_by(content="Hello class!").first()
        assert msg is not None
        assert msg.user_id == sample_user.id

    socket_client.disconnect()


def test_socket_send_message_disabled_or_muted(app, sample_user, init_db):
    flask_client = app.test_client()
    with flask_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    config = Configuration.query.first()
    if not config:
        config = Configuration(message_sending_enabled=False)
        db.session.add(config)
    else:
        config.message_sending_enabled = False
    db.session.commit()

    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    socket_client.emit("send_message", {"content": "Disabled message"})
    received = socket_client.get_received()
    assert not any(e["name"] == "message_received" for e in received)
    socket_client.disconnect()

    config.message_sending_enabled = True
    sample_user.can_chat = False
    db.session.commit()

    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    socket_client.emit("send_message", {"content": "Muted message"})
    received = socket_client.get_received()
    assert not any(e["name"] == "message_received" for e in received)
    socket_client.disconnect()


def test_socket_send_message_admin_global(app, sample_admin, init_db):
    flask_client = app.test_client()
    with flask_client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    config = Configuration.query.first()
    if not config:
        config = Configuration(message_sending_enabled=True)
        db.session.add(config)
    else:
        config.message_sending_enabled = True
    db.session.commit()

    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    socket_client.emit(
        "send_message", {"content": "Admin global message", "is_global": True}
    )

    received = socket_client.get_received()
    msg_received = [e for e in received if e["name"] == "message_received"]
    assert len(msg_received) == 1
    assert msg_received[0]["args"][0]["is_global"] is True

    socket_client.disconnect()


def test_socket_send_message_rate_limit(app, sample_user, init_db):
    flask_client = app.test_client()
    with flask_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    classroom = db.session.get(Classroom, "cs_101")
    if not classroom:
        classroom = Classroom(id="cs_101", name="CS 101", language="Python")
        db.session.add(classroom)
    if sample_user not in classroom.users:
        classroom.users.append(sample_user)

    config = Configuration.query.first()
    if not config:
        config = Configuration(message_sending_enabled=True)
        db.session.add(config)
    else:
        config.message_sending_enabled = True
    db.session.commit()

    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    assert socket_client.is_connected()

    # Emit first message - should succeed
    socket_client.emit(
        "send_message",
        {"content": "First message", "target_classrooms": [classroom.id]},
    )
    received = socket_client.get_received()
    assert any(e["name"] == "message_received" for e in received)

    # Emit second message immediately - should fail due to rate limit
    socket_client.emit(
        "send_message",
        {"content": "Second message", "target_classrooms": [classroom.id]},
    )
    received2 = socket_client.get_received()
    assert not any(e["name"] == "message_received" for e in received2)

    with app.app_context():
        msg2 = Message.query.filter_by(content="Second message").first()
        assert msg2 is None

    socket_client.disconnect()
