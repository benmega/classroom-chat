from application.extensions import db
from application.models.user import User
from application.models.challenge_log import ChallengeLog
from application.models.classroom import Classroom

def login_as_admin(client, admin_user):
    with client.session_transaction() as sess:
        sess["_user_id"] = str(admin_user.id)
        sess["_fresh"] = True
        sess["user"] = admin_user.id

def test_pending_users(client, sample_admin, init_db):
    login_as_admin(client, sample_admin)

    # Create a pending user
    pending_user = User(username="pendingstudent", is_approved=False, role="student", password_hash="dummy")
    db.session.add(pending_user)
    db.session.commit()

    # Create challenge log for pending user
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

    u1 = User(username="approvestudent", is_approved=False, role="student", password_hash="dummy")
    u2 = User(username="rejectstudent", is_approved=False, role="student", password_hash="dummy")
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

    assert getattr(sample_user, 'can_chat', True) is True

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

    # Success
    resp = client.post("/api/admin/reset_password", json={
        "username": sample_user.username,
        "new_password": "newsecurepassword123"
    })
    assert resp.status_code == 200
    assert resp.get_json()["success"] is True

    # Trying to reset another admin's password should fail
    other_admin = User(username="otheradmin", is_admin=True, password_hash="dummy")
    db.session.add(other_admin)
    db.session.commit()

    resp = client.post("/api/admin/reset_password", json={
        "username": "otheradmin",
        "new_password": "password"
    })
    assert resp.status_code == 403
    assert resp.get_json()["success"] is False

    # User not found
    resp = client.post("/api/admin/reset_password", json={
        "username": "nonexistentuser",
        "new_password": "password"
    })
    assert resp.status_code == 404

    # Missing arguments
    resp = client.post("/api/admin/reset_password", json={})
    assert resp.status_code == 400

def test_create_user(client, sample_admin, init_db):
    login_as_admin(client, sample_admin)

    # Success with ducks
    resp = client.post("/api/admin/create_user", data={
        "username": "newstudent",
        "password": "password123",
        "ducks": 5
    })
    assert resp.status_code == 200
    assert resp.get_json()["success"] is True

    u = User.query.filter_by(username="newstudent").first()
    assert u is not None
    assert u.duck_balance == 5

    # Invalid username format
    resp = client.post("/api/admin/create_user", data={
        "username": "new student!", # invalid characters
        "password": "password",
        "ducks": 0
    })
    assert resp.status_code == 400

    # Duplicate username
    resp = client.post("/api/admin/create_user", data={
        "username": "newstudent",
        "password": "password",
        "ducks": 0
    })
    assert resp.status_code == 409

    # Missing fields
    resp = client.post("/api/admin/create_user", data={})
    assert resp.status_code == 400

def test_remove_user(client, sample_admin, sample_user):
    login_as_admin(client, sample_admin)

    # Success
    resp = client.post("/api/admin/remove_user", data={"username": sample_user.username})
    assert resp.status_code == 200
    assert resp.get_json()["success"] is True
    assert User.query.filter_by(username=sample_user.username).first() is None

    # Cannot remove admin
    other_admin = User(username="otheradmin2", is_admin=True, password_hash="dummy")
    db.session.add(other_admin)
    db.session.commit()

    resp = client.post("/api/admin/remove_user", data={"username": "otheradmin2"})
    assert resp.status_code == 403

    # Not found
    resp = client.post("/api/admin/remove_user", data={"username": "notfounduser"})
    assert resp.status_code == 404

    # Missing username
    resp = client.post("/api/admin/remove_user", data={})
    assert resp.status_code == 400

def test_adjust_ducks(client, sample_admin, sample_user):
    login_as_admin(client, sample_admin)

    sample_user.duck_balance = 10
    db.session.commit()

    # Success
    resp = client.post("/api/admin/adjust_ducks", data={
        "username": sample_user.username,
        "amount": 15
    })
    assert resp.status_code == 200
    assert sample_user.duck_balance == 25

    # User not found
    resp = client.post("/api/admin/adjust_ducks", data={
        "username": "notfound",
        "amount": 10
    })
    assert resp.status_code == 404

    # Missing args
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

    # Get parent's children
    resp = client.get(f"/api/admin/parents/{parent.id}/children")
    assert resp.status_code == 200
    assert len(resp.get_json()["children"]) == 1
    assert resp.get_json()["children"][0]["username"] == "childuser"

    # Unlink
    resp = client.post(f"/api/admin/parents/{parent.id}/unlink/{child.id}")
    assert resp.status_code == 200
    assert child not in parent.children

    # Parent not found
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

    # Student not found
    resp = client.get("/api/admin/user/9999/connection_card")
    assert resp.status_code == 404

def test_classrooms_and_connection_cards(client, sample_admin, sample_user, init_db):
    login_as_admin(client, sample_admin)

    classroom = Classroom(id="class_101", name="Class 101", language="Python", url="http://example.com")
    classroom.users.append(sample_user)
    db.session.add(classroom)
    db.session.commit()

    # List classrooms
    resp = client.get("/api/admin/classrooms")
    assert resp.status_code == 200
    assert len(resp.get_json()["data"]["classrooms"]) == 1

    # Classroom cards list
    resp = client.get(f"/api/admin/classrooms/{classroom.id}/connection_cards")
    assert resp.status_code == 200
    assert len(resp.get_json()["data"]["cards"]) == 1

    # All cards list
    resp = client.get("/api/admin/classrooms/all/connection_cards")
    assert resp.status_code == 200
    
    # Classroom not found
    resp = client.get("/api/admin/classrooms/nonexistent/connection_cards")
    assert resp.status_code == 404

def test_set_drawer(client, sample_admin, sample_user, init_db):
    login_as_admin(client, sample_admin)
    sample_user.role = "student"
    db.session.commit()

    # Success assigning 0x05
    resp = client.post("/api/admin/set_drawer", json={
        "username": sample_user.username,
        "drawer": "0x05"
    })
    assert resp.status_code == 200
    assert sample_user.drawer == "0x05"

    # Success assigning without 0x prefix
    resp = client.post("/api/admin/set_drawer", json={
        "username": sample_user.username,
        "drawer": "06"
    })
    assert resp.status_code == 200
    assert sample_user.drawer == "0x06"

    # Out of range drawer
    resp = client.post("/api/admin/set_drawer", json={
        "username": sample_user.username,
        "drawer": "0x40"
    })
    assert resp.status_code == 400

    # Conflict assigning drawer to another user
    other_student = User(username="otherstudent", role="student", password_hash="dummy")
    db.session.add(other_student)
    db.session.commit()

    resp = client.post("/api/admin/set_drawer", json={
        "username": other_student.username,
        "drawer": "0x06"
    })
    assert resp.status_code == 409

    # Reassign using force=True
    resp = client.post("/api/admin/set_drawer", json={
        "username": other_student.username,
        "drawer": "0x06",
        "force": True
    })
    assert resp.status_code == 200
    assert other_student.drawer == "0x06"
    assert sample_user.drawer is None

    # Clear drawer
    resp = client.post("/api/admin/set_drawer", json={
        "username": other_student.username,
        "drawer": ""
    })
    assert resp.status_code == 200
    assert other_student.drawer is None
