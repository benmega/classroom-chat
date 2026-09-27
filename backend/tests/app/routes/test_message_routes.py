from application import db
from application.models.message import Message


def test_get_feed_not_logged_in(client, init_db):
    response = client.get("/message/api/feed")
    assert response.status_code == 302


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
    sample_user.classrooms.append(sample_classroom)
    db.session.commit()

    msg1 = Message(user_id=sample_user.id, content="global msg", is_global=True)

    msg2 = Message(user_id=sample_user.id, content="classroom msg", is_global=False)
    db.session.add(msg2)
    msg2.target_classrooms.append(sample_classroom)

    msg3 = Message(user_id=sample_user.id, content="invisible", is_global=False)

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


def test_delete_message(client, init_db, sample_user):
    msg = Message(user_id=sample_user.id, content="to be deleted", is_global=True)
    db.session.add(msg)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    resp = client.delete(f"/message/delete_message/{msg.id}")
    assert resp.status_code == 200
    assert resp.json["success"] is True

    resp = client.delete("/message/delete_message/99999")
    assert resp.status_code == 404
