from application.extensions import db
from application.models.challenge_log import ChallengeLog
from application.models.classroom import Classroom
from application.models.user import User


def login_as_admin(client, admin_user):
    with client.session_transaction() as sess:
        sess["_user_id"] = str(admin_user.id)
        sess["_fresh"] = True
        sess["user"] = admin_user.id


def test_pending_users(client, sample_admin, init_db):
    login_as_admin(client, sample_admin)

    pending_user = User(
        username="pendingstudent",
        is_approved=False,
        role="student",
        password_hash="dummy",
    )
    db.session.add(pending_user)
    db.session.commit()

    cl = ChallengeLog(user_id=pending_user.id, domain="python", challenge_slug="slug1")
    db.session.add(cl)
    db.session.commit()

    response = client.get("/api/admin/pending_users")
    assert response.status_code == 200
    data = response.get_json()
    assert "users" in data["data"]
    usernames = [u["username"] for u in data["data"]["users"]]
    assert "pendingstudent" in usernames


def test_approve_and_reject_user(client, sample_admin, init_db):
    login_as_admin(client, sample_admin)

    u1 = User(
        username="approvestudent",
        is_approved=False,
        role="student",
        password_hash="dummy",
    )
    u2 = User(
        username="rejectstudent",
        is_approved=False,
        role="student",
        password_hash="dummy",
    )
    db.session.add_all([u1, u2])
    db.session.commit()

    # Approve
    resp = client.post(f"/api/admin/approve_user/{u1.id}")
    assert resp.status_code == 200
    assert u1.is_approved is True

    # Reject
    resp = client.post(f"/api/admin/reject_user/{u2.id}")
    assert resp.status_code == 200
    assert User.query.filter_by(username="rejectstudent").first() is None


def test_toggle_user_chat(client, sample_admin, sample_user):
    login_as_admin(client, sample_admin)

    assert getattr(sample_user, "can_chat", True) is True

    # Toggle to False
    resp = client.post(f"/api/admin/user/{sample_user.id}/toggle-chat")
    assert resp.status_code == 200
    assert resp.get_json()["data"]["can_chat"] is False

    # Toggle to True
    resp = client.post(f"/api/admin/user/{sample_user.id}/toggle-chat")
    assert resp.status_code == 200
    assert resp.get_json()["data"]["can_chat"] is True


def test_get_users_pagination_and_search(client, sample_admin, sample_user):
    login_as_admin(client, sample_admin)

    # Search by username
    resp = client.get(f"/api/admin/users?search={sample_user.username}")
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["users"]) == 1
    assert data["users"][0]["username"] == sample_user.username

    # Search with no results
    resp = client.get("/api/admin/users?search=nonexistent_search_query")
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["users"]) == 0


def test_reset_password(client, sample_admin, sample_user):
    login_as_admin(client, sample_admin)

    resp = client.post(
        "/api/admin/reset_password",
        json={"username": sample_user.username, "new_password": "newsecurepassword123"},
    )
    assert resp.status_code == 200
    assert resp.get_json()["success"] is True

    # Trying to reset another admin's password should fail
    other_admin = User(username="otheradmin", role="admin", password_hash="dummy")
    db.session.add(other_admin)
    db.session.commit()

    resp = client.post(
        "/api/admin/reset_password",
        json={"username": "otheradmin", "new_password": "password"},
    )
    assert resp.status_code == 403
    assert resp.get_json()["success"] is False

    resp = client.post(
        "/api/admin/reset_password",
        json={"username": "nonexistentuser", "new_password": "password"},
    )
    assert resp.status_code == 404

    resp = client.post("/api/admin/reset_password", json={})
    assert resp.status_code == 400


def test_create_user(client, sample_admin, init_db):
    login_as_admin(client, sample_admin)

    resp = client.post(
        "/api/admin/create_user",
        data={"username": "newstudent", "password": "password123", "ducks": 5},
    )
    assert resp.status_code == 200
    assert resp.get_json()["success"] is True

    u = User.query.filter_by(username="newstudent").first()
    assert u is not None
    assert u.duck_balance == 5

    resp = client.post(
        "/api/admin/create_user",
        data={
            "username": "new student!",  # invalid characters
            "password": "password",
            "ducks": 0,
        },
    )
    assert resp.status_code == 400

    # Duplicate username
    resp = client.post(
        "/api/admin/create_user",
        data={"username": "newstudent", "password": "password", "ducks": 0},
    )
    assert resp.status_code == 409

    resp = client.post("/api/admin/create_user", data={})
    assert resp.status_code == 400


