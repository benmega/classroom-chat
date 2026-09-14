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
