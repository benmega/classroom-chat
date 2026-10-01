from unittest.mock import patch

import pytest
from application.extensions import db
from application.models.challenge_log import ChallengeLog
from application.models.classroom import Classroom
from application.models.duck_transaction import DuckTransaction
from application.models.user import User
from application.routes.admin.user_mgmt import (
    MAX_ADMIN_ADJUSTMENT,
    MAX_INITIAL_DUCKS,
)
from tests.factories import UserFactory


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


def test_reset_password_accepts_a_form_post(client, sample_admin, sample_user):
    login_as_admin(client, sample_admin)

    resp = client.post(
        "/api/admin/reset_password",
        data={"username": sample_user.username, "new_password": "formpassword123"},
    )

    assert resp.status_code == 200
    assert resp.get_json()["success"] is True
    assert db.session.get(User, sample_user.id).check_password("formpassword123")


@pytest.mark.parametrize(
    ("body", "content_type"),
    [
        ("null", "application/json"),
        ("[1, 2]", "application/json"),
        ("not json at all", "application/json"),
        ("plain text", "text/plain"),
        ("", None),
    ],
)
def test_reset_password_without_a_usable_body_is_a_400(
    client, sample_admin, body, content_type
):
    login_as_admin(client, sample_admin)

    resp = client.post(
        "/api/admin/reset_password", data=body, content_type=content_type
    )

    assert resp.status_code == 400
    assert resp.get_json() == {
        "success": False,
        "message": "Username and new password required",
    }


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


def test_create_user_rejects_initial_ducks_above_the_cap(
    client, sample_admin, init_db
):
    login_as_admin(client, sample_admin)

    for index, ducks in enumerate(
        [MAX_INITIAL_DUCKS + 1, 10**12, "9" * 400]
    ):
        resp = client.post(
            "/api/admin/create_user",
            data={"username": f"richkid{index}", "password": "password123", "ducks": ducks},
        )

        assert resp.status_code == 400
        assert resp.get_json() == {
            "success": False,
            "message": f"Initial ducks must be between 0 and {MAX_INITIAL_DUCKS}",
        }
        assert User.query.filter_by(username=f"richkid{index}").first() is None


def test_create_user_accepts_the_maximum_initial_ducks(client, sample_admin, init_db):
    login_as_admin(client, sample_admin)

    resp = client.post(
        "/api/admin/create_user",
        data={"username": "maxducks", "password": "password123", "ducks": MAX_INITIAL_DUCKS},
    )

    assert resp.status_code == 200
    created = User.query.filter_by(username="maxducks").one()
    assert created.duck_balance == MAX_INITIAL_DUCKS
    assert created.earned_ducks == MAX_INITIAL_DUCKS


def test_create_user_retries_when_generated_slug_collides(
    client, sample_admin, init_db, monkeypatch
):
    login_as_admin(client, sample_admin)
    UserFactory(_username="first_sam", nickname="Sam")  # slug "sam"
    real_generate_slug = User.generate_slug
    calls = []

    def racy_generate_slug(self):
        calls.append(1)
        if len(calls) == 1:
            self.slug = "sam"  # computed before the other creation committed
            return self.slug
        return real_generate_slug(self)

    monkeypatch.setattr(User, "generate_slug", racy_generate_slug)

    resp = client.post(
        "/api/admin/create_user",
        data={"username": "sam", "password": "password123", "ducks": 5},
    )

    assert resp.status_code == 200
    created = User.query.filter_by(username="sam").one()
    assert created.slug == "sam-1"
    assert created.duck_balance == 5


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


BAD_ADMIN_AMOUNTS = [
    "nan",
    "NaN",
    "inf",
    "-inf",
    "1e999",
    "1e308",
    "-1e308",
    str(MAX_ADMIN_ADJUSTMENT + 0.5),
    str(-MAX_ADMIN_ADJUSTMENT - 1),
]


@pytest.mark.parametrize("amount", BAD_ADMIN_AMOUNTS)
def test_adjust_ducks_rejects_non_finite_and_oversized_amounts(
    client, sample_admin, sample_user, amount
):
    login_as_admin(client, sample_admin)
    sample_user.duck_balance = 10
    sample_user.earned_ducks = 10
    db.session.commit()

    resp = client.post(
        "/api/admin/adjust_ducks", data={"username": sample_user.username, "amount": amount}
    )

    assert resp.status_code == 400
    assert resp.get_json()["success"] is False
    user = db.session.get(User, sample_user.id)
    assert (user.duck_balance, user.earned_ducks) == (10, 10)
    assert DuckTransaction.query.filter_by(user_id=user.id).count() == 0


