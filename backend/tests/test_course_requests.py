from application.models.course_instance_request import CourseInstanceRequest
from application.models.course_instance import CourseInstance

def test_submit_request_unauthenticated(client):
    response = client.post("/api/course-requests/submit", json={
        "course_instance_id": "test_instance_1",
        "url": "http://test.url"
    })
    assert response.status_code == 401


def test_submit_request_authenticated(logged_in_client, sample_user):
    response = logged_in_client.post("/api/course-requests/submit", json={
        "course_instance_id": "test_instance_1",
        "requested_course_id": "course_1",
        "url": "http://test.url/level1"
    })
    assert response.status_code == 201
    data = response.json
    assert data["success"] is True

    # Check database
    req = CourseInstanceRequest.query.filter_by(course_instance_id="test_instance_1").first()
    assert req is not None
    assert req.student_id == sample_user.id
    assert req.status == "pending"
    assert req.url == "http://test.url/level1"

    # Submitting again should return 200 indicating it's already pending
    response2 = logged_in_client.post("/api/course-requests/submit", json={
        "course_instance_id": "test_instance_1",
        "url": "http://test.url/level2"
    })
    assert response2.status_code == 200
    assert "already pending" in response2.json["message"]


def test_get_pending_requests_non_admin(logged_in_client):
    response = logged_in_client.get("/api/course-requests/pending")
    assert response.status_code == 403


def test_get_pending_requests_admin(logged_in_admin, init_db, sample_user):
    # Create a pending request
    req = CourseInstanceRequest(
        student_id=sample_user.id,
        course_instance_id="test_instance_2",
        url="http://test.url",
        status="pending"
    )
    init_db.session.add(req)
    init_db.session.commit()

    response = logged_in_admin.get("/api/course-requests/pending")
    assert response.status_code == 200
    data = response.json
    assert data["success"] is True
    assert len(data["requests"]) >= 1
    
    # Find the one we just made
    found = next((r for r in data["requests"] if r["course_instance_id"] == "test_instance_2"), None)
    assert found is not None
    assert found["student_username"] == sample_user.username


def test_approve_request(logged_in_admin, init_db, sample_user):
    req = CourseInstanceRequest(
        student_id=sample_user.id,
        course_instance_id="test_instance_approve",
        url="http://test.url",
        status="pending"
    )
    init_db.session.add(req)
    init_db.session.commit()

    response = logged_in_admin.post(f"/api/course-requests/{req.id}/approve", json={
        "classroom_id": "class_1",
        "course_id": "course_1"
    })
    assert response.status_code == 200
    assert response.json["success"] is True

    # Verify db status
    init_db.session.refresh(req)
    assert req.status == "approved"

    # Verify course instance was created
    instance = CourseInstance.query.get("test_instance_approve")
    assert instance is not None
    assert instance.classroom_id == "class_1"
    assert instance.course_id == "course_1"


def test_reject_request(logged_in_admin, init_db, sample_user):
    req = CourseInstanceRequest(
        student_id=sample_user.id,
        course_instance_id="test_instance_reject",
        url="http://test.url",
        status="pending"
    )
    init_db.session.add(req)
    init_db.session.commit()

    response = logged_in_admin.post(f"/api/course-requests/{req.id}/reject")
    assert response.status_code == 200
    assert response.json["success"] is True

    # Verify db status
    init_db.session.refresh(req)
    assert req.status == "rejected"