def test_remove_user(client, sample_admin, sample_user):
    login_as_admin(client, sample_admin)

    resp = client.post(
        "/api/admin/remove_user", data={"username": sample_user.username}
    )
    assert resp.status_code == 200
    assert resp.get_json()["success"] is True
    assert User.query.filter_by(username=sample_user.username).first() is None

    # Cannot remove admin
    other_admin = User(username="otheradmin2", role="admin", password_hash="dummy")
    db.session.add(other_admin)
    db.session.commit()

    resp = client.post("/api/admin/remove_user", data={"username": "otheradmin2"})
    assert resp.status_code == 403

    resp = client.post("/api/admin/remove_user", data={"username": "notfounduser"})
    assert resp.status_code == 404

    resp = client.post("/api/admin/remove_user", data={})
    assert resp.status_code == 400


def test_adjust_ducks(client, sample_admin, sample_user):
    login_as_admin(client, sample_admin)

    sample_user.duck_balance = 10
    db.session.commit()

    resp = client.post(
        "/api/admin/adjust_ducks", data={"username": sample_user.username, "amount": 15}
    )
    assert resp.status_code == 200
    assert sample_user.duck_balance == 25

    resp = client.post(
        "/api/admin/adjust_ducks", data={"username": "notfound", "amount": 10}
    )
    assert resp.status_code == 404

    resp = client.post("/api/admin/adjust_ducks", data={})
    assert resp.status_code == 400


def test_parent_linking(client, sample_admin, init_db):
    login_as_admin(client, sample_admin)

    parent = User(username="parentuser", role="parent", password_hash="dummy")
    child = User(username="childuser", role="student", password_hash="dummy")
    db.session.add_all([parent, child])
    db.session.commit()

    # Link parent and child
    resp = client.post(f"/api/admin/parents/{parent.id}/link/{child.id}")
    assert resp.status_code == 200
    assert child in parent.children

    resp = client.get(f"/api/admin/parents/{parent.id}/children")
    assert resp.status_code == 200
    assert len(resp.get_json()["children"]) == 1
    assert resp.get_json()["children"][0]["username"] == "childuser"

    # Unlink
    resp = client.post(f"/api/admin/parents/{parent.id}/unlink/{child.id}")
    assert resp.status_code == 200
    assert child not in parent.children

    resp = client.get("/api/admin/parents/9999/children")
    assert resp.status_code == 404

    resp = client.post(f"/api/admin/parents/9999/link/{child.id}")
    assert resp.status_code == 404

    resp = client.post(f"/api/admin/parents/9999/unlink/{child.id}")
    assert resp.status_code == 404


def test_connection_card(client, sample_admin, sample_user):
    login_as_admin(client, sample_admin)

    resp = client.get(f"/api/admin/user/{sample_user.id}/connection_card")
    assert resp.status_code == 200
    assert "connection_code" in resp.get_json()["data"]

    resp = client.get("/api/admin/user/9999/connection_card")
    assert resp.status_code == 404


def test_classrooms_and_connection_cards(client, sample_admin, sample_user, init_db):
    login_as_admin(client, sample_admin)

    classroom = Classroom(id="class_101", name="Class 101", language="Python")
    classroom.users.append(sample_user)
    db.session.add(classroom)
    db.session.commit()

    # List classrooms
    resp = client.get("/api/admin/classrooms")
    assert resp.status_code == 200
    classrooms = resp.get_json()["data"]["classrooms"]
    assert any(c["id"] == "class_101" for c in classrooms)

    # Classroom cards list
    resp = client.get(f"/api/admin/classrooms/{classroom.id}/connection_cards")
    assert resp.status_code == 200
    assert len(resp.get_json()["data"]["cards"]) == 1

    # All cards list
    resp = client.get("/api/admin/classrooms/all/connection_cards")
    assert resp.status_code == 200

    resp = client.get("/api/admin/classrooms/nonexistent/connection_cards")
    assert resp.status_code == 404


