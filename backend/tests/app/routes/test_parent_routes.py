"""
Unit tests for parent_routes.py
"""
from application.extensions import db
from application.models.user import User


from tests.factories import UserFactory, AchievementFactory, UserAchievementFactory, ProjectFactory


def test_parent_get_children_access_denied(client, app):
    with app.app_context():
        student = UserFactory(role="student")
        s_id = student.id

    with client.session_transaction() as sess:
        sess["user"] = s_id

    res = client.get("/api/parents/children")
    assert res.status_code == 403


def test_parent_get_children_success(client, app):
    with app.app_context():
        parent = UserFactory(role="parent")
        child1 = UserFactory(username="child_1_test", role="student", nickname="Child One", connection_code="CODE1_PTEST")

        parent.children.append(child1)
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
        parent = UserFactory(role="parent")
        p_id = parent.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    res = client.post("/api/parents/connect/code", json={"code": ""})
    assert res.status_code == 400
    data = res.get_json()
    assert "Connection code is required" in data.get("error", "")


def test_connect_via_code_invalid_code(client, app):
    with app.app_context():
        parent = UserFactory(role="parent")
        p_id = parent.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    res = client.post("/api/parents/connect/code", json={"code": "NONEXISTENT"})
    assert res.status_code == 404


def test_connect_via_code_success_and_already_linked(client, app):
    with app.app_context():
        parent = UserFactory(role="parent")
        child = UserFactory(username="child_4_test", role="student", nickname="Child Four", connection_code="LINK4_PTEST")

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
        parent = UserFactory(role="parent")
        child = UserFactory(role="student", nickname="Child Five", connection_code="LINK5_PTEST")

        parent.children.append(child)
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
        parent = UserFactory(role="parent")
        child = UserFactory(username="child_6_test", role="student", nickname="Child Six")

        parent.children.append(child)
        db.session.commit()
        p_id = parent.id
        c_id = child.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    res = client.get(f"/api/parents/student/{c_id}/report")
    assert res.status_code == 200
    data = res.get_json()
    assert data["data"]["username"] == "child_6_test"


def test_get_children_profile_picture_and_activity(client, app):
    with app.app_context():
        parent = UserFactory(role="parent")
        child = UserFactory(
            role="student",
            profile_picture="custom.jpg",
            current_activity="Coding",
            last_activity_time=db.func.now(),
        )
        parent.children.append(child)
        db.session.commit()
        p_id = parent.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    res = client.get("/api/parents/children")
    assert res.status_code == 200
    children = res.get_json()["data"]["children"]
    assert children[0]["profile_picture_url"] == "/user/profile_pictures/custom.jpg"
    assert children[0]["current_activity"] == "Coding"


def test_get_student_report_edge_cases(client, app):
    with app.app_context():
        parent = UserFactory(role="parent")
        child = UserFactory(
            role="student",
            profile_picture="pfp.jpg",
            current_activity="Debugging",
        )
        stranger_child = UserFactory(role="student")

        parent.children.append(child)
        db.session.commit()
        p_id = parent.id
        c_id = child.id
        s_id = stranger_child.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    # Not linked student
    res1 = client.get(f"/api/parents/student/{s_id}/report")
    assert res1.status_code == 403

    # Student non-existent in DB
    res2 = client.get("/api/parents/student/99999/report")
    assert res2.status_code == 403

    # Non-parent user
    with client.session_transaction() as sess:
        sess["user"] = c_id

    res3 = client.get(f"/api/parents/student/{c_id}/report")
    assert res3.status_code == 403


def test_get_student_report_with_achievements_projects_notes(client, app):
    from application.models.note import Note

    with app.app_context():
        parent = UserFactory(role="parent")
        child = UserFactory(role="student")
        parent.children.append(child)

        ach = AchievementFactory(name="Super Coder", type="ducks")
        ua = UserAchievementFactory(user_id=child.id, achievement_id=ach.id)
        proj = ProjectFactory(user_id=child.id, name="Snake Game")
        note = Note(user_id=child.id, filename="note1.png")
        
        db.session.add(note)
        db.session.commit()

        p_id = parent.id
        c_id = child.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    res = client.get(f"/api/parents/student/{c_id}/report")
    assert res.status_code == 200
    report = res.get_json()["data"]
    assert len(report["unlocked_achievements"]) == 1
    assert report["unlocked_achievements"][0]["name"] == "Super Coder"
    assert len(report["projects"]) == 1
    assert len(report["notes"]) == 1


