"""
Unit tests for classroom_routes.py
"""
from application.extensions import db
from application.models.classroom import Classroom
from application.models.user import User


def test_join_classroom_unauthenticated(client):
    res = client.post("/api/classroom/join", json={"code": "AB3C9"})
    assert res.status_code == 401


def test_join_classroom_parent_forbidden(client, app):
    with app.app_context():
        parent = User(username="parent_user_c", role="parent")
        parent.set_password("pass123")
        db.session.add(parent)
        db.session.commit()
        p_id = parent.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    res = client.post("/api/classroom/join", json={"code": "AB3C9"})
    assert res.status_code == 403
    data = res.get_json()
    assert "Parents cannot join classrooms" in data.get("error", "")


def test_join_classroom_missing_code(client, app):
    with app.app_context():
        student = User(username="student_user_c1", role="student")
        student.set_password("pass123")
        db.session.add(student)
        db.session.commit()
        s_id = student.id

    with client.session_transaction() as sess:
        sess["user"] = s_id

    res = client.post("/api/classroom/join", json={"code": ""})
    assert res.status_code == 400
    data = res.get_json()
    assert "Join code is required" in data.get("error", "")


def test_join_classroom_invalid_code(client, app):
    with app.app_context():
        student = User(username="student_user_c2", role="student")
        student.set_password("pass123")
        db.session.add(student)
        db.session.commit()
        s_id = student.id

    with client.session_transaction() as sess:
        sess["user"] = s_id

    res = client.post("/api/classroom/join", json={"code": "INVAL"})
    assert res.status_code == 404
    data = res.get_json()
    assert "Invalid classroom code" in data.get("error", "")


def test_join_classroom_reserved_code(client, app):
    with app.app_context():
        student = User(username="student_user_c3", role="student")
        student.set_password("pass123")

        glob_room = Classroom.query.get("global")
        if not glob_room:
            glob_room = Classroom(id="global", name="Global Room", language="Python", join_code="GLOB1")
            db.session.add(glob_room)
        else:
            glob_room.join_code = "GLOB1"

        db.session.add(student)
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
        student = User(username="student_user_c4", role="student")
        student.set_password("pass123")
        db.session.add(student)

        room = Classroom(id="room_123_c", name="CS 101", language="Python", join_code="JOIN1")
        db.session.add(room)
        db.session.commit()
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
        student = User(username="student_user_c5", role="student")
        student.set_password("pass123")

        c1 = Classroom(id="c1_my", name="Math Class", language="Python", join_code="MATH1")
        glob_room = Classroom.query.get("global")

        student.classrooms.append(c1)
        if glob_room:
            student.classrooms.append(glob_room)

        db.session.add_all([student, c1])
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
