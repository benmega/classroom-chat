from datetime import datetime, timedelta

import pytest
from application import socket_events
from application.constants import GLOBAL_CLASSROOM_ID
from application.extensions import db, socketio
from application.models.classroom import Classroom
from application.models.configuration import Configuration
from application.models.message import Message
from application.models.session_log import SessionLog
from application.models.user import User
from tests.factories import ClassroomFactory, UserFactory


@pytest.fixture(autouse=True)
def setup_socketio(app):
    from application import tasks
    tasks.set_app_instance(app)


@pytest.fixture(autouse=True)
def clean_socket_registry():
    # The registry is module state: a test that fails before disconnecting must not leak into the next
    socket_events._active_sessions.clear()
    socket_events._sid_users.clear()
    yield
    socket_events._active_sessions.clear()
    socket_events._sid_users.clear()


def _login(app, user):
    flask_client = app.test_client()
    with flask_client.session_transaction() as sess:
        sess["user"] = user.id
    return flask_client


def _connect(app, user, flask_client=None):
    """Open a socket for the user; returns (socket client, the flask client holding their session)."""
    flask_client = flask_client or _login(app, user)
    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    assert socket_client.is_connected()
    return socket_client, flask_client


def _rooms(socket_client):
    sid = socketio.server.manager.sid_from_eio_sid(socket_client.eio_sid, "/")
    return set(socketio.server.rooms(sid, namespace="/"))


def _broadcast(classroom_id, content="hello"):
    socketio.emit("message_received", {"content": content}, room=f"classroom:{classroom_id}")


def _received_contents(socket_client):
    return [
        e["args"][0]["content"]
        for e in socket_client.get_received()
        if e["name"] == "message_received"
    ]


def _make_student(**kwargs):
    return UserFactory(role="student", **kwargs)


def _make_admin():
    return UserFactory(role="admin")


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

    socket_client.disconnect()


def test_socket_send_message_triggers_achievement(app, sample_user, init_db):
    from application.models.achievements import Achievement, UserAchievement

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

    # Add a chat achievement
    ach = Achievement(name="Chatter", slug="chatter", type="chat", requirement_value="1", reward=5)
    db.session.add(ach)
    db.session.commit()

    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    assert socket_client.is_connected()

    # Emit message
    socket_client.emit(
        "send_message",
        {"content": "First message to earn achievement", "target_classrooms": [classroom.id]},
    )

    received = socket_client.get_received()
    unlocked_events = [e for e in received if e["name"] == "achievement_unlocked"]
    assert len(unlocked_events) == 1
    new_awards = unlocked_events[0]["args"][0]["new_awards"]
    assert any(a["slug"] == "chatter" or a["name"] == "Chatter" for a in new_awards)

    # Verify UserAchievement was saved in database
    ua = UserAchievement.query.filter_by(user_id=sample_user.id, achievement_id=ach.id).first()
    assert ua is not None

    socket_client.disconnect()


def _is_online(user_id):
    db.session.expire_all()
    return db.session.get(User, user_id).is_online


def _status_changes(socket_client):
    return [
        e["args"][0] for e in socket_client.get_received() if e["name"] == "user_status_change"
    ]


def _enable_messaging():
    config = Configuration.query.first()
    if not config:
        config = Configuration(message_sending_enabled=True)
        db.session.add(config)
    else:
        config.message_sending_enabled = True
    db.session.commit()


# --- rooms joined at connect --------------------------------------------------


def test_connect_joins_own_global_and_enrolled_rooms_only(app, sample_user):
    enrolled = ClassroomFactory()
    other = ClassroomFactory()
    enrolled.users.append(sample_user)
    db.session.commit()

    socket_client, _ = _connect(app, sample_user)

    rooms = _rooms(socket_client)
    assert {
        f"user:{sample_user.id}",
        f"classroom:{GLOBAL_CLASSROOM_ID}",
        f"classroom:{enrolled.id}",
    } <= rooms
    assert f"classroom:{other.id}" not in rooms
    assert "admin" not in rooms


def test_admin_connect_joins_every_classroom_and_the_admin_room(app, sample_admin):
    classrooms = [ClassroomFactory(), ClassroomFactory()]
    socket_client, _ = _connect(app, sample_admin)

    rooms = _rooms(socket_client)
    assert "admin" in rooms
    assert {f"classroom:{c.id}" for c in classrooms} <= rooms