def test_connect_via_code_edge_cases(client, app):
    from application.models.connection_attempt import ConnectionAttempt

    with app.app_context():
        parent = UserFactory(role="parent")
        student = UserFactory(role="student")
        p_id = parent.id
        s_id = student.id

    # Non-parent user
    with client.session_transaction() as sess:
        sess["user"] = s_id

    res1 = client.post("/api/parents/connect/code", json={"code": "SOMECODE"})
    assert res1.status_code == 403

    # Rate limited
    with app.app_context():
        for i in range(5):
            db.session.add(ConnectionAttempt(parent_id=p_id, code_attempted=f"CODE{i}"))
        db.session.commit()
        
    with client.session_transaction() as sess:
        sess["user"] = p_id

    res2 = client.post("/api/parents/connect/code", json={"code": "SOMECODE"})
    assert res2.status_code == 429
    assert "Too many attempts" in res2.get_json()["error"]


def test_disconnect_student_edge_cases(client, app):
    with app.app_context():
        parent = UserFactory(role="parent")
        student = UserFactory(role="student")
        db.session.commit()
        p_id = parent.id
        s_id = student.id

    # Non-parent user
    with client.session_transaction() as sess:
        sess["user"] = s_id

    res1 = client.post(f"/api/parents/disconnect/{s_id}")
    assert res1.status_code == 403

    # Student non-existent
    with client.session_transaction() as sess:
        sess["user"] = p_id

    res2 = client.post("/api/parents/disconnect/99999")
    assert res2.status_code == 404


def test_get_student_history(client, app):
    from datetime import datetime
    from application.models.note import Note
    from tests.factories import AchievementFactory, UserAchievementFactory, ChallengeLogFactory, DuckTradeLogFactory, ProjectFactory
    from application.models.duck_transaction import DuckTransaction

    with app.app_context():
        parent = UserFactory(role="parent")
        child = UserFactory(role="student", duck_balance=100.0)
        parent.children.append(child)
        stranger = UserFactory(role="student")
        db.session.commit()

        # Add history data for child
        tx = DuckTransaction(user_id=child.id, amount=10.0, timestamp=datetime.utcnow())
        clog = ChallengeLogFactory(user_id=child.id, domain="python", challenge_slug="vars-1")
        ach = AchievementFactory(name="Explorer", type="ducks")
        ua = UserAchievementFactory(user_id=child.id, achievement_id=ach.id)
        proj = ProjectFactory(user_id=child.id, name="Art Project")
        note = Note(user_id=child.id, filename="hist_note.png", created_at=datetime.utcnow())

        db.session.add_all([tx, note])
        db.session.commit()

        p_id = parent.id
        c_id = child.id
        s_id = stranger.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    # Success case
    res = client.get(f"/api/parents/student/{c_id}/history")
    assert res.status_code == 200
    hist = res.get_json()["data"]
    assert hist["has_any_activity_ever"] is True
    assert len(hist["recent_events"]) >= 4

    # Unlinked child -> 403
    res_unlinked = client.get(f"/api/parents/student/{s_id}/history")
    assert res_unlinked.status_code == 403

    # Non-parent user -> 403
    with client.session_transaction() as sess:
        sess["user"] = c_id

    res_non_parent = client.get(f"/api/parents/student/{c_id}/history")
    assert res_non_parent.status_code == 403


def test_get_student_history_fmt_date_fallback(client, app):
    from application.routes.parent_routes import _fmt_date

    class DummyDT:
        def __str__(self):
            return "2026-08-02 12:00:00"

    assert _fmt_date(DummyDT()) == "2026-08-02"


def test_contact_teacher(client, app):
    from application.models.message import Message

    with app.app_context():
        admin = UserFactory(role="admin")
        parent = UserFactory(role="parent", nickname="Parent One")
        child = UserFactory(role="student", nickname="Child One")
        parent.children.append(child)
        db.session.commit()
        
        p_id = parent.id
        c_id = child.id

    # Non-parent -> 403
    with client.session_transaction() as sess:
        sess["user"] = c_id
    res1 = client.post("/api/parents/contact-teacher", json={"body": "Hello"})
    assert res1.status_code == 403

    # Missing body -> 400
    with client.session_transaction() as sess:
        sess["user"] = p_id
    res2 = client.post("/api/parents/contact-teacher", json={"body": "   "})
    assert res2.status_code == 400

    # Body too long -> 400
    res3 = client.post("/api/parents/contact-teacher", json={"body": "a" * 2001})
    assert res3.status_code == 400

    # Success with subject
    res4 = client.post(
        "/api/parents/contact-teacher",
        json={"subject": "Question", "body": "How is my child doing?"}
    )
    assert res4.status_code == 200
    assert "sent to the teacher" in res4.get_json()["data"]["message"]

    with app.app_context():
        msg = Message.query.filter_by(user_id=p_id).first()
        assert msg is not None
        assert "Question" in msg.content


def test_contact_teacher_no_admins(client, app):
    with app.app_context():
        parent = UserFactory(role="parent")
        p_id = parent.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    res = client.post("/api/parents/contact-teacher", json={"body": "Is anyone there?"})
    assert res.status_code == 404
    assert "No teacher accounts found" in res.get_json()["error"]

