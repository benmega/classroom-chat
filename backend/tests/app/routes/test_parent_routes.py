"""
Unit tests for parent_routes.py
"""
from application.extensions import db
from application.models.user import User


def test_parent_get_children_access_denied(client, app):
    with app.app_context():
        student = User(username="std_only_parent_test", role="student")
        student.set_password("pass123")
        db.session.add(student)
        db.session.commit()
        s_id = student.id

    with client.session_transaction() as sess:
        sess["user"] = s_id

    res = client.get("/api/parents/children")
    assert res.status_code == 403


def test_parent_get_children_success(client, app):
    with app.app_context():
        parent = User(username="parent_1_test", role="parent")
        parent.set_password("pass123")

        child1 = User(username="child_1_test", role="student", nickname="Child One", connection_code="CODE1_PTEST")
        child1.set_password("pass123")

        parent.children.append(child1)
        db.session.add_all([parent, child1])
        db.session.commit()
        p_id = parent.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    res = client.get("/api/parents/children")
    assert res.status_code == 200
    data = res.get_json()
    children = data["data"]["children"]
    assert len(children) == 1
    assert children[0]["username"] == "child_1_test"


def test_connect_via_code_missing_code(client, app):
    with app.app_context():
        parent = User(username="parent_2_test", role="parent")
        parent.set_password("pass123")
        db.session.add(parent)
        db.session.commit()
        p_id = parent.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    res = client.post("/api/parents/connect/code", json={"code": ""})
    assert res.status_code == 400
    data = res.get_json()
    assert "Connection code is required" in data.get("error", "")


def test_connect_via_code_invalid_code(client, app):
    with app.app_context():
        parent = User(username="parent_3_test", role="parent")
        parent.set_password("pass123")
        db.session.add(parent)
        db.session.commit()
        p_id = parent.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    res = client.post("/api/parents/connect/code", json={"code": "NONEXISTENT"})
    assert res.status_code == 404


def test_connect_via_code_success_and_already_linked(client, app):
    with app.app_context():
        parent = User(username="parent_4_test", role="parent")
        parent.set_password("pass123")

        child = User(username="child_4_test", role="student", nickname="Child Four", connection_code="LINK4_PTEST")
        child.set_password("pass123")

        db.session.add_all([parent, child])
        db.session.commit()
        p_id = parent.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    # First attempt: success
    res = client.post("/api/parents/connect/code", json={"code": "LINK4_PTEST"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["data"]["student"]["nickname"] == "Child Four"

    # Second attempt: already linked
    res2 = client.post("/api/parents/connect/code", json={"code": "LINK4_PTEST"})
    assert res2.status_code == 400
    assert "Already linked" in res2.get_json().get("error", "")


def test_disconnect_student(client, app):
    with app.app_context():
        parent = User(username="parent_5_test", role="parent")
        parent.set_password("pass123")

        child = User(username="child_5_test", role="student", nickname="Child Five", connection_code="LINK5_PTEST")
        child.set_password("pass123")

        parent.children.append(child)
        db.session.add_all([parent, child])
        db.session.commit()
        p_id = parent.id
        c_id = child.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    res = client.post(f"/api/parents/disconnect/{c_id}")
    assert res.status_code == 200
    assert "Successfully disconnected" in res.get_json()["data"]["message"]

    # Trying to disconnect again should return 400
    res2 = client.post(f"/api/parents/disconnect/{c_id}")
    assert res2.status_code == 400


def test_get_student_report_success(client, app):
    with app.app_context():
        parent = User(username="parent_6_test", role="parent")
        parent.set_password("pass123")

        child = User(username="child_6_test", role="student", nickname="Child Six")
        child.set_password("pass123")

        parent.children.append(child)
        db.session.add_all([parent, child])
        db.session.commit()
        p_id = parent.id
        c_id = child.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    res = client.get(f"/api/parents/student/{c_id}/report")
    assert res.status_code == 200
    data = res.get_json()
    assert data["data"]["username"] == "child_6_test"