def _probe(socket_client, room):
    """Whether an event addressed to the room reaches the socket."""
    socket_client.get_received()
    socketio.emit("probe", {}, room=room)
    return any(e["name"] == "probe" for e in socket_client.get_received())


def test_connected_student_is_reached_only_through_their_own_rooms(app, sample_user):
    enrolled = ClassroomFactory(id="cs_101")
    ClassroomFactory(id="cs_202")
    enrolled.users.append(sample_user)
    db.session.commit()
    stranger = UserFactory()

    socket_client, _ = _connect(app, sample_user)

    assert _probe(socket_client, f"user:{sample_user.id}")
    assert _probe(socket_client, f"classroom:{GLOBAL_CLASSROOM_ID}")
    assert _probe(socket_client, "classroom:cs_101")
    assert not _probe(socket_client, "classroom:cs_202")
    assert not _probe(socket_client, "admin")
    assert not _probe(socket_client, f"user:{stranger.id}")


def test_connected_admin_is_reached_through_the_admin_room_and_every_classroom(app, sample_admin):
    ClassroomFactory(id="cs_101")
    ClassroomFactory(id="cs_202")

    socket_client, _ = _connect(app, sample_admin)

    assert _probe(socket_client, "admin")
    assert _probe(socket_client, f"user:{sample_admin.id}")
    assert _probe(socket_client, f"classroom:{GLOBAL_CLASSROOM_ID}")
    assert _probe(socket_client, "classroom:cs_101")
    assert _probe(socket_client, "classroom:cs_202")


# --- parents cannot chat -----------------------------------------------------------


def test_parent_cannot_send_a_message_over_the_socket(app):
    parent = UserFactory(role="parent")
    socket_client, _ = _connect(app, parent)
    socket_client.get_received()

    ack = socket_client.emit(
        "send_message", {"content": "let me in", "is_global": True}, callback=True
    )

    assert ack["success"] is False
    assert ack["error"].startswith("Forbidden")
    assert Message.query.count() == 0
    assert _received_contents(socket_client) == []


# --- multi-tab presence and the sid registry ------------------------------------


def test_second_tab_keeps_user_online_until_the_last_tab_closes(app, sample_user):
    first, flask_client = _connect(app, sample_user)
    second, _ = _connect(app, sample_user, flask_client)

    assert len(socket_events._active_sessions[sample_user.id]) == 2
    assert len(socket_events._sid_users) == 2
    # Only the first tab announces the user as online
    assert _status_changes(first) == [{"user_id": sample_user.id, "is_online": True}]
    assert _status_changes(second) == []

    first.disconnect()
    assert _is_online(sample_user.id) is True
    assert len(socket_events._active_sessions[sample_user.id]) == 1
    assert len(socket_events._sid_users) == 1

    second.disconnect()
    assert _is_online(sample_user.id) is False
    assert socket_events._active_sessions == {}
    assert socket_events._sid_users == {}


def test_disconnect_after_user_row_deleted_does_not_leak_the_sid(app, sample_user):
    user_id = sample_user.id
    socket_client, _ = _connect(app, sample_user)

    db.session.delete(db.session.get(User, user_id))
    db.session.commit()
    socket_client.disconnect()

    assert socket_events._active_sessions == {}
    assert socket_events._sid_users == {}


def test_disconnect_without_session_user_still_releases_the_sid(app, sample_user, monkeypatch):
    socket_client, flask_client = _connect(app, sample_user)

    monkeypatch.setattr(socket_events, "session", {})
    socket_client.disconnect()
    monkeypatch.undo()

    assert socket_events._active_sessions == {}
    assert socket_events._sid_users == {}
    assert _is_online(sample_user.id) is False

    # The next connection counts as the first one again, so the user is shown online
    reconnected, _ = _connect(app, sample_user, flask_client)
    assert _status_changes(reconnected) == [{"user_id": sample_user.id, "is_online": True}]
    assert _is_online(sample_user.id) is True


