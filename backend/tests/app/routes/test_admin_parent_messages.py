"""
File: test_admin_parent_messages.py
Type: py
Summary: Unit tests for admin parent message routes and resolution.
"""

from application.extensions import db
from application.models.parent_message import ParentMessage
from application.models.user import User


def login_as_admin(client, admin_user):
    with client.session_transaction() as sess:
        sess["_user_id"] = str(admin_user.id)
        sess["_fresh"] = True
        sess["user"] = admin_user.id


def test_list_parent_messages_requires_admin(client, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    resp = client.get("/api/admin/parent-messages")
    assert resp.status_code == 403


def test_list_parent_messages_success(client, app, sample_admin):
    login_as_admin(client, sample_admin)

    with app.app_context():
        parent = User(username="parent_one", role="parent", email="parent@test.com")
        parent.set_password("pass123")
        db.session.add(parent)
        db.session.commit()

        msg1 = ParentMessage(
            parent_id=parent.id,
            subject="Help with homework",
            body="Can you help with chapter 2?",
            status="pending",
        )
        msg2 = ParentMessage(
            parent_id=parent.id,
            subject="Resolved inquiry",
            body="All sorted out.",
            status="resolved",
        )
        db.session.add_all([msg1, msg2])
        db.session.commit()

    # Default is pending
    resp = client.get("/api/admin/parent-messages")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    messages = data["messages"]
    assert len(messages) == 1
    assert messages[0]["subject"] == "Help with homework"
    assert messages[0]["parent_username"] == "parent_one"

    # Status all
    resp_all = client.get("/api/admin/parent-messages?status=all")
    assert resp_all.status_code == 200
    assert len(resp_all.get_json()["data"]["messages"]) == 2


def test_resolve_parent_message(client, app, sample_admin):
    login_as_admin(client, sample_admin)

    with app.app_context():
        parent = User(username="parent_two", role="parent")
        parent.set_password("pass123")
        db.session.add(parent)
        db.session.commit()

        msg = ParentMessage(
            parent_id=parent.id,
            subject="Question",
            body="Where is the event?",
            status="pending",
        )
        db.session.add(msg)
        db.session.commit()
        msg_id = msg.id

    # 404 for invalid id
    resp_404 = client.post("/api/admin/parent-messages/99999/resolve")
    assert resp_404.status_code == 404

    # Resolve success
    resp = client.post(f"/api/admin/parent-messages/{msg_id}/resolve")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert "marked as resolved" in data["message"]

    with app.app_context():
        updated = db.session.get(ParentMessage, msg_id)
        assert updated.status == "resolved"
        assert updated.resolved_at is not None
        assert updated.resolved_by_id == sample_admin.id


def test_contact_teacher_creates_parent_message(client, app, sample_admin):
    with app.app_context():
        parent = User(username="parent_three", role="parent")
        parent.set_password("pass123")
        student = User(username="student_three", role="student", nickname="Kiddo")
        student.set_password("pass123")
        parent.children.append(student)
        db.session.add_all([parent, student])
        db.session.commit()
        p_id = parent.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    res = client.post(
        "/api/parents/contact-teacher",
        json={"subject": "Progress Check", "body": "How is Kiddo doing?"},
    )
    assert res.status_code == 200

    with app.app_context():
        pmsg = ParentMessage.query.filter_by(parent_id=p_id).first()
        assert pmsg is not None
        assert pmsg.subject == "Progress Check"
        assert pmsg.body == "How is Kiddo doing?"
        assert pmsg.status == "pending"
        dict_data = pmsg.to_dict()
        assert "Kiddo" in dict_data["student_names"]


def test_review_counts_includes_parent_messages(client, app, sample_admin):
    login_as_admin(client, sample_admin)

    with app.app_context():
        parent = User(username="parent_four", role="parent")
        parent.set_password("pass123")
        db.session.add(parent)
        db.session.commit()

        msg = ParentMessage(
            parent_id=parent.id,
            subject="Test count",
            body="Review count test",
            status="pending",
        )
        db.session.add(msg)
        db.session.commit()

    resp = client.get("/api/admin/review_counts")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert "pending_parent_messages" in data
    assert data["pending_parent_messages"] >= 1


def _make_parent(username):
    parent = User(username=username, role="parent")
    parent.set_password("pass123")
    db.session.add(parent)
    db.session.commit()
    return parent.id


def test_list_parent_messages_invalid_status(client, sample_admin):
    login_as_admin(client, sample_admin)

    resp = client.get("/api/admin/parent-messages?status=bogus")
    assert resp.status_code == 400
    assert "Invalid status filter." in resp.get_data(as_text=True)

    # Valid filters still work
    for status in ("pending", "resolved", "all"):
        assert client.get(f"/api/admin/parent-messages?status={status}").status_code == 200


def test_list_parent_messages_resolved_filter(client, app, sample_admin):
    login_as_admin(client, sample_admin)
    with app.app_context():
        pid = _make_parent("parent_resolved_filter")
        db.session.add_all([
            ParentMessage(parent_id=pid, subject="open", body="b", status="pending"),
            ParentMessage(parent_id=pid, subject="done", body="b", status="resolved"),
        ])
        db.session.commit()

    resp = client.get("/api/admin/parent-messages?status=resolved")
    messages = resp.get_json()["data"]["messages"]
    assert [m["subject"] for m in messages] == ["done"]


def test_list_parent_messages_is_capped(client, app, sample_admin):
    login_as_admin(client, sample_admin)
    with app.app_context():
        pid = _make_parent("parent_cap")
        db.session.add_all([
            ParentMessage(parent_id=pid, subject=f"s{i}", body="b", status="pending")
            for i in range(205)
        ])
        db.session.commit()

    resp = client.get("/api/admin/parent-messages?status=all")
    assert resp.status_code == 200
    assert len(resp.get_json()["data"]["messages"]) == 200


def test_resolve_parent_message_twice_keeps_original_resolution(client, app, sample_admin):
    from datetime import datetime

    login_as_admin(client, sample_admin)
    original_time = datetime(2020, 1, 2, 3, 4, 5)
    with app.app_context():
        pid = _make_parent("parent_twice")
        msg = ParentMessage(
            parent_id=pid,
            subject="Done already",
            body="b",
            status="resolved",
            resolved_at=original_time,
            resolved_by_id=None,
        )
        db.session.add(msg)
        db.session.commit()
        msg_id = msg.id

    resp = client.post(f"/api/admin/parent-messages/{msg_id}/resolve")
    assert resp.status_code == 200
    item = resp.get_json()["data"]["item"]
    assert item["id"] == msg_id
    assert item["status"] == "resolved"

    with app.app_context():
        db.session.expire_all()
        unchanged = db.session.get(ParentMessage, msg_id)
        assert unchanged.resolved_at == original_time
        assert unchanged.resolved_by_id is None


def _login_parent(client, app, username):
    with app.app_context():
        parent = User(username=username, role="parent")
        parent.set_password("pass123")
        db.session.add(parent)
        db.session.commit()
        pid = parent.id
    with client.session_transaction() as sess:
        sess["user"] = pid
    return pid


def test_contact_teacher_null_subject_ok(client, app, sample_admin):
    pid = _login_parent(client, app, "parent_nullsubj")

    res = client.post("/api/parents/contact-teacher", json={"subject": None, "body": "Hello"})
    assert res.status_code == 200

    with app.app_context():
        pmsg = ParentMessage.query.filter_by(parent_id=pid).first()
        assert pmsg.subject is None
        assert pmsg.body == "Hello"


def test_contact_teacher_null_body_rejected(client, app, sample_admin):
    _login_parent(client, app, "parent_nullbody")

    res = client.post("/api/parents/contact-teacher", json={"subject": "x", "body": None})
    assert res.status_code == 400


def test_contact_teacher_subject_too_long(client, app, sample_admin):
    pid = _login_parent(client, app, "parent_longsubj")

    res = client.post(
        "/api/parents/contact-teacher",
        json={"subject": "s" * 256, "body": "Hello"},
    )
    assert res.status_code == 400
    assert "Subject is too long" in res.get_data(as_text=True)

    # Exactly 255 is accepted
    ok = client.post(
        "/api/parents/contact-teacher",
        json={"subject": "s" * 255, "body": "Hello"},
    )
    assert ok.status_code == 200

    with app.app_context():
        assert ParentMessage.query.filter_by(parent_id=pid).count() == 1


def test_contact_teacher_also_posts_legacy_message(client, app, sample_admin):
    from application.models.message import Message

    pid = _login_parent(client, app, "parent_legacy")

    res = client.post(
        "/api/parents/contact-teacher",
        json={"subject": "Legacy", "body": "Still visible to admins"},
    )
    assert res.status_code == 200

    with app.app_context():
        msg = Message.query.filter_by(user_id=pid).first()
        assert msg is not None
        assert "Still visible to admins" in msg.content
        assert "Legacy" in msg.content
