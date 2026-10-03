"""
File: test_message_sending.py
Summary: Tests for the message-sending rules enforced by the Socket.IO
         'send_message' handler (the single send path). Rejections are
         reported to the sender through the handler's acknowledgement.
"""

import pytest
from application.extensions import db, socketio
from application.models.banned_words import BannedWords
from application.models.classroom import Classroom
from application.models.configuration import Configuration
from application.models.message import Message
from application.services import moderation_service


@pytest.fixture(autouse=True)
def setup_socketio(app):
    from application import tasks
    tasks.set_app_instance(app)


@pytest.fixture
def connect(app):
    """Return a factory that opens a socket for a user; sockets are closed on teardown."""
    clients = []

    def _connect(user):
        flask_client = app.test_client()
        with flask_client.session_transaction() as sess:
            sess["user"] = user.id
        socket_client = socketio.test_client(app, flask_test_client=flask_client)
        assert socket_client.is_connected()
        clients.append(socket_client)
        socket_client.get_received()  # drop connect-time events
        return socket_client

    yield _connect

    for socket_client in clients:
        if socket_client.is_connected():
            socket_client.disconnect()


def _set_sending(enabled):
    config = Configuration.query.first()
    if config is None:
        config = Configuration()
        db.session.add(config)
    config.message_sending_enabled = enabled
    db.session.commit()
    return config


def _classroom(classroom_id, user=None):
    classroom = db.session.get(Classroom, classroom_id)
    if not classroom:
        classroom = Classroom(id=classroom_id, name=classroom_id, language="Python")
        db.session.add(classroom)
    if user is not None and user not in classroom.users:
        classroom.users.append(user)
    db.session.commit()
    return classroom


def _send(socket_client, payload):
    """Emit 'send_message' and return the handler's acknowledgement."""
    return socket_client.emit("send_message", payload, callback=True)


def test_configuration_defaults_to_sending_enabled(init_db):
    config = Configuration()
    db.session.add(config)
    db.session.commit()
    assert config.message_sending_enabled is True


def test_student_can_send_without_configuration_row(connect, sample_user):
    Configuration.query.delete()
    db.session.commit()
    classroom = _classroom("cs_101", sample_user)

    socket_client = connect(sample_user)
    ack = _send(
        socket_client, {"content": "hello", "target_classrooms": [classroom.id]}
    )

    assert ack["success"] is True
    assert Message.query.filter_by(user_id=sample_user.id, content="hello").count() == 1


def test_student_gets_error_ack_when_sending_disabled(connect, sample_user):
    _set_sending(False)
    classroom = _classroom("cs_101", sample_user)

    socket_client = connect(sample_user)
    ack = _send(
        socket_client, {"content": "hello", "target_classrooms": [classroom.id]}
    )

    assert ack["success"] is False
    assert "disabled" in ack["error"]
    received = socket_client.get_received()
    assert not any(e["name"] == "message_received" for e in received)
    assert Message.query.filter_by(user_id=sample_user.id).count() == 0


def test_admin_exempt_when_sending_disabled(connect, sample_admin):
    _set_sending(False)

    socket_client = connect(sample_admin)
    ack = _send(socket_client, {"content": "admin msg", "is_global": True})

    assert ack["success"] is True
    assert (
        Message.query.filter_by(user_id=sample_admin.id, content="admin msg").count()
        == 1
    )


def test_only_active_banned_words_block_messages(connect, sample_user):
    _set_sending(True)
    classroom = _classroom("cs_101", sample_user)
    word = BannedWords(word="badword", active=True)
    db.session.add(word)
    db.session.commit()

    socket_client = connect(sample_user)
    ack = _send(
        socket_client,
        {"content": "this is a BadWord", "target_classrooms": [classroom.id]},
    )
    assert ack["success"] is False
    assert ack["error"]
    assert Message.query.filter_by(user_id=sample_user.id).count() == 0

    word.active = False
    db.session.commit()
    # The admin routes do this after changing a word; the banned words are cached
    moderation_service.clear_cache()
    ack = _send(
        socket_client,
        {"content": "this is a badword", "target_classrooms": [classroom.id]},
    )
    assert ack["success"] is True
    assert Message.query.filter_by(user_id=sample_user.id).count() == 1


def test_invalid_payloads_are_rejected(connect, sample_user):
    _set_sending(True)
    _classroom("cs_101", sample_user)

    socket_client = connect(sample_user)
    for payload in ("not-a-dict", {}, {"content": "   "}, {"content": 12345}):
        ack = _send(socket_client, payload)
        assert ack["success"] is False, payload
        assert ack["error"]

    assert Message.query.filter_by(user_id=sample_user.id).count() == 0


def test_message_length_caps(connect, sample_user, sample_admin):
    _set_sending(True)
    classroom = _classroom("cs_101", sample_user)

    student_socket = connect(sample_user)
    ack = _send(
        student_socket, {"content": "x" * 501, "target_classrooms": [classroom.id]}
    )
    assert ack["success"] is False
    assert "too long" in ack["error"].lower()

    admin_socket = connect(sample_admin)
    ack = _send(admin_socket, {"content": "x" * 4001, "is_global": True})
    assert ack["success"] is False

    assert Message.query.filter_by(user_id=sample_user.id).count() == 0
    assert Message.query.filter_by(user_id=sample_admin.id).count() == 0


def test_student_cannot_target_unenrolled_classroom(connect, sample_user):
    _set_sending(True)
    _classroom("cs_101", sample_user)
    other = _classroom("cs_202")

    socket_client = connect(sample_user)
    ack = _send(socket_client, {"content": "sneaky", "target_classrooms": [other.id]})

    assert ack["success"] is True
    msg = Message.query.filter_by(user_id=sample_user.id, content="sneaky").one()
    assert list(msg.target_classrooms) == []
    assert msg.is_global is False