def test_set_drawer(client, sample_admin, sample_user, init_db):
    login_as_admin(client, sample_admin)
    sample_user.role = "student"
    db.session.commit()

    resp = client.post(
        "/api/admin/set_drawer",
        json={"username": sample_user.username, "drawer": "0x05"},
    )
    assert resp.status_code == 200
    assert sample_user.drawer == "0x05"

    resp = client.post(
        "/api/admin/set_drawer", json={"username": sample_user.username, "drawer": "06"}
    )
    assert resp.status_code == 200
    assert sample_user.drawer == "0x06"

    # Out of range drawer
    resp = client.post(
        "/api/admin/set_drawer",
        json={"username": sample_user.username, "drawer": "0x40"},
    )
    assert resp.status_code == 400

    # Conflict assigning drawer to another user
    other_student = User(username="otherstudent", role="student", password_hash="dummy")
    db.session.add(other_student)
    db.session.commit()

    resp = client.post(
        "/api/admin/set_drawer",
        json={"username": other_student.username, "drawer": "0x06"},
    )
    assert resp.status_code == 409

    # Reassign using force=True
    resp = client.post(
        "/api/admin/set_drawer",
        json={"username": other_student.username, "drawer": "0x06", "force": True},
    )
    assert resp.status_code == 200
    assert other_student.drawer == "0x06"
    assert sample_user.drawer is None

    # Clear drawer
    resp = client.post(
        "/api/admin/set_drawer", json={"username": other_student.username, "drawer": ""}
    )
    assert resp.status_code == 200
    assert other_student.drawer is None


def test_classroom_detail_management(client, sample_admin, init_db):
    login_as_admin(client, sample_admin)

    c = Classroom(id="testclass", name="Test Classroom", language="Python")
    db.session.add(c)
    db.session.commit()

    student = User(
        username="testclassroomstudent", role="student", password_hash="dummy"
    )
    db.session.add(student)
    db.session.commit()

    resp = client.get(f"/api/admin/classrooms/{c.id}")
    assert resp.status_code == 200
    data = resp.get_json()["classroom"]
    assert data["name"] == "Test Classroom"
    assert len(data["students"]) == 0

    resp = client.put(
        f"/api/admin/classrooms/{c.id}",
        json={"name": "Updated Classroom Name", "language": "Scratch"},
    )
    assert resp.status_code == 200
    assert c.name == "Updated Classroom Name"
    assert c.language == "Scratch"

    # Enroll student
    resp = client.post(
        f"/api/admin/classrooms/{c.id}/enroll", json={"student_id": student.id}
    )
    assert resp.status_code == 200
    assert student in c.users

    resp = client.get(f"/api/admin/classrooms/{c.id}")
    assert resp.status_code == 200
    data = resp.get_json()["classroom"]
    assert len(data["students"]) == 1
    assert data["students"][0]["username"] == "testclassroomstudent"

    # Unenroll student
    resp = client.post(
        f"/api/admin/classrooms/{c.id}/unenroll", json={"student_id": student.id}
    )
    assert resp.status_code == 200
    assert student not in c.users

    # Re-enroll student before delete to test deletion with students
    resp = client.post(
        f"/api/admin/classrooms/{c.id}/enroll", json={"student_id": student.id}
    )
    assert resp.status_code == 200

    resp = client.delete(f"/api/admin/classrooms/{c.id}")
    assert resp.status_code == 200
    assert db.session.get(Classroom, "testclass") is None

    # Ensure student still exists and is unlinked
    student_after_delete = db.session.get(User, student.id)
    assert student_after_delete is not None
    assert len(student_after_delete.classrooms) == 0


