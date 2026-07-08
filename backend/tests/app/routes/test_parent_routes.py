from application.extensions import db
from application.models.user import User

def test_get_children_unauthenticated(client):
    response = client.get("/api/parents/children")
    assert response.status_code == 302 or response.status_code == 401 or response.status_code == 403

def test_get_children_non_parent(client, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
        sess["_user_id"] = str(sample_user.id)
    # Role is student/default, should get 403 denied
    response = client.get("/api/parents/children")
    assert response.status_code == 403

def test_parent_flow_success(client, init_db):
    # Create parent
    parent_user = User(username="parent_1", role="parent", is_approved=True)
    parent_user.set_password("pass123")
    # Create student
    student_user = User(username="student_1", role="student", nickname="Stu", connection_code="CONN123", is_approved=True)
    student_user.set_password("pass123")
    
    db.session.add_all([parent_user, student_user])
    db.session.commit()

    # Log in as parent
    with client.session_transaction() as sess:
        sess["user"] = parent_user.id
        sess["_user_id"] = str(parent_user.id)

    # 1. Check children (should be empty initially)
    resp = client.get("/api/parents/children")
    assert resp.status_code == 200
    assert resp.json["data"]["children"] == []

    # 2. Connect student via code
    # Empty code check
    resp = client.post("/api/parents/connect/code", json={})
    assert resp.status_code == 400

    # Invalid code
    resp = client.post("/api/parents/connect/code", json={"code": "INVALID"})
    assert resp.status_code == 404

    # Success code
    resp = client.post("/api/parents/connect/code", json={"code": "CONN123"})
    assert resp.status_code == 200
    assert resp.json["data"]["student"]["id"] == student_user.id

    # Try connecting again (already linked)
    resp = client.post("/api/parents/connect/code", json={"code": "CONN123"})
    assert resp.status_code == 400

    # 3. Check children list now
    resp = client.get("/api/parents/children")
    assert resp.status_code == 200
    assert len(resp.json["data"]["children"]) == 1
    assert resp.json["data"]["children"][0]["id"] == student_user.id

    # 4. Get student report
    # Try report for unlinked student
    resp = client.get("/api/parents/student/999/report")
    assert resp.status_code == 403

    # Try report for student linked
    resp = client.get(f"/api/parents/student/{student_user.id}/report")
    assert resp.status_code == 200
    assert resp.json["data"]["username"] == "student_1"

    # 5. Disconnect student
    # Disconnect non-existent student
    resp = client.post("/api/parents/disconnect/999")
    assert resp.status_code == 404

    # Disconnect student not linked (e.g. create another student and try to disconnect)
    student_2 = User(username="student_2", role="student", is_approved=True)
    student_2.set_password("pass123")
    db.session.add(student_2)
    db.session.commit()
    resp = client.post(f"/api/parents/disconnect/{student_2.id}")
    assert resp.status_code == 400

    # Disconnect successfully
    resp = client.post(f"/api/parents/disconnect/{student_user.id}")
    assert resp.status_code == 200

    # Verify disconnected
    resp = client.get("/api/parents/children")
    assert resp.json["data"]["children"] == []
