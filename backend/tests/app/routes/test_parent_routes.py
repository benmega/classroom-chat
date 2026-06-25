from application.models.user import User
from application.extensions import db

def test_get_children_not_parent(client, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
    response = client.get("/api/parents/children")
    assert response.status_code == 403

def test_get_children_success(client, sample_user, init_db):
    sample_user.role = "parent"
    child = User(username="child1", password_hash="test", role="student", nickname="Child 1", slug="child-1")
    sample_user.children.append(child)
    db.session.add(child)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/api/parents/children")
    assert response.status_code == 200
    data = response.get_json()
    assert "children" in data["data"]
    assert len(data["data"]["children"]) == 1
    assert data["data"]["children"][0]["username"] == "child1"

def test_get_student_report_not_parent(client, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
    response = client.get("/api/parents/student/1/report")
    assert response.status_code == 403

def test_get_student_report_not_linked(client, sample_user, init_db):
    sample_user.role = "parent"
    other_child = User(username="other", password_hash="test", role="student")
    db.session.add(other_child)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get(f"/api/parents/student/{other_child.id}/report")
    assert response.status_code == 403

def test_get_student_report_success(client, sample_user, init_db, sample_achievement):
    sample_user.role = "parent"
    child = User(username="child1", password_hash="test", role="student", nickname="Child 1", profile_picture="test.jpg")
    
    from application.models.achievements import UserAchievement
    ua = UserAchievement(achievement=sample_achievement)
    child.achievements.append(ua)

    from application.models.project import Project
    proj = Project(name="Test Project", description="test", link="http", user_id=child.id)
    child.projects.append(proj)

    from application.models.note import Note
    note = Note(filename="test.txt", user_id=child.id)
    child.notes.append(note)
    
    sample_user.children.append(child)
    db.session.add(child)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get(f"/api/parents/student/{child.id}/report")
    assert response.status_code == 200
    data = response.get_json()
    assert data["data"]["username"] == "child1"
    assert len(data["data"]["unlocked_achievements"]) == 1
    assert len(data["data"]["projects"]) == 1
    assert len(data["data"]["notes"]) == 1
    assert data["data"]["profile_picture_url"] == "/user/profile_pictures/test.jpg"

def test_connect_via_code(client, sample_user, init_db):
    sample_user.role = "parent"
    child = User(username="child1", password_hash="test", role="student", connection_code="CODE123", nickname="Child 1")
    db.session.add(child)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # No code
    response = client.post("/api/parents/connect/code", json={})
    assert response.status_code == 400

    # Invalid code
    response = client.post("/api/parents/connect/code", json={"code": "INVALID"})
    assert response.status_code == 404

    # Valid code
    response = client.post("/api/parents/connect/code", json={"code": "CODE123"})
    assert response.status_code == 200
    assert "Successfully" in response.get_json().get("message", "Successfully")

    # Already linked
    response = client.post("/api/parents/connect/code", json={"code": "CODE123"})
    assert response.status_code == 400

def test_disconnect_student(client, sample_user, init_db):
    sample_user.role = "parent"
    child = User(username="child1", password_hash="test", role="student", nickname="Child 1")
    db.session.add(child)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # Not linked
    response = client.post(f"/api/parents/disconnect/{child.id}")
    assert response.status_code == 400

    # Link and disconnect
    sample_user.children.append(child)
    db.session.commit()
    response = client.post(f"/api/parents/disconnect/{child.id}")
    assert response.status_code == 200
    assert child not in sample_user.children