def test_disconnect_of_unregistered_socket_is_ignored(app, sample_user):
    socket_client, _ = _connect(app, sample_user)
    socket_events._sid_users.clear()
    socket_events._active_sessions.clear()

    socket_client.disconnect()  # nothing to release, and nothing may raise

    assert socket_events._active_sessions == {}


# --- live enrollment ---------------------------------------------------------


def test_join_code_enrollment_reaches_the_open_socket(app, sample_user):
    classroom = ClassroomFactory(join_code="LIVE1")
    socket_client, flask_client = _connect(app, sample_user)
    socket_client.get_received()

    _broadcast(classroom.id, "before")
    assert _received_contents(socket_client) == []

    res = flask_client.post("/api/classroom/join", json={"code": "LIVE1"})
    assert res.status_code == 200

    enrolled = [e for e in socket_client.get_received() if e["name"] == "classroom_enrolled"]
    assert enrolled[0]["args"][0]["user_id"] == sample_user.id
    assert enrolled[0]["args"][0]["classroom"]["id"] == classroom.id

    _broadcast(classroom.id, "after")
    assert _received_contents(socket_client) == ["after"]


def test_admin_enroll_reaches_the_open_socket(app, sample_user, sample_admin):
    classroom = ClassroomFactory()
    socket_client, _ = _connect(app, sample_user)
    admin_client = _login(app, sample_admin)

    res = admin_client.post(
        f"/api/admin/classrooms/{classroom.id}/enroll", json={"student_id": sample_user.id}
    )
    assert res.status_code == 200

    _broadcast(classroom.id)
    assert _received_contents(socket_client) == ["hello"]
    # Enrolling a student who is already in the classroom announces nothing
    socket_client.get_received()
    res = admin_client.post(
        f"/api/admin/classrooms/{classroom.id}/enroll", json={"student_id": sample_user.id}
    )
    assert res.status_code == 200
    assert [e for e in socket_client.get_received() if e["name"] == "classroom_enrolled"] == []


def test_enrollment_still_succeeds_when_the_push_fails(app, sample_user, monkeypatch):
    classroom = ClassroomFactory(join_code="LIVE2")
    socket_client, flask_client = _connect(app, sample_user)

    def boom(*args, **kwargs):
        raise RuntimeError("socket server down")

    monkeypatch.setattr(socketio, "emit", boom)

    res = flask_client.post("/api/classroom/join", json={"code": "LIVE2"})

    assert res.status_code == 200
    # The rooms were still synced, so the classroom's messages arrive once the server is back
    assert f"classroom:{classroom.id}" in _rooms(socket_client)


def test_challenge_enrollment_reaches_the_open_socket(app, sample_user):
    from application.routes.challenge_routes import _enroll_user_in_classroom

    classroom = ClassroomFactory()
    socket_client, _ = _connect(app, sample_user)

    _enroll_user_in_classroom(sample_user, classroom.id)

    _broadcast(classroom.id)
    assert _received_contents(socket_client) == ["hello"]


def test_enrollment_only_reaches_the_enrolled_users_sockets(app, sample_user, sample_admin):
    classroom = ClassroomFactory()
    bystander = UserFactory()
    student_socket, _ = _connect(app, sample_user)
    bystander_socket, _ = _connect(app, bystander)

    _login(app, sample_admin).post(
        f"/api/admin/classrooms/{classroom.id}/enroll", json={"student_id": sample_user.id}
    )

    _broadcast(classroom.id)
    assert _received_contents(student_socket) == ["hello"]
    assert _received_contents(bystander_socket) == []


def test_unenroll_stops_classroom_events_without_reconnecting(app, sample_user, sample_admin):
    classroom = ClassroomFactory()
    classroom.users.append(sample_user)
    db.session.commit()
    socket_client, _ = _connect(app, sample_user)
    socket_client.get_received()

    _broadcast(classroom.id, "while enrolled")
    assert _received_contents(socket_client) == ["while enrolled"]

    res = _login(app, sample_admin).post(
        f"/api/admin/classrooms/{classroom.id}/unenroll", json={"student_id": sample_user.id}
    )
    assert res.status_code == 200

    _broadcast(classroom.id, "after removal")
    assert _received_contents(socket_client) == []
    # Only the classroom is dropped: the personal and global rooms stay
    rooms = _rooms(socket_client)
    assert f"classroom:{classroom.id}" not in rooms
    assert {f"user:{sample_user.id}", f"classroom:{GLOBAL_CLASSROOM_ID}"} <= rooms