def test_adjust_ducks_accepts_the_maximum_amount(client, sample_admin, sample_user):
    login_as_admin(client, sample_admin)

    resp = client.post(
        "/api/admin/adjust_ducks",
        data={"username": sample_user.username, "amount": MAX_ADMIN_ADJUSTMENT},
    )

    assert resp.status_code == 200
    assert db.session.get(User, sample_user.id).duck_balance == MAX_ADMIN_ADJUSTMENT


def test_adjust_ducks_failure_is_a_generic_500_and_rolls_back(
    client, sample_admin, sample_user
):
    login_as_admin(client, sample_admin)
    user_id = sample_user.id

    with patch.object(User, "add_ducks", side_effect=RuntimeError("secret detail")):
        resp = client.post(
            "/api/admin/adjust_ducks", data={"username": sample_user.username, "amount": 5}
        )

    assert resp.status_code == 500
    assert resp.get_json() == {"success": False, "message": "Internal server error"}
    assert db.session.get(User, user_id).duck_balance == 0


@pytest.mark.parametrize("amount", BAD_ADMIN_AMOUNTS)
def test_adjust_packets_rejects_non_finite_and_oversized_amounts(
    client, sample_admin, sample_user, amount
):
    login_as_admin(client, sample_admin)
    sample_user.packets = 3
    db.session.commit()

    resp = client.post(
        "/api/admin/adjust_packets",
        data={"username": sample_user.username, "amount": amount},
    )

    assert resp.status_code == 400
    assert resp.get_json()["success"] is False
    assert db.session.get(User, sample_user.id).packets == 3


def test_adjust_packets_accepts_a_valid_amount(client, sample_admin, sample_user):
    login_as_admin(client, sample_admin)
    sample_user.packets = 3
    db.session.commit()

    resp = client.post(
        "/api/admin/adjust_packets",
        data={"username": sample_user.username, "amount": MAX_ADMIN_ADJUSTMENT},
    )

    assert resp.status_code == 200
    assert db.session.get(User, sample_user.id).packets == 3 + MAX_ADMIN_ADJUSTMENT


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

    # The override credits ducks through add_ducks: balances and the log agree.
    db.session.refresh(sample_user)
    assert sample_user.duck_balance == 15
    assert sample_user.earned_ducks == 15
    tx = DuckTransaction.query.filter_by(user_id=sample_user.id).one()
    assert tx.amount == 15
    assert tx.reason == "Admin Pass Chapter Override for cs-1"


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


def test_update_user_details_rejects_taken_username(client, sample_admin, sample_user):
    login_as_admin(client, sample_admin)
    other = UserFactory()
    original = sample_user.username

    resp = client.put(
        f"/api/admin/user/{sample_user.id}", json={"username": other.username}
    )

    assert resp.status_code == 409
    assert db.session.get(User, sample_user.id).username == original


def test_set_drawer_conflict_keeps_its_fields_at_the_top_level(
    client, sample_admin, sample_user, init_db
):
    # The drawer-conflict dialog in the admin UI reads conflict/current_owner/message
    # straight off the response body
    login_as_admin(client, sample_admin)
    sample_user.role = "student"
    other_student = User(username="drawerrival", role="student", password_hash="dummy")
    db.session.add(other_student)
    db.session.commit()
    first = client.post(
        "/api/admin/set_drawer", json={"username": sample_user.username, "drawer": "0x09"}
    )
    assert first.status_code == 200

    resp = client.post(
        "/api/admin/set_drawer", json={"username": other_student.username, "drawer": "0x09"}
    )

    assert resp.status_code == 409
    body = resp.get_json()
    assert body["conflict"] is True
    assert body["current_owner"] == sample_user.username
    assert body["message"] == f"Drawer 0x09 is already assigned to @{sample_user.username}."
    # `error` stays a plain string for generic error handling
    assert body["error"] == body["message"]
    assert body["status"] == "error"
    assert body["data"] is None


def test_update_user_details_errors_are_plain_strings(client, sample_admin, sample_user):
    login_as_admin(client, sample_admin)

    missing = client.put("/api/admin/user/999999", json={"nickname": "nobody"})
    assert missing.status_code == 404
    assert missing.get_json()["error"] == "User not found"

    invalid = client.put(f"/api/admin/user/{sample_user.id}", json={"username": "a"})
    assert invalid.status_code == 400
    assert isinstance(invalid.get_json()["error"], str)
    assert "3-30 chars" in invalid.get_json()["error"]
