from datetime import timedelta

from application.extensions import db
from application.models.user import User
from application.utilities.helper_functions import utcnow_naive
from tests.factories import AchievementFactory, ProjectFactory, UserAchievementFactory, UserFactory


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
        UserFactory(username="child_4_test", role="student", nickname="Child Four", connection_code="LINK4_PTEST")

        db.session.commit()
        p_id = parent.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    res = client.post("/api/parents/connect/code", json={"code": "LINK4_PTEST"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["data"]["student"]["nickname"] == "Child Four"

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

    res1 = client.get(f"/api/parents/student/{s_id}/report")
    assert res1.status_code == 403

    res2 = client.get("/api/parents/student/99999/report")
    assert res2.status_code == 403

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
        UserAchievementFactory(user_id=child.id, achievement_id=ach.id)
        ProjectFactory(user_id=child.id, name="Snake Game")
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

    with client.session_transaction() as sess:
        sess["user"] = s_id

    res1 = client.post("/api/parents/connect/code", json={"code": "SOMECODE"})
    assert res1.status_code == 403

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

    with client.session_transaction() as sess:
        sess["user"] = s_id

    res1 = client.post(f"/api/parents/disconnect/{s_id}")
    assert res1.status_code == 403

    with client.session_transaction() as sess:
        sess["user"] = p_id

    res2 = client.post("/api/parents/disconnect/99999")
    assert res2.status_code == 404


def test_get_student_history(client, app):
    from datetime import datetime

    from application.models.duck_transaction import DuckTransaction
    from application.models.note import Note
    from tests.factories import (
        AchievementFactory,
        ChallengeLogFactory,
        DuckTradeLogFactory,
        ProjectFactory,
        UserAchievementFactory,
    )

    with app.app_context():
        parent = UserFactory(role="parent")
        child = UserFactory(role="student", duck_balance=100.0)
        parent.children.append(child)
        stranger = UserFactory(role="student")
        db.session.commit()

        tx = DuckTransaction(user_id=child.id, amount=10.0, timestamp=datetime.utcnow())
        ChallengeLogFactory(user_id=child.id, domain="python", challenge_slug="vars-1")
        ach = AchievementFactory(name="Explorer", type="ducks")
        UserAchievementFactory(user_id=child.id, achievement_id=ach.id)
        ProjectFactory(user_id=child.id, name="Art Project")
        note = Note(user_id=child.id, filename="hist_note.png", created_at=datetime.utcnow())

        db.session.add_all([tx, note])
        db.session.commit()

        p_id = parent.id
        c_id = child.id
        s_id = stranger.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    res = client.get(f"/api/parents/student/{c_id}/history")
    assert res.status_code == 200
    hist = res.get_json()["data"]
    assert hist["has_any_activity_ever"] is True
    assert len(hist["recent_events"]) >= 4

    res_unlinked = client.get(f"/api/parents/student/{s_id}/history")
    assert res_unlinked.status_code == 403

    with client.session_transaction() as sess:
        sess["user"] = c_id

    res_non_parent = client.get(f"/api/parents/student/{c_id}/history")
    assert res_non_parent.status_code == 403


def test_get_student_history_events_are_utc_marked_and_newest_first(client, app):
    from application.models.note import Note

    with app.app_context():
        parent = UserFactory(role="parent")
        child = UserFactory(role="student")
        parent.children.append(child)
        db.session.commit()
        # Same second, the later one with fractional seconds: ordered by time, not by priority
        earlier = utcnow_naive().replace(microsecond=0) - timedelta(minutes=1)
        later = earlier.replace(microsecond=500000)
        ProjectFactory(user_id=child.id, name="Earlier", created_at=earlier)
        db.session.add(Note(user_id=child.id, filename="later.png", created_at=later))
        db.session.commit()
        p_id, c_id = parent.id, child.id

    with client.session_transaction() as sess:
        sess["user"] = p_id

    events = client.get(f"/api/parents/student/{c_id}/history").get_json()["data"]["recent_events"]

    assert [e["type"] for e in events] == ["note", "project"]
    assert events[0]["timestamp"] == later.isoformat() + "Z"
    assert events[1]["timestamp"] == earlier.isoformat() + "Z"


def test_get_student_history_fmt_date_fallback(client, app):
    from application.routes.parent_routes import _fmt_date

    class DummyDT:
        def __str__(self):
            return "2026-08-02 12:00:00"

    assert _fmt_date(DummyDT()) == "2026-08-02"


def test_contact_teacher(client, app):
    from application.models.message import Message

    with app.app_context():
        UserFactory(role="admin")
        parent = UserFactory(role="parent", nickname="Parent One")
        child = UserFactory(role="student", nickname="Child One")
        parent.children.append(child)
        db.session.commit()

        p_id = parent.id
        c_id = child.id

    with client.session_transaction() as sess:
        sess["user"] = c_id
    res1 = client.post("/api/parents/contact-teacher", json={"body": "Hello"})
    assert res1.status_code == 403

    with client.session_transaction() as sess:
        sess["user"] = p_id
    res2 = client.post("/api/parents/contact-teacher", json={"body": "   "})
    assert res2.status_code == 400

    res3 = client.post("/api/parents/contact-teacher", json={"body": "a" * 2001})
    assert res3.status_code == 400

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


def test_observer_students_roster_search_filter_and_pagination(client, app):
    with app.app_context():
        observer = UserFactory(role="observer")
        student_a = UserFactory(username="alice_obs", nickname="Alice", role="student", active_track="cs")
        UserFactory(username="bob_obs", nickname="Bob", role="student", active_track="ozaria")
        parent = UserFactory(username="parent_obs", role="parent")
        db.session.commit()
        obs_id = observer.id
        sa_id = student_a.id
        p_id = parent.id

    # Non-observer/non-admin users are rejected
    for uid in (sa_id, p_id):
        with client.session_transaction() as sess:
            sess["user"] = uid
        assert client.get("/api/parents/students").status_code == 403

    with client.session_transaction() as sess:
        sess["user"] = obs_id

    # Full roster excludes non-students
    res = client.get("/api/parents/students?per_page=1&page=1")
    assert res.status_code == 200
    payload = res.get_json()["data"]
    assert payload["total"] == 2
    assert payload["pages"] == 2
    assert len(payload["students"]) == 1

    # Search by username/nickname
    res_search = client.get("/api/parents/students?search=alice")
    assert res_search.status_code == 200
    search_students = res_search.get_json()["data"]["students"]
    assert [s["username"] for s in search_students] == ["alice_obs"]

    # Filter by track
    res_track = client.get("/api/parents/students?track=ozaria")
    assert res_track.status_code == 200
    track_students = res_track.get_json()["data"]["students"]
    assert [s["username"] for s in track_students] == ["bob_obs"]

    # /api/parents/children also lists all students for observer
    res_children = client.get("/api/parents/children")
    assert res_children.status_code == 200
    child_usernames = {c["username"] for c in res_children.get_json()["data"]["children"]}
    assert child_usernames == {"alice_obs", "bob_obs"}


def test_observer_can_view_any_student_report_and_history_but_cannot_mutate(client, app):
    with app.app_context():
        observer = UserFactory(role="observer")
        student = UserFactory(username="unlinked_student", nickname="Unlinked", role="student", connection_code="OBS_CODE1")
        other_parent = UserFactory(username="other_parent_obs", role="parent")
        db.session.commit()
        obs_id = observer.id
        s_id = student.id
        op_id = other_parent.id

    with client.session_transaction() as sess:
        sess["user"] = obs_id

    # Read-only report & history work without linking
    report_res = client.get(f"/api/parents/student/{s_id}/report")
    assert report_res.status_code == 200
    report_data = report_res.get_json()["data"]
    assert report_data["username"] == "unlinked_student"
    assert report_data["slug"] is not None

    history_res = client.get(f"/api/parents/student/{s_id}/history")
    assert history_res.status_code == 200
    assert "recent_events" in history_res.get_json()["data"]

    # Observer cannot view non-student report
    assert client.get(f"/api/parents/student/{op_id}/report").status_code == 404

    # Parent mutations are forbidden for observers
    assert client.post("/api/parents/connect/code", json={"code": "OBS_CODE1"}).status_code == 403
    assert client.post(f"/api/parents/disconnect/{s_id}").status_code == 403
    assert client.post("/api/parents/contact-teacher", json={"body": "Hello"}).status_code == 403