def test_unenrolling_an_admin_keeps_them_in_every_classroom(app, sample_admin):
    classroom = ClassroomFactory()
    classroom.users.append(sample_admin)
    db.session.commit()
    socket_client, flask_client = _connect(app, sample_admin)

    res = flask_client.post(
        f"/api/admin/classrooms/{classroom.id}/unenroll", json={"student_id": sample_admin.id}
    )
    assert res.status_code == 200

    assert f"classroom:{classroom.id}" in _rooms(socket_client)


def test_deleting_a_classroom_empties_its_room(app, sample_user, sample_admin):
    classroom = ClassroomFactory()
    classroom.users.append(sample_user)
    db.session.commit()
    classroom_id = classroom.id
    student_socket, _ = _connect(app, sample_user)
    admin_socket, admin_client = _connect(app, sample_admin)
    student_socket.get_received()
    admin_socket.get_received()

    res = admin_client.delete(f"/api/admin/classrooms/{classroom_id}")
    assert res.status_code == 200

    _broadcast(classroom_id)
    assert _received_contents(student_socket) == []
    assert _received_contents(admin_socket) == []
    assert f"classroom:{classroom_id}" not in _rooms(student_socket)


def test_deleting_a_classroom_through_the_crud_api_empties_its_room(app, sample_user, sample_admin):
    classroom = ClassroomFactory()
    classroom.users.append(sample_user)
    db.session.commit()
    classroom_id = classroom.id
    student_socket, _ = _connect(app, sample_user)
    student_socket.get_received()

    res = _login(app, sample_admin).delete(f"/api/admin/crud/classroom/{classroom_id}")
    assert res.status_code == 200

    _broadcast(classroom_id)
    assert _received_contents(student_socket) == []


def test_closing_the_global_room_is_refused(app, sample_user):
    socket_client, _ = _connect(app, sample_user)

    socket_events.close_classroom_room(GLOBAL_CLASSROOM_ID)

    assert f"classroom:{GLOBAL_CLASSROOM_ID}" in _rooms(socket_client)


# --- admins see every classroom ----------------------------------------------


def test_admin_receives_messages_of_classrooms_they_are_not_enrolled_in(app, sample_admin):
    classroom = ClassroomFactory()
    socket_client, _ = _connect(app, sample_admin)
    socket_client.get_received()

    _broadcast(classroom.id)

    assert _received_contents(socket_client) == ["hello"]


def test_connected_admin_joins_classrooms_created_later(app, sample_admin, sample_user):
    admin_socket, _ = _connect(app, sample_admin)
    student_socket, _ = _connect(app, sample_user)
    classroom = ClassroomFactory()

    socket_events.sync_admin_rooms()

    _broadcast(classroom.id)
    assert _received_contents(admin_socket) == ["hello"]
    # Students only ever follow their own enrollments
    assert _received_contents(student_socket) == []


def test_crud_create_of_a_classroom_syncs_connected_admins(client, sample_admin, monkeypatch):
    from application.routes.admin import crud_routes

    synced = []
    monkeypatch.setattr(socket_events, "sync_admin_rooms", lambda: synced.append(True))
    # The generic create cannot currently insert a classroom (its id is not assignable), so
    # stand in for the commit to exercise what runs after a successful create
    monkeypatch.setattr(crud_routes, "_commit", lambda: None)
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    res = client.post("/api/admin/crud/classroom", json={"name": "New", "language": "python"})

    assert res.status_code == 200
    assert synced == [True]


# --- role changes --------------------------------------------------------------