def test_pass_chapter_preview_and_pass_chapter(
    client, sample_admin, sample_user, init_db
):
    from application.models.achievements import Achievement
    from application.models.challenge import Challenge
    from application.models.user_certificate import UserCertificate

    login_as_admin(client, sample_admin)

    course_db_id = "560f1a9f22961295f9427742"
    c1 = Challenge(
        name="Challenge 1",
        slug="ch-1",
        domain="codecombat.com",
        course_id=course_db_id,
        value=5,
    )
    c2 = Challenge(
        name="Challenge 2",
        slug="ch-2",
        domain="codecombat.com",
        course_id=course_db_id,
        value=10,
    )
    db.session.add_all([c1, c2])

    ach = Achievement(
        name="CS1 Certificate", slug=course_db_id, type="certificate", reward=0
    )
    db.session.add(ach)
    db.session.commit()

    # Call preview with frontend ID "cs-1"
    resp = client.post(
        f"/api/admin/user/{sample_user.id}/pass_chapter_preview",
        json={"course_id": "cs-1"},
    )
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["success"] is True
    assert data["preview"]["challenges_to_complete"] == 2
    assert data["preview"]["ducks_to_award"] == 15
    assert "CS1 Certificate" in data["preview"]["certificates_to_award"]

    # Call pass chapter with frontend ID "cs-1"
    resp = client.post(
        f"/api/admin/user/{sample_user.id}/pass_chapter", json={"course_id": "cs-1"}
    )
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["success"] is True
    assert "Successfully passed" in data["message"]

    assert sample_user.challenge_logs.count() == 2
    cert = UserCertificate.query.filter_by(
        user_id=sample_user.id, achievement_id=ach.id
    ).first()
    assert cert is not None


def test_student_activity_and_get_users_roles(client, sample_admin, sample_user):
    login_as_admin(client, sample_admin)

    # student_activity online
    resp = client.get("/api/admin/student_activity?is_online=true")
    assert resp.status_code == 200

    # get_users role filter
    resp2 = client.get("/api/admin/users?role=student")
    assert resp2.status_code == 200


