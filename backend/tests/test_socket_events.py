from application.extensions import db, socketio
from application.models.user import User
from application.models.classroom import Classroom
from application.models.configuration import Configuration
from application.models.message import Message

def test_socket_connect_unauthenticated(app):
    # Reject connection when no user in session
    flask_client = app.test_client()
    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    assert not socket_client.is_connected()

def test_socket_connect_user_not_found(app):
    flask_client = app.test_client()
    with flask_client.session_transaction() as sess:
        sess["user"] = 99999 # Non-existent user id
    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    assert not socket_client.is_connected()

def test_socket_connect_disconnect_student(app, sample_user, init_db):
    flask_client = app.test_client()
    with flask_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # Add student to a classroom to cover room joining
    classroom = Classroom(id="cs_101", name="CS 101", language="Python", url="http://example.com")
    classroom.users.append(sample_user)
    db.session.add(classroom)
    db.session.commit()

    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    assert socket_client.is_connected()

    # Verify status broadcast on connect
    received = socket_client.get_received()
    status_change_events = [e for e in received if e["name"] == "user_status_change"]
    assert len(status_change_events) == 1
    assert status_change_events[0]["args"][0] == {"user_id": sample_user.id, "is_online": True}

    # Clean up/Disconnect
    socket_client.disconnect()
    
    # Verify user offline status change is emitted (note: disconnect doesn't emit to itself, but we can verify DB/session status)
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

    classroom = Classroom(id="cs_101", name="CS 101", language="Python", url="http://example.com")
    classroom.users.append(sample_user)
    db.session.add(classroom)
    db.session.commit()

    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    assert socket_client.is_connected()

    # Enable message sending
    config = Configuration(message_sending_enabled=True)
    db.session.add(config)
    db.session.commit()

    # Emit message
    socket_client.emit("send_message", {
        "content": "Hello class!",
        "is_global": True, # Students should have this forced to False
        "target_classrooms": [classroom.id]
    })

    # Assert message received by client
    received = socket_client.get_received()
    msg_received = [e for e in received if e["name"] == "message_received"]
    assert len(msg_received) >= 1
    args = msg_received[0]["args"][0]
    assert args["content"] == "Hello class!"
    assert args["is_global"] is False # Forced to False for students

    # Verify saved in DB
    with app.app_context():
        msg = Message.query.filter_by(content="Hello class!").first()
        assert msg is not None
        assert msg.user_id == sample_user.id

    socket_client.disconnect()

def test_socket_send_message_disabled_or_muted(app, sample_user, init_db):
    flask_client = app.test_client()
    with flask_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # 1. Message sending disabled globally
    config = Configuration(message_sending_enabled=False)
    db.session.add(config)
    db.session.commit()

    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    socket_client.emit("send_message", {"content": "Disabled message"})
    received = socket_client.get_received()
    assert not any(e["name"] == "message_received" for e in received)
    socket_client.disconnect()

    # 2. User muted (can_chat = False)
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

    # Create config
    config = Configuration(message_sending_enabled=True)
    db.session.add(config)
    db.session.commit()

    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    socket_client.emit("send_message", {
        "content": "Admin global message",
        "is_global": True
    })

    received = socket_client.get_received()
    msg_received = [e for e in received if e["name"] == "message_received"]
    assert len(msg_received) == 1
    assert msg_received[0]["args"][0]["is_global"] is True

    socket_client.disconnect()