def test_demoted_admin_stops_getting_admin_and_foreign_classroom_events(app, sample_admin):
    own = ClassroomFactory()
    foreign = ClassroomFactory()
    target = _make_admin()
    own.users.append(target)
    db.session.commit()
    socket_client, _ = _connect(app, target)
    socket_client.get_received()
    assert {"admin", f"classroom:{foreign.id}"} <= _rooms(socket_client)

    res = _login(app, sample_admin).put(f"/api/admin/user/{target.id}", json={"is_admin": False})
    assert res.status_code == 200

    socketio.emit("sandbox_status_changed", {"active": True}, room="admin")
    _broadcast(foreign.id, "foreign")
    _broadcast(own.id, "own")
    received = socket_client.get_received()
    assert [e for e in received if e["name"] == "sandbox_status_changed"] == []
    assert [e["args"][0]["content"] for e in received if e["name"] == "message_received"] == ["own"]
    rooms = _rooms(socket_client)
    assert {f"user:{target.id}", f"classroom:{GLOBAL_CLASSROOM_ID}", f"classroom:{own.id}"} <= rooms
    assert "admin" not in rooms


def test_demotion_through_the_crud_api_also_leaves_the_admin_room(app, sample_admin):
    target = _make_admin()
    socket_client, _ = _connect(app, target)

    res = _login(app, sample_admin).put(f"/api/admin/crud/user/{target.id}", json={"role": "student"})
    assert res.status_code == 200

    assert "admin" not in _rooms(socket_client)


def test_promoted_student_joins_the_admin_rooms_without_reconnecting(app, sample_admin, sample_user):
    classroom = ClassroomFactory()
    socket_client, _ = _connect(app, sample_user)
    assert "admin" not in _rooms(socket_client)

    res = _login(app, sample_admin).put(f"/api/admin/user/{sample_user.id}", json={"is_admin": True})
    assert res.status_code == 200

    assert {"admin", f"classroom:{classroom.id}"} <= _rooms(socket_client)


def test_editing_a_user_without_changing_the_role_leaves_rooms_alone(
    app, sample_admin, sample_user, monkeypatch
):
    _connect(app, sample_user)
    synced = []
    monkeypatch.setattr(socket_events, "sync_user_rooms", synced.append)

    res = _login(app, sample_admin).put(f"/api/admin/user/{sample_user.id}", json={"bio": "hello"})

    assert res.status_code == 200
    assert synced == []


# --- sync robustness -------------------------------------------------------------


def test_sync_user_rooms_skips_sockets_that_are_already_gone(app, sample_user):
    socket_events._active_sessions[sample_user.id] = {"ghost-sid"}

    socket_events.sync_user_rooms(sample_user.id)  # must not raise


def test_sync_user_rooms_ignores_unknown_users_and_users_without_sockets(app, sample_user):
    socket_events.sync_user_rooms(sample_user.id)
    socket_events._active_sessions[99999] = {"ghost-sid"}
    socket_events.sync_user_rooms(99999)


def test_sync_user_rooms_swallows_database_errors(app, sample_user, monkeypatch):
    socket_events._active_sessions[sample_user.id] = {"ghost-sid"}

    def boom(*args, **kwargs):
        raise RuntimeError("db down")

    monkeypatch.setattr(socket_events, "_desired_rooms", boom)

    socket_events.sync_user_rooms(sample_user.id)  # the enrollment already committed: no error


def test_sync_admin_rooms_swallows_database_errors(app, sample_admin, monkeypatch):
    socket_events._active_sessions[sample_admin.id] = {"ghost-sid"}

    def boom(*args, **kwargs):
        raise RuntimeError("db down")

    monkeypatch.setattr(db.session, "execute", boom)

    socket_events.sync_admin_rooms()


