"""
File: test_message_targets.py
Summary: What a stored chat message targets (classrooms and users) and what the
         send handler broadcasts for it. The targets are resolved with one query
         each and the broadcast is built from what was just saved, so these tests
         pin the stored rows and the payload the clients receive.
"""

import pytest
import sqlalchemy as sa
from application.extensions import db, socketio
from application.models.message import Message, message_classrooms, message_users
from application.utilities.db_helpers import save_message_to_db
from tests.factories import ClassroomFactory, UserFactory


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


@pytest.fixture
def connect(app):
    clients = []

    def _connect(user):
        flask_client = app.test_client()
        with flask_client.session_transaction() as sess:
            sess["user"] = user.id
        socket_client = socketio.test_client(app, flask_test_client=flask_client)
        assert socket_client.is_connected()
        clients.append(socket_client)
        socket_client.get_received()
        return socket_client

    yield _connect

    for socket_client in clients:
        if socket_client.is_connected():
            socket_client.disconnect()


def stored_user_ids(message_id):
    return set(
        db.session.scalars(
            sa.select(message_users.c.user_id).where(
                message_users.c.message_id == message_id
            )
        )
    )


def stored_classroom_ids(message_id):
    return set(
        db.session.scalars(
            sa.select(message_classrooms.c.classroom_id).where(
                message_classrooms.c.message_id == message_id
            )
        )
    )


def received(socket_client):
    return [
        e["args"][0] for e in socket_client.get_received() if e["name"] == "message_received"
    ]


# --------------------------------------------------------------------------- #
# save_message_to_db
# --------------------------------------------------------------------------- #


def test_result_carries_what_a_broadcast_needs(init_db, sample_admin):
    room = ClassroomFactory(name="Room One")

    result = save_message_to_db(
        sample_admin.id, "hello there", target_classrooms=[room.id]
    )

    assert result["success"] is True
    assert result["message"]["id"] == result["message_id"]
    assert result["message"]["content"] == "hello there"
    assert result["message"]["message_type"] == "text"
    assert result["message"]["created_at"] is not None
    assert result["message"]["is_struck"] is False
    assert result["message"]["is_global"] is False
    assert result["target_classrooms"] == [{"id": room.id, "name": "Room One"}]
    assert result["target_user_names"] == []
    stored = db.session.get(Message, result["message_id"])
    assert stored.content == "hello there"
    assert stored.created_at == result["message"]["created_at"]


def test_message_keeps_the_senders_perks_at_send_time(init_db, sample_admin):
    sample_admin.has_animated_border = True
    sample_admin.animated_border_speed = "fast"
    sample_admin.animated_border_color = "#112233"
    sample_admin.chat_font_color = "#445566"
    db.session.commit()

    result = save_message_to_db(sample_admin.id, "perks", is_global=True)

    assert result["message"]["has_animated_border"] is True
    assert result["message"]["animated_border_speed"] == "fast"
    assert result["message"]["animated_border_color"] == "#112233"
    assert result["message"]["chat_font_color"] == "#445566"
    assert result["message"]["is_global"] is True


def test_classrooms_are_stored_once_each_and_reported_in_the_order_asked(
    init_db, sample_admin
):
    first = ClassroomFactory(name="First")
    second = ClassroomFactory(name="Second")

    result = save_message_to_db(
        sample_admin.id,
        "to two rooms",
        target_classrooms=[second.id, first.id, second.id, "no-such-room"],
    )

    assert result["success"] is True
    assert stored_classroom_ids(result["message_id"]) == {first.id, second.id}
    assert [c["name"] for c in result["target_classrooms"]] == ["Second", "First"]


def test_live_message_targets_every_online_user_and_names_them(init_db, sample_admin):
    online_one = UserFactory(is_online=True, nickname="Olive")
    online_two = UserFactory(is_online=True, nickname="")
    UserFactory(is_online=False)

    result = save_message_to_db(sample_admin.id, "to the live ones", target_live=True)

    assert stored_user_ids(result["message_id"]) == {online_one.id, online_two.id}
    assert result["message"]["target_live"] is True
    # the display name falls back to the username when the nickname is empty
    assert result["target_user_names"] == ["Olive", online_two._username]


def test_listed_users_are_stored_once_even_when_online_and_unknown_ids_are_skipped(
    init_db, sample_admin
):
    online = UserFactory(is_online=True)
    offline = UserFactory(is_online=False)

    result = save_message_to_db(
        sample_admin.id,
        "mixed targets",
        target_live=True,
        target_user_ids=[offline.id, online.id, 987654],
    )

    assert stored_user_ids(result["message_id"]) == {online.id, offline.id}
    assert len(result["target_user_names"]) == 2


def test_listed_users_without_live_targeting(init_db, sample_admin):
    online = UserFactory(is_online=True)
    chosen = UserFactory(is_online=False, nickname="Chosen")

    result = save_message_to_db(sample_admin.id, "just one", target_user_ids=[chosen.id])

    assert stored_user_ids(result["message_id"]) == {chosen.id}
    assert online.id not in stored_user_ids(result["message_id"])
    assert result["target_user_names"] == ["Chosen"]


def test_unusable_targets_fail_cleanly_and_store_nothing(init_db, sample_admin):
    result = save_message_to_db(sample_admin.id, "bad targets", target_classrooms=[["x"]])

    assert result == {"success": False, "error": "Failed to save message"}
    assert db.session.scalar(sa.select(sa.func.count()).select_from(Message)) == 0


