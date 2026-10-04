from unittest.mock import patch

import pytest
from application.extensions import db
from application.models.challenge import Challenge
from application.models.classroom import Classroom
from application.models.message import Message, message_classrooms, message_users
from application.models.user import User
from application.routes.admin import advanced_ops
from sqlalchemy import func, select
from tests.factories import ClassroomFactory, UserFactory


def login_as_admin(client, admin_user):
    with client.session_transaction() as sess:
        sess["_user_id"] = str(admin_user.id)
        sess["_fresh"] = True
        sess["user"] = admin_user.id


def test_crud_schema(client, sample_admin):
    login_as_admin(client, sample_admin)

    resp = client.get("/api/admin/crud/schema/challenge")
    assert resp.status_code == 200
    assert resp.json["resource"] == "challenge"
    assert len(resp.json["fields"]) > 0

    resp = client.get("/api/admin/crud/schema/nonexistent")
    assert resp.status_code == 404


def test_crud_list_and_one(client, sample_admin):
    login_as_admin(client, sample_admin)

    resp = client.get("/api/admin/crud/challenge")
    assert resp.status_code == 200
    assert "data" in resp.json
    assert "total" in resp.json

    resp = client.get("/api/admin/crud/nonexistent")
    assert resp.status_code == 404

    c = Challenge(
        name="Test Chall",
        slug="test-chall",
        domain="domain",
        difficulty="easy",
        value=5,
    )
    db.session.add(c)
    db.session.commit()

    resp = client.get(f"/api/admin/crud/challenge/{c.id}")
    assert resp.status_code == 200
    assert resp.json["data"]["name"] == "Test Chall"

    resp = client.get("/api/admin/crud/challenge/99999")
    assert resp.status_code == 404


def test_crud_create_update_delete(client, sample_admin):
    login_as_admin(client, sample_admin)

    resp = client.post(
        "/api/admin/crud/challenge",
        json={
            "name": "New Chall",
            "slug": "new-chall",
            "domain": "test-domain",
            "difficulty": "hard",
            "value": 15,
        },
    )
    assert resp.status_code == 200
    assert resp.json["data"]["name"] == "New Chall"
    new_id = resp.json["data"]["id"]

    resp = client.put(
        f"/api/admin/crud/challenge/{new_id}", json={"name": "Updated Chall Name"}
    )
    assert resp.status_code == 200
    assert resp.json["data"]["name"] == "Updated Chall Name"

    resp = client.delete(f"/api/admin/crud/challenge/{new_id}")
    assert resp.status_code == 200
    assert resp.json["data"]["id"] == str(new_id)

    resp = client.get(f"/api/admin/crud/challenge/{new_id}")
    assert resp.status_code == 404


def test_crud_classroom(client, sample_admin):
    login_as_admin(client, sample_admin)

    resp = client.post(
        "/api/admin/crud/classroom",
        json={
            "id": "TEST_CLS_101",
            "name": "Test Classroom 101",
            "language": "Python",
        },
    )
    assert resp.status_code == 200
    assert resp.json["data"]["id"] == "TEST_CLS_101"
    assert resp.json["data"]["name"] == "Test Classroom 101"

    del_resp = client.delete("/api/admin/crud/classroom/TEST_CLS_101")
    assert del_resp.status_code == 200


def test_bulk_add_challenges(client, sample_admin):
    login_as_admin(client, sample_admin)

    resp = client.post("/api/admin/challenges/bulk_add", json={})
    assert resp.status_code == 400

    resp = client.post(
        "/api/admin/challenges/bulk_add",
        json={"challenges": [{"name": "A", "slug": "a"}]},
    )
    assert resp.status_code == 200
    assert resp.json["data"]["skipped"] == 1

    resp = client.post(
        "/api/admin/challenges/bulk_add",
        json={"course_id": "1", "domain": "domain", "challenges": []},
    )
    assert resp.status_code == 400

    resp = client.post(
        "/api/admin/challenges/bulk_add",
        json={
            "course_id": "CS1",
            "domain": "domain",
            "challenges": [
                {"name": "Bulk 1", "slug": "bulk-1"},
                {"name": "Bulk 2", "slug": "bulk-2"},
                {"name": "Invalid"},
            ],
        },
    )
    assert resp.status_code == 200
    data = resp.json["data"]
    assert data["added"] == 2
    assert data["skipped"] == 1