def test_close_classroom_room_swallows_server_errors(app, monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("no server")

    monkeypatch.setattr(socketio.server, "close_room", boom)

    socket_events.close_classroom_room("anything")


# --- logout -------------------------------------------------------------------


def test_logout_disconnects_every_socket_of_the_user(app, sample_user):
    watcher_user = UserFactory()
    watcher, _ = _connect(app, watcher_user)
    first, flask_client = _connect(app, sample_user)
    second, _ = _connect(app, sample_user, flask_client)
    other_device, _ = _connect(app, sample_user)
    watcher.get_received()

    res = flask_client.get("/user/logout")

    assert res.status_code == 302
    assert not first.is_connected()
    assert not second.is_connected()
    assert not other_device.is_connected()
    assert sample_user.id not in socket_events._active_sessions
    assert watcher_user.id in socket_events._active_sessions
    assert len(socket_events._sid_users) == 1
    assert _is_online(sample_user.id) is False
    assert {"user_id": sample_user.id, "is_online": False} in _status_changes(watcher)


def test_logout_without_open_sockets_still_works(app, sample_user):
    flask_client = _login(app, sample_user)

    assert flask_client.get("/user/logout").status_code == 302


def test_logged_out_browser_cannot_reconnect(app, sample_user):
    socket_client, flask_client = _connect(app, sample_user)

    flask_client.get("/user/logout")

    assert not socket_client.is_connected()
    again = socketio.test_client(app, flask_test_client=flask_client)
    assert not again.is_connected()
    assert socket_events._active_sessions == {}


def test_user_can_reconnect_after_logging_back_in(app, sample_user):
    _, flask_client = _connect(app, sample_user)
    flask_client.get("/user/logout")
    with flask_client.session_transaction() as sess:
        sess["user"] = sample_user.id

    again, _ = _connect(app, sample_user, flask_client)

    assert _is_online(sample_user.id) is True
    assert len(socket_events._active_sessions[sample_user.id]) == 1
    again.disconnect()
    assert _is_online(sample_user.id) is False


def test_logout_survives_a_failing_socket_disconnect(app, sample_user, monkeypatch):
    _, flask_client = _connect(app, sample_user)

    def boom(*args, **kwargs):
        raise RuntimeError("transport gone")

    monkeypatch.setattr(socketio.server, "disconnect", boom)

    res = flask_client.get("/user/logout")

    assert res.status_code == 302
    assert sample_user.id not in socket_events._active_sessions
    assert socket_events._sid_users == {}
    assert _is_online(sample_user.id) is False
    with flask_client.session_transaction() as sess:
        assert "user" not in sess


def test_disconnect_user_sockets_leaves_a_newer_socket_alone(app, sample_user, monkeypatch):
    _connect(app, sample_user)
    old_sid = next(iter(socket_events._active_sessions[sample_user.id]))

    # A tab that connects while the old one is being dropped must stay registered
    def disconnect_and_reconnect(sid, namespace=None):
        socket_events._active_sessions[sample_user.id].add("newer-sid")

    monkeypatch.setattr(socketio.server, "disconnect", disconnect_and_reconnect)

    socket_events.disconnect_user_sockets(sample_user.id)

    assert socket_events._active_sessions[sample_user.id] == {"newer-sid"}
    assert old_sid not in socket_events._sid_users


# --- socket activity counts as presence ----------------------------------------


def _age_open_session(user_id, minutes=30):
    log = SessionLog.query.filter_by(user_id=user_id, end_time=None).one()
    log.last_seen = datetime.utcnow() - timedelta(minutes=minutes)
    db.session.commit()
    return log.id


def test_socket_only_client_sending_a_message_refreshes_last_seen(app, sample_admin):
    _enable_messaging()
    socket_client, _ = _connect(app, sample_admin)
    log_id = _age_open_session(sample_admin.id)

    socket_client.emit("send_message", {"content": "still here", "is_global": True})

    db.session.expire_all()
    assert db.session.get(SessionLog, log_id).last_seen > datetime.utcnow() - timedelta(minutes=1)


def test_extra_tab_connecting_refreshes_last_seen(app, sample_user):
    _, flask_client = _connect(app, sample_user)
    log_id = _age_open_session(sample_user.id)

    _connect(app, sample_user, flask_client)

    db.session.expire_all()
    assert db.session.get(SessionLog, log_id).last_seen > datetime.utcnow() - timedelta(minutes=1)


def test_sending_a_message_does_not_fail_when_recording_presence_fails(app, sample_admin, monkeypatch):
    _enable_messaging()
    socket_client, _ = _connect(app, sample_admin)
    socket_client.get_received()

    def boom(*args, **kwargs):
        raise RuntimeError("db hiccup")

    monkeypatch.setattr(SessionLog, "touch", boom)

    socket_client.emit("send_message", {"content": "hello anyway", "is_global": True})

    assert _received_contents(socket_client) == ["hello anyway"]


def test_connected_user_ids_lists_users_with_open_sockets(app, sample_user):
    user_socket, _ = _connect(app, sample_user)

    assert socket_events.connected_user_ids() == {sample_user.id}
    user_socket.disconnect()
    assert socket_events.connected_user_ids() == set()