# --------------------------------------------------------------------------- #
# The send handler's broadcast
# --------------------------------------------------------------------------- #


def test_classroom_message_payload_and_audience(connect, init_db, sample_admin):
    room = ClassroomFactory(name="Chemistry")
    elsewhere = ClassroomFactory(name="Elsewhere")
    member = UserFactory(nickname="Member")
    outsider = UserFactory()
    db.session.execute(
        sa.text("INSERT INTO user_classrooms (user_id, classroom_id, enrolled_at) VALUES (:u, :c, CURRENT_TIMESTAMP)"),
        {"u": member.id, "c": room.id},
    )
    db.session.execute(
        sa.text("INSERT INTO user_classrooms (user_id, classroom_id, enrolled_at) VALUES (:u, :c, CURRENT_TIMESTAMP)"),
        {"u": outsider.id, "c": elsewhere.id},
    )
    db.session.commit()
    member_socket, outsider_socket = connect(member), connect(outsider)
    admin_socket = connect(sample_admin)

    ack = admin_socket.emit(
        "send_message",
        {"content": "lab at noon", "target_classrooms": [room.id]},
        callback=True,
    )

    assert ack == {"success": True, "new_awards": []}
    [payload] = received(member_socket)
    assert received(outsider_socket) == []
    saved = db.session.scalars(sa.select(Message)).one()
    assert payload == {
        "id": saved.id,
        "user_id": sample_admin.id,
        "user_name": sample_admin.nickname,
        "slug": sample_admin.slug,
        "user_profile_pic": sample_admin.profile_picture,
        "content": "lab at noon",
        "message_type": "text",
        "created_at": saved.created_at.isoformat(),
        "is_global": False,
        "target_live": False,
        "target_classrooms": ["Chemistry"],
        "target_classroom_ids": [room.id],
        "target_users": [],
        "is_struck": False,
        "has_animated_border": False,
        "animated_border_speed": "normal",
        "animated_border_color": None,
        "chat_font_color": None,
    }


def test_live_message_reaches_each_online_user_once_and_names_them(
    connect, init_db, sample_admin
):
    first = UserFactory(nickname="First")
    second = UserFactory(nickname="Second")
    first_socket, second_socket = connect(first), connect(second)
    admin_socket = connect(sample_admin)
    offline = UserFactory(is_online=False)
    db.session.commit()

    ack = admin_socket.emit(
        "send_message", {"content": "who is here", "target_live": True}, callback=True
    )

    assert ack["success"] is True
    [to_first] = received(first_socket)
    [to_second] = received(second_socket)
    assert to_first == to_second
    assert to_first["target_live"] is True
    assert sorted(to_first["target_users"]) == sorted(
        [sample_admin.nickname, "First", "Second"]
    )
    # the sender gets their own copy once
    assert len(received(admin_socket)) == 1
    message_id = to_first["id"]
    assert offline.id not in stored_user_ids(message_id)
    assert stored_user_ids(message_id) == {first.id, second.id, sample_admin.id}


def test_message_to_chosen_users_reaches_only_them_and_the_sender(
    connect, init_db, sample_admin
):
    chosen = UserFactory(nickname="Chosen")
    bystander = UserFactory(nickname="Bystander")
    chosen_socket, bystander_socket = connect(chosen), connect(bystander)
    admin_socket = connect(sample_admin)

    ack = admin_socket.emit(
        "send_message",
        {"content": "just for you", "target_users": [chosen.id, 424242]},
        callback=True,
    )

    assert ack["success"] is True
    [payload] = received(chosen_socket)
    assert payload["target_users"] == ["Chosen"]
    assert received(bystander_socket) == []
    assert len(received(admin_socket)) == 1


def test_student_must_wait_between_messages(connect, init_db, sample_user):
    room = ClassroomFactory()
    db.session.execute(
        sa.text("INSERT INTO user_classrooms (user_id, classroom_id, enrolled_at) VALUES (:u, :c, CURRENT_TIMESTAMP)"),
        {"u": sample_user.id, "c": room.id},
    )
    db.session.commit()
    socket_client = connect(sample_user)
    payload = {"content": "first", "target_classrooms": [room.id]}

    first = socket_client.emit("send_message", payload, callback=True)
    second = socket_client.emit("send_message", {**payload, "content": "second"}, callback=True)

    assert first["success"] is True
    assert second["success"] is False
    assert second["error"].startswith("Please wait")
    contents = db.session.scalars(sa.select(Message.content)).all()
    assert contents == ["first"]


def test_student_can_send_again_after_the_wait(connect, init_db, sample_user):
    from datetime import datetime, timedelta

    room = ClassroomFactory()
    db.session.execute(
        sa.text("INSERT INTO user_classrooms (user_id, classroom_id, enrolled_at) VALUES (:u, :c, CURRENT_TIMESTAMP)"),
        {"u": sample_user.id, "c": room.id},
    )
    db.session.add(
        Message(
            user_id=sample_user.id,
            content="older",
            created_at=datetime.utcnow() - timedelta(seconds=45),
        )
    )
    db.session.commit()
    socket_client = connect(sample_user)

    ack = socket_client.emit(
        "send_message", {"content": "fresh", "target_classrooms": [room.id]}, callback=True
    )

    assert ack["success"] is True