def test_user_mgmt_error_branches(client, sample_admin, sample_user, init_db):
    login_as_admin(client, sample_admin)

    resp = client.post("/api/admin/set_username", data={})
    assert resp.status_code == 400  # Missing arguments

    resp = client.post(
        "/api/admin/set_username",
        data={"user_id": sample_user.id, "username": "Inval!d"},
    )
    assert resp.status_code == 400  # Invalid regex

    resp = client.post(
        "/api/admin/set_username", data={"user_id": 99999, "username": "validname"}
    )
    assert resp.status_code == 404  # Not found

    # We test IntegrityError via verify_password later or set_username by mock

    from application.config import TestingConfig

    resp = client.post(
        "/api/admin/verify_password",
        data={
            "password": TestingConfig.ADMIN_PASSWORD,
            "username": "Inval!d",
            "user_id": sample_user.id,
        },
    )
    assert resp.status_code == 400  # Invalid format

    parent = User(username="parent_error", role="parent", password_hash="dummy")
    db.session.add(parent)
    db.session.commit()

    resp = client.post(f"/api/admin/parents/{parent.id}/link/99999")
    assert resp.status_code == 404  # Student not found

    resp = client.post(f"/api/admin/parents/{parent.id}/link/{sample_user.id}")
    assert resp.status_code == 200
    # Already linked
    resp = client.post(f"/api/admin/parents/{parent.id}/link/{sample_user.id}")
    assert resp.status_code == 200
    assert "Already linked" in resp.get_json()["message"]

    resp = client.post(f"/api/admin/parents/{parent.id}/unlink/99999")
    assert resp.status_code == 404

    resp = client.post(f"/api/admin/parents/{parent.id}/unlink/{sample_user.id}")
    assert resp.status_code == 200
    # Not linked
    resp = client.post(f"/api/admin/parents/{parent.id}/unlink/{sample_user.id}")
    assert resp.status_code == 200
    assert "Not linked" in resp.get_json()["message"]

    resp = client.get("/api/admin/students/99999/parents")
    assert resp.status_code == 404

    resp = client.post("/api/admin/set_drawer", json={})
    assert resp.status_code == 400  # Missing username

    resp = client.post("/api/admin/set_drawer", json={"username": "notfounduser"})
    assert resp.status_code == 404

    admin_user = User(username="draweradmin", role="admin", password_hash="dummy")
    db.session.add(admin_user)
    db.session.commit()

    resp = client.post(
        "/api/admin/set_drawer", json={"username": "draweradmin", "drawer": "0x01"}
    )
    assert resp.status_code == 403  # Not student

    resp = client.post(
        "/api/admin/set_drawer",
        json={"username": sample_user.username, "drawer": "invalid_hex"},
    )
    assert resp.status_code == 400

    resp = client.post(
        "/api/admin/set_drawer",
        json={"username": sample_user.username, "drawer": "0xXX"},
    )
    assert resp.status_code == 400

    resp = client.get("/api/admin/user/99999")
    assert resp.status_code == 404

    resp = client.get("/api/admin/classrooms/notfoundclass")
    assert resp.status_code == 404

    resp = client.put("/api/admin/classrooms/notfoundclass", json={})
    assert resp.status_code == 404

    resp = client.delete("/api/admin/classrooms/notfoundclass")
    assert resp.status_code == 404

    c = Classroom(id="errclass", name="errclass", language="python")
    db.session.add(c)
    db.session.commit()

    resp = client.post("/api/admin/classrooms/notfoundclass/enroll", json={})
    assert resp.status_code == 404
    resp = client.post(f"/api/admin/classrooms/{c.id}/enroll", json={})
    assert resp.status_code == 400
    resp = client.post(
        f"/api/admin/classrooms/{c.id}/enroll", json={"student_id": 99999}
    )
    assert resp.status_code == 404

    resp = client.post("/api/admin/classrooms/notfoundclass/unenroll", json={})
    assert resp.status_code == 404
    resp = client.post(f"/api/admin/classrooms/{c.id}/unenroll", json={})
    assert resp.status_code == 400
    resp = client.post(
        f"/api/admin/classrooms/{c.id}/unenroll", json={"student_id": 99999}
    )
    assert resp.status_code == 404

    resp = client.post(
        f"/api/admin/user/{sample_user.id}/pass_chapter_preview", json={}
    )
    assert resp.status_code == 400
    resp = client.post(
        f"/api/admin/user/{sample_user.id}/pass_chapter_preview",
        json={"course_id": "nonexistent_course"},
    )
    assert resp.status_code == 404

    # Exception mocking for create/remove user
    from unittest.mock import patch

    import sqlalchemy.exc

    with patch(
        "application.extensions.db.session.commit", side_effect=Exception("DB Error")
    ):
        resp = client.post(
            "/api/admin/create_user",
            data={"username": "erruser", "password": "abc", "ducks": 5},
        )
        assert resp.status_code == 500

        resp = client.post(
            "/api/admin/remove_user", data={"username": sample_user.username}
        )
        assert resp.status_code == 500

    # IntegrityError mocking for set_username
    with patch(
        "application.extensions.db.session.commit",
        side_effect=sqlalchemy.exc.IntegrityError("x", "y", "z"),
    ):
        resp = client.post(
            "/api/admin/set_username",
            data={"user_id": sample_user.id, "username": "takenname"},
        )
        assert resp.status_code == 409

        # also for verify_password
        from application.config import TestingConfig

        resp = client.post(
            "/api/admin/verify_password",
            data={
                "password": TestingConfig.ADMIN_PASSWORD,
                "username": "takenname",
                "user_id": sample_user.id,
            },
        )
        assert resp.status_code == 409


def test_update_user_details(client, sample_admin, sample_user):
    login_as_admin(client, sample_admin)

    # Update nickname, active_track, bio, role, and perk flags
    resp = client.put(
        f"/api/admin/user/{sample_user.id}",
        json={
            "nickname": "SuperStudent",
            "active_track": "gd",
            "bio": "Coding enthusiast",
            "has_chat_font": True,
            "has_animated_border": True,
        },
    )
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["user"]["nickname"] == "SuperStudent"
    assert data["user"]["active_track"] == "gd"
    assert data["user"]["bio"] == "Coding enthusiast"
    assert sample_user.nickname == "SuperStudent"
    assert sample_user.active_track == "gd"
    assert sample_user.has_chat_font is True
    assert sample_user.has_animated_border is True

    # Test username validation error
    resp_err = client.put(
        f"/api/admin/user/{sample_user.id}",
        json={
            "username": "a"  # invalid length
        },
    )
    assert resp_err.status_code == 400

    # Test not found
    resp_404 = client.put("/api/admin/user/999999", json={"nickname": "nobody"})
    assert resp_404.status_code == 404
