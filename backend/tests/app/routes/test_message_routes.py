from datetime import datetime, timedelta
from unittest.mock import patch

from application import db
from application.constants import GLOBAL_CLASSROOM_ID
from application.extensions import socketio
from application.models.classroom import Classroom
from application.models.message import Message
from tests.factories import ClassroomFactory, UserFactory


def test_get_feed_not_logged_in(client, init_db):
    # The message blueprint is mounted at /message, so the route is /message/api/feed
    response = client.get("/message/api/feed")
    # @require_login answers every anonymous request with a JSON 401, never a redirect
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required. Please log in."}


def test_get_feed_not_logged_in_html_client(client, init_db):
    response = client.get("/message/api/feed", headers={"Accept": "text/html"})
    assert response.status_code == 401
    assert response.is_json


def test_get_feed_admin(client, init_db, sample_user):
    sample_user.role = "admin"
    db.session.commit()

    msg1 = Message(user_id=sample_user.id, content="msg1", is_global=False)
    msg2 = Message(user_id=sample_user.id, content="msg2", is_global=True)
    db.session.add_all([msg1, msg2])
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/message/api/feed")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert len(data["messages"]) == 2


def test_get_feed_parent_forbidden(client, init_db, sample_user):
    sample_user.role = "parent"
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/message/api/feed")
    assert response.status_code == 403
    data = response.get_json()
    assert data["success"] is False
    assert "Forbidden" in data["error"]


def test_get_feed_student(client, init_db, sample_user, sample_classroom):
    # User in a classroom
    sample_user.classrooms.append(sample_classroom)
    db.session.commit()

    # Message 1: Global
    msg1 = Message(user_id=sample_user.id, content="global msg", is_global=True)

    # Message 2: Targeted to classroom
    msg2 = Message(user_id=sample_user.id, content="classroom msg", is_global=False)
    db.session.add(msg2)
    msg2.target_classrooms.append(sample_classroom)

    # Message 3: Invisible
    msg3 = Message(user_id=sample_user.id, content="invisible", is_global=False)
    # wait, authored by user, so it will be visible!

    # Let's create another user
    from application.models.user import User

    other_user = User(username="other", role="student")
    other_user.set_password("pass")
    db.session.add(other_user)
    db.session.commit()

    msg4 = Message(user_id=other_user.id, content="other invisible", is_global=False)

    db.session.add_all([msg1, msg2, msg3, msg4])
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/message/api/feed")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert len(data["messages"]) == 3

    contents = [m["content"] for m in data["messages"]]
    assert "global msg" in contents
    assert "classroom msg" in contents
    assert "invisible" in contents
    assert "other invisible" not in contents


def test_get_feed_before_id(client, init_db, sample_user):
    msg1 = Message(user_id=sample_user.id, content="msg1", is_global=True)
    msg2 = Message(user_id=sample_user.id, content="msg2", is_global=True)
    db.session.add_all([msg1, msg2])
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    resp = client.get(f"/message/api/feed?before_id={msg2.id}")
    assert resp.status_code == 200
    data = resp.json
    assert len(data["messages"]) == 1
    assert data["messages"][0]["id"] == msg1.id


