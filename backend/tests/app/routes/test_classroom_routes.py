"""
Unit tests for classroom_routes.py
"""
from application.extensions import db
from application.models.classroom import Classroom
from application.models.user import User
from tests.factories import ClassroomFactory, UserFactory


def test_join_classroom_unauthenticated(client):
    res = client.post("/api/classroom/join", json={"code": "AB3C9"})
    assert res.status_code == 401


def test_join_classroom_parent_forbidden(client, app):
    with app.app_context():
        parent = UserFactory(role="parent")
        p_id = parent.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    res = client.post("/api/classroom/join", json={"code": "AB3C9"})
    assert res.status_code == 403
    data = res.get_json()
    assert "Parents cannot join classrooms" in data.get("error", "")


def test_join_classroom_missing_code(client, app):
    with app.app_context():
        student = UserFactory(role="student")
        s_id = student.id

    with client.session_transaction() as sess:
        sess["user"] = s_id

    res = client.post("/api/classroom/join", json={"code": ""})
    assert res.status_code == 400
    data = res.get_json()
    assert "Join code is required" in data.get("error", "")


def test_join_classroom_invalid_code(client, app):
    with app.app_context():
        student = UserFactory(role="student")
        s_id = student.id

    with client.session_transaction() as sess:
        sess["user"] = s_id

    res = client.post("/api/classroom/join", json={"code": "INVAL"})
    assert res.status_code == 404
    data = res.get_json()
    assert "Invalid classroom code" in data.get("error", "")


def test_join_classroom_reserved_code(client, app):
    with app.app_context():
        student = UserFactory(role="student")

        glob_room = Classroom.query.get("global")
        if not glob_room:
            glob_room = ClassroomFactory(id="global", name="Global Room", language="Python", join_code="GLOB1")
        else:
            glob_room.join_code = "GLOB1"
            db.session.commit()

        s_id = student.id

    with client.session_transaction() as sess:
        sess["user"] = s_id

    res = client.post("/api/classroom/join", json={"code": "GLOB1"})
    assert res.status_code == 400
    data = res.get_json()
    assert "Cannot join reserved classrooms" in data.get("error", "")


def test_join_classroom_success_and_already_enrolled(client, app):
    with app.app_context():
        student = UserFactory(role="student")
        ClassroomFactory(name="CS 101", join_code="JOIN1")
        s_id = student.id

    with client.session_transaction() as sess:
        sess["user"] = s_id

    # First join: Success
    res = client.post("/api/classroom/join", json={"code": "JOIN1"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["data"]["classroom"]["name"] == "CS 101"

    # Second join: Already enrolled
    res2 = client.post("/api/classroom/join", json={"code": "JOIN1"})
    assert res2.status_code == 400
    data2 = res2.get_json()
    assert "Already enrolled" in data2.get("error", "")


def test_my_classrooms_endpoint(client, app):
    with app.app_context():
        student = UserFactory(role="student")
        c1 = ClassroomFactory(name="Math Class")
        glob_room = Classroom.query.get("global")

        student.classrooms.append(c1)
        if glob_room:
            student.classrooms.append(glob_room)

        db.session.commit()
        s_id = student.id

    with client.session_transaction() as sess:
        sess["user"] = s_id

    res = client.get("/api/classroom/mine")
    assert res.status_code == 200
    data = res.get_json()
    rooms = data["data"]["classrooms"]
    assert len(rooms) == 1
    assert rooms[0]["name"] == "Math Class"
