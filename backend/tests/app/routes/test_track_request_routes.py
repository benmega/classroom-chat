"""
File: test_track_request_routes.py
Type: py
Summary: Unit tests for track change request Flask routes.
"""

from application import db
from application.models.track_requests import TrackChangeRequest


def test_create_track_request_student(client, init_db, sample_user):
    """Test student successfully submits a track change request."""
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post(
        "/api/track-requests/",
        json={"requester_type": "student", "requested_track": "cs"},
    )
    assert response.status_code == 201
    assert response.get_json()["success"] is True

    # Assert request saved to DB
    req = TrackChangeRequest.query.filter_by(student_id=sample_user.id).first()
    assert req is not None
    assert req.requester_type == "student"
    assert req.requested_track == "cs"
    assert req.status == "pending"


def test_create_track_request_parent(client, init_db, sample_user, sample_users):
    """Test parent submits a track request for a linked child."""
    parent_user = sample_users[0]
    student_user = sample_users[1]

    # Link parent to child
    parent_user.role = "parent"
    student_user.role = "student"
    parent_user.children.append(student_user)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = parent_user.id

    response = client.post(
        "/api/track-requests/",
        json={
            "requester_type": "parent",
            "requested_track": "gd",
            "student_id": student_user.id,
        },
    )
    assert response.status_code == 201
    assert response.get_json()["success"] is True

    req = TrackChangeRequest.query.filter_by(student_id=student_user.id).first()
    assert req is not None
    assert req.requester_type == "parent"
    assert req.requested_track == "gd"


def test_create_track_request_parent_unlinked(
    client, init_db, sample_user, sample_users
):
    """Test parent cannot submit a request for an unlinked student."""
    parent_user = sample_users[0]
    student_user = sample_users[1]

    parent_user.role = "parent"
    student_user.role = "student"
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = parent_user.id

    response = client.post(
        "/api/track-requests/",
        json={
            "requester_type": "parent",
            "requested_track": "gd",
            "student_id": student_user.id,
        },
    )
    assert response.status_code == 403
    assert b"student is not linked to this parent" in response.data


def test_create_track_request_duplicate(client, init_db, sample_user):
    """Test that a student cannot have multiple pending requests."""
    req = TrackChangeRequest(
        student_id=sample_user.id,
        requester_type="student",
        requested_track="gd",
        status="pending",
    )
    db.session.add(req)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.post(
        "/api/track-requests/",
        json={"requester_type": "student", "requested_track": "cs"},
    )
    assert response.status_code == 400
    assert b"already pending" in response.data


def test_get_pending_requests_admin_only(client, init_db, sample_user, sample_admin):
    """Test only admins can retrieve pending track requests."""
    # Non-admin
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
    response = client.get("/api/admin/track-requests/")
    assert response.status_code == 403

    # Admin
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id
    response = client.get("/api/admin/track-requests/")
    assert response.status_code == 200
    assert "requests" in response.get_json()


def test_approve_track_request(client, init_db, sample_user, sample_admin):
    """Test admin approves a request and updates student's active track."""
    req = TrackChangeRequest(
        student_id=sample_user.id,
        requester_type="student",
        requested_track="wd",
        status="pending",
    )
    db.session.add(req)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    response = client.put(
        f"/api/admin/track-requests/{req.id}",
        json={"status": "approved"},
    )
    assert response.status_code == 200

    # Assert request status and student track updated
    db.session.refresh(req)
    db.session.refresh(sample_user)
    assert req.status == "approved"
    assert sample_user.active_track == "wd"


def test_deny_track_request(client, init_db, sample_user, sample_admin):
    """Test admin denies a request."""
    req = TrackChangeRequest(
        student_id=sample_user.id,
        requester_type="student",
        requested_track="cs",
        status="pending",
    )
    db.session.add(req)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    response = client.put(
        f"/api/admin/track-requests/{req.id}",
        json={"status": "denied"},
    )
    assert response.status_code == 200

    db.session.refresh(req)
    db.session.refresh(sample_user)
    assert req.status == "denied"
    assert sample_user.active_track == "cs"  # remains default