def test_get_me_context(client, init_db, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    resp = client.get("/message/api/me/context")
    assert resp.status_code == 200
    assert resp.json["success"] is True


def _login(client, user):
    with client.session_transaction() as sess:
        sess["user"] = user.id


def test_me_context_requires_login(client, init_db):
    resp = client.get("/message/api/me/context")

    assert resp.status_code == 401
    assert resp.get_json() == {"error": "Authentication required. Please log in."}


def test_me_context_for_a_student_lists_only_their_classrooms(client, init_db, sample_user):
    mine = ClassroomFactory(name="Mine")
    ClassroomFactory(name="Not mine")
    mine.users.append(sample_user)
    db.session.commit()
    _login(client, sample_user)

    resp = client.get("/message/api/me/context")

    assert resp.status_code == 200
    assert resp.get_json() == {
        "success": True,
        "classrooms": [{"id": mine.id, "name": "Mine", "sandbox_active": False}],
        "users": [],
    }


def test_me_context_for_a_student_without_classrooms_is_empty(client, init_db, sample_user):
    ClassroomFactory()
    _login(client, sample_user)

    resp = client.get("/message/api/me/context")

    assert resp.get_json() == {"success": True, "classrooms": [], "users": []}


def test_me_context_for_an_admin_lists_every_classroom_and_every_non_parent(
    client, init_db, sample_admin, sample_user
):
    first = ClassroomFactory(name="First")
    second = ClassroomFactory(name="Second")
    second.sandbox_active = True
    second.sandbox_activated_at = datetime.utcnow()
    parent = UserFactory(role="parent")
    db.session.commit()
    _login(client, sample_admin)

    resp = client.get("/message/api/me/context")

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    by_id = {c["id"]: c for c in data["classrooms"]}
    # The admin is in none of these classrooms; they see all of them, seeded ones included
    assert by_id[first.id] == {"id": first.id, "name": "First", "sandbox_active": False}
    assert by_id[second.id] == {"id": second.id, "name": "Second", "sandbox_active": True}
    assert set(by_id) == {c.id for c in Classroom.query.all()}
    assert {GLOBAL_CLASSROOM_ID, first.id, second.id} <= set(by_id)

    ids = [u["id"] for u in data["users"]]
    assert sample_admin.id in ids
    assert sample_user.id in ids
    assert parent.id not in ids
    assert set(data["users"][0]) == {"id", "username", "nickname"}
    usernames = [u["username"] for u in data["users"]]
    assert usernames == sorted(usernames)


def test_me_context_user_rows_carry_username_and_nickname(client, init_db, sample_admin):
    student = UserFactory(nickname="Sunny")
    _login(client, sample_admin)

    users = {u["id"]: u for u in client.get("/message/api/me/context").get_json()["users"]}

    assert users[student.id] == {
        "id": student.id,
        "username": student.username,
        "nickname": "Sunny",
    }


def test_me_context_ends_a_sandbox_left_over_from_a_previous_day(
    client, init_db, sample_user
):
    stale = ClassroomFactory()
    today = ClassroomFactory()
    stale.users.append(sample_user)
    today.users.append(sample_user)
    stale.sandbox_active = True
    stale.sandbox_activated_at = datetime.utcnow() - timedelta(days=2)
    today.sandbox_active = True
    today.sandbox_activated_at = datetime.utcnow()
    db.session.commit()
    stale_id, today_id = stale.id, today.id
    _login(client, sample_user)

    resp = client.get("/message/api/me/context")

    flags = {c["id"]: c["sandbox_active"] for c in resp.get_json()["classrooms"]}
    assert flags == {stale_id: False, today_id: True}
    # The expiry is persisted, not just hidden from this response
    db.session.expire_all()
    expired = db.session.get(Classroom, stale_id)
    assert expired.sandbox_active is False
    assert expired.sandbox_activated_at is None
    assert db.session.get(Classroom, today_id).sandbox_active is True


def test_me_context_for_an_admin_also_ends_a_stale_sandbox(client, init_db, sample_admin):
    stale = ClassroomFactory()
    stale.sandbox_active = True
    stale.sandbox_activated_at = datetime.utcnow() - timedelta(days=1)
    db.session.commit()
    stale_id = stale.id
    _login(client, sample_admin)

    data = client.get("/message/api/me/context").get_json()

    assert {c["id"]: c["sandbox_active"] for c in data["classrooms"]}[stale_id] is False
    db.session.expire_all()
    assert db.session.get(Classroom, stale_id).sandbox_active is False


def test_delete_message(client, init_db, sample_user):
    msg = Message(user_id=sample_user.id, content="to be deleted", is_global=True)
    db.session.add(msg)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # Author delete
    resp = client.delete(f"/message/delete_message/{msg.id}")
    assert resp.status_code == 200
    assert resp.json["success"] is True

    resp = client.delete("/message/delete_message/99999")
    assert resp.status_code == 404


def _message_ids_in_feed(client):
    return [m["id"] for m in client.get("/message/api/feed").get_json()["messages"]]


def test_author_delete_strikes_the_message_and_hides_it_from_the_feed(
    client, init_db, sample_user
):
    msg = Message(user_id=sample_user.id, content="oops", is_global=True)
    keep = Message(user_id=sample_user.id, content="stay", is_global=True)
    db.session.add_all([msg, keep])
    db.session.commit()
    msg_id, keep_id = msg.id, keep.id
    _login(client, sample_user)
    assert _message_ids_in_feed(client) == [keep_id, msg_id]

    resp = client.delete(f"/message/delete_message/{msg_id}")

    assert resp.status_code == 200
    assert resp.get_json() == {"success": True}
    db.session.expire_all()
    deleted = db.session.get(Message, msg_id)
    assert deleted.is_struck is True
    assert deleted.deleted_at is not None
    assert db.session.get(Message, keep_id).deleted_at is None
    assert _message_ids_in_feed(client) == [keep_id]


def test_non_author_student_cannot_delete_someone_elses_message(client, init_db, sample_user):
    other = UserFactory()
    msg = Message(user_id=other.id, content="not yours", is_global=True)
    db.session.add(msg)
    db.session.commit()
    msg_id = msg.id
    _login(client, sample_user)

    with patch.object(socketio, "emit") as emit:
        resp = client.delete(f"/message/delete_message/{msg_id}")

    assert resp.status_code == 403
    assert "Forbidden" in resp.get_json()["error"]
    emit.assert_not_called()
    db.session.expire_all()
    untouched = db.session.get(Message, msg_id)
    assert untouched.is_struck is False
    assert untouched.deleted_at is None
    assert msg_id in _message_ids_in_feed(client)


def test_admin_can_strike_another_users_message(client, init_db, sample_admin, sample_user):
    msg = Message(user_id=sample_user.id, content="rude", is_global=True)
    db.session.add(msg)
    db.session.commit()
    msg_id = msg.id
    _login(client, sample_user)
    assert msg_id in _message_ids_in_feed(client)
    _login(client, sample_admin)

    resp = client.delete(f"/message/delete_message/{msg_id}")

    assert resp.status_code == 200
    assert resp.get_json() == {"success": True}
    db.session.expire_all()
    struck = db.session.get(Message, msg_id)
    assert struck.is_struck is True
    assert struck.deleted_at is not None
    # Gone for the admin and for the author alike
    assert msg_id not in _message_ids_in_feed(client)
    _login(client, sample_user)
    assert msg_id not in _message_ids_in_feed(client)


def test_deleting_a_message_announces_it_to_everyone(client, init_db, sample_user):
    msg = Message(user_id=sample_user.id, content="bye", is_global=True)
    db.session.add(msg)
    db.session.commit()
    msg_id = msg.id
    _login(client, sample_user)

    with patch.object(socketio, "emit") as emit:
        resp = client.delete(f"/message/delete_message/{msg_id}")

    assert resp.status_code == 200
    payload = {"message_id": msg_id}
    emit.assert_any_call("message_deleted", payload, room=f"classroom:{GLOBAL_CLASSROOM_ID}")
    emit.assert_any_call("message_deleted", payload)
    assert emit.call_count == 2


def test_delete_message_requires_login(client, init_db, sample_user):
    msg = Message(user_id=sample_user.id, content="mine", is_global=True)
    db.session.add(msg)
    db.session.commit()
    msg_id = msg.id

    with patch.object(socketio, "emit") as emit:
        resp = client.delete(f"/message/delete_message/{msg_id}")

    assert resp.status_code == 401
    assert resp.get_json() == {"error": "Authentication required. Please log in."}
    emit.assert_not_called()
    db.session.expire_all()
    assert db.session.get(Message, msg_id).deleted_at is None


def test_delete_message_of_an_unknown_id_is_a_404_for_an_admin_too(client, init_db, sample_admin):
    _login(client, sample_admin)

    resp = client.delete("/message/delete_message/99999")

    assert resp.status_code == 404
    assert resp.get_json() == {"error": "Message not found"}


def test_http_send_message_route_removed(client, init_db, sample_user):
    """Chat is Socket.IO only; the legacy HTTP send route no longer exists."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post("/message/send_message", data={"message": "Hello!"})
    assert response.status_code in (404, 405)