def _add_messages(user, count, **kwargs):
    messages = [Message(user_id=user.id, content=f"m{i}", **kwargs) for i in range(count)]
    db.session.add_all(messages)
    db.session.commit()
    return messages


def test_advanced_ops(client, sample_admin):
    login_as_admin(client, sample_admin)

    # purge-history with nothing to purge
    resp = client.post("/api/admin/advanced/purge-history")
    assert resp.status_code == 200
    assert resp.json["data"]["deleted_messages"] == 0


def test_purge_history_deletes_every_message(client, sample_admin, sample_user):
    _add_messages(sample_user, 2, is_global=True)
    login_as_admin(client, sample_admin)
    assert Message.query.count() == 2

    resp = client.post("/api/admin/advanced/purge-history")

    assert resp.status_code == 200
    assert resp.json["status"] == "success"
    assert resp.json["data"] == {
        "message": "History purged successfully.",
        "deleted_messages": 2,
    }
    assert Message.query.count() == 0


def test_purge_history_leaves_users_and_classrooms_alone(
    client, sample_admin, sample_user
):
    classroom = ClassroomFactory()
    _add_messages(sample_user, 2, is_global=True)
    users, classrooms = User.query.count(), Classroom.query.count()
    login_as_admin(client, sample_admin)

    resp = client.post("/api/admin/advanced/purge-history")

    assert resp.status_code == 200
    assert User.query.count() == users
    assert Classroom.query.count() == classrooms
    assert db.session.get(Classroom, classroom.id) is not None


def _targeted_message(author, classroom, recipient):
    msg = Message(user_id=author.id, content="targeted")
    msg.target_classrooms.append(classroom)
    msg.target_users.append(recipient)
    db.session.add(msg)
    db.session.commit()
    return msg


def test_purge_history_removes_the_targets_of_the_purged_messages(
    client, sample_admin, sample_user
):
    _targeted_message(sample_user, ClassroomFactory(), UserFactory())
    login_as_admin(client, sample_admin)

    resp = client.post("/api/admin/advanced/purge-history")

    assert resp.status_code == 200
    assert Message.query.count() == 0
    assert db.session.execute(select(func.count()).select_from(message_classrooms)).scalar() == 0
    assert db.session.execute(select(func.count()).select_from(message_users)).scalar() == 0


def test_message_created_after_a_purge_does_not_inherit_the_old_audience(
    client, sample_admin, sample_user
):
    _targeted_message(sample_user, ClassroomFactory(), UserFactory())
    login_as_admin(client, sample_admin)
    assert client.post("/api/admin/advanced/purge-history").status_code == 200

    fresh = Message(user_id=sample_user.id, content="fresh")
    db.session.add(fresh)
    db.session.commit()
    db.session.expire_all()

    assert fresh.target_classrooms == []
    assert fresh.target_users == []



def test_purge_history_rolls_back_and_hides_nothing_when_the_delete_fails(
    client, sample_admin, sample_user
):
    _add_messages(sample_user, 2, is_global=True)
    login_as_admin(client, sample_admin)

    with patch.object(db.session, "commit", side_effect=RuntimeError("disk full")):
        resp = client.post("/api/admin/advanced/purge-history")

    assert resp.status_code == 500
    assert resp.json["status"] == "error"
    assert "Failed to purge history" in resp.json["error"]
    assert Message.query.count() == 2


@pytest.mark.parametrize("who", ["anonymous", "student"])
def test_purge_history_is_refused_to_non_admins_and_deletes_nothing(
    client, sample_user, who
):
    _add_messages(sample_user, 2, is_global=True)
    if who == "student":
        with client.session_transaction() as sess:
            sess["user"] = sample_user.id

    resp = client.post("/api/admin/advanced/purge-history")

    assert resp.status_code == (401 if who == "anonymous" else 403)
    assert Message.query.count() == 2


