import os
from application.extensions import db
from application.models.challenge import Challenge

def login_as_admin(client, admin_user):
    with client.session_transaction() as sess:
        sess["_user_id"] = str(admin_user.id)
        sess["_fresh"] = True
        sess["user"] = admin_user.id

# ============================================================================
# CRUD ROUTES TESTS (crud_routes.py)
# ============================================================================

def test_crud_schema(client, sample_admin):
    login_as_admin(client, sample_admin)
    
    # Valid resource
    resp = client.get("/api/admin/crud/schema/challenge")
    assert resp.status_code == 200
    assert resp.json["resource"] == "challenge"
    assert len(resp.json["fields"]) > 0

    # Invalid resource
    resp = client.get("/api/admin/crud/schema/nonexistent")
    assert resp.status_code == 404

def test_crud_list_and_one(client, sample_admin):
    login_as_admin(client, sample_admin)

    # List challenges
    resp = client.get("/api/admin/crud/challenge")
    assert resp.status_code == 200
    assert "data" in resp.json
    assert "total" in resp.json

    # Try listing invalid resource
    resp = client.get("/api/admin/crud/nonexistent")
    assert resp.status_code == 404

    # Get one challenge
    # Create a challenge first
    c = Challenge(name="Test Chall", slug="test-chall", domain="domain", difficulty="easy", value=5)
    db.session.add(c)
    db.session.commit()

    resp = client.get(f"/api/admin/crud/challenge/{c.id}")
    assert resp.status_code == 200
    assert resp.json["data"]["name"] == "Test Chall"

    # Get one nonexistent
    resp = client.get("/api/admin/crud/challenge/99999")
    assert resp.status_code == 404

def test_crud_create_update_delete(client, sample_admin):
    login_as_admin(client, sample_admin)

    # Create challenge
    resp = client.post("/api/admin/crud/challenge", json={
        "name": "New Chall",
        "slug": "new-chall",
        "domain": "test-domain",
        "difficulty": "hard",
        "value": 15
    })
    assert resp.status_code == 200
    assert resp.json["data"]["name"] == "New Chall"
    new_id = resp.json["data"]["id"]

    # Update challenge
    resp = client.put(f"/api/admin/crud/challenge/{new_id}", json={
        "name": "Updated Chall Name"
    })
    assert resp.status_code == 200
    assert resp.json["data"]["name"] == "Updated Chall Name"

    # Delete challenge
    resp = client.delete(f"/api/admin/crud/challenge/{new_id}")
    assert resp.status_code == 200
    assert resp.json["data"]["id"] == str(new_id)

    # Get deleted
    resp = client.get(f"/api/admin/crud/challenge/{new_id}")
    assert resp.status_code == 404

# ============================================================================
# CHALLENGE MGMT TESTS (challenge_mgmt.py)
# ============================================================================

def test_bulk_add_challenges(client, sample_admin):
    login_as_admin(client, sample_admin)

    # Empty payload
    resp = client.post("/api/admin/challenges/bulk_add", json={})
    assert resp.status_code == 400

    # Missing course_id/domain
    resp = client.post("/api/admin/challenges/bulk_add", json={"challenges": [{"name": "A", "slug": "a"}]})
    assert resp.status_code == 400

    # Empty challenges set
    resp = client.post("/api/admin/challenges/bulk_add", json={"course_id": "1", "domain": "domain", "challenges": []})
    assert resp.status_code == 400

    # Success payload with skips
    resp = client.post("/api/admin/challenges/bulk_add", json={
        "course_id": "CS1",
        "domain": "domain",
        "challenges": [
            {"name": "Bulk 1", "slug": "bulk-1"},
            {"name": "Bulk 2", "slug": "bulk-2"},
            {"name": "Invalid"} # missing slug, should be skipped
        ]
    })
    assert resp.status_code == 200
    # The response is wrapped by api_response decorator!
    data = resp.json["data"]
    assert data["added"] == 2
    assert data["skipped"] == 1

# ============================================================================
# DOCUMENT ROUTES TESTS (doc_routes.py)
# ============================================================================

def test_document_routes(client, sample_admin, test_app):
    login_as_admin(client, sample_admin)

    # 1. Create a dummy file in the UPLOAD_FOLDER
    upload_dir = test_app.config["UPLOAD_FOLDER"]
    category_dir = os.path.join(upload_dir, "other")
    os.makedirs(category_dir, exist_ok=True)
    test_file = os.path.join(category_dir, "test_doc.txt")
    with open(test_file, "w") as f:
        f.write("Hello World doc test")

    try:
        # 2. List documents
        resp = client.get("/api/admin/documents")
        assert resp.status_code == 200
        docs = resp.json["data"]["documents"]
        assert any(d["filename"] == "test_doc.txt" for d in docs)

        # 3. View document
        # Invalid category
        resp = client.get("/api/admin/documents/invalid_cat/test_doc.txt/view")
        assert resp.status_code == 400
        # Not found
        resp = client.get("/api/admin/documents/other/nonexistent.txt/view")
        assert resp.status_code == 404
        # Success view
        resp = client.get("/api/admin/documents/other/test_doc.txt/view")
        assert resp.status_code == 200
        assert resp.data == b"Hello World doc test"

        # 4. Download document
        # Invalid category
        resp = client.get("/api/admin/documents/invalid_cat/test_doc.txt/download")
        assert resp.status_code == 400
        # Not found
        resp = client.get("/api/admin/documents/other/nonexistent.txt/download")
        assert resp.status_code == 404
        # Success download
        resp = client.get("/api/admin/documents/other/test_doc.txt/download")
        assert resp.status_code == 200
        assert resp.headers.get("Content-Disposition") is not None

        # 5. Delete document
        # Empty fields
        resp = client.post("/api/admin/delete-document", data={})
        assert resp.status_code == 400
        # Invalid category
        resp = client.post("/api/admin/delete-document", data={"category": "invalid_cat", "filename": "test_doc.txt"})
        assert resp.status_code == 400
        # Not found
        resp = client.post("/api/admin/delete-document", data={"category": "other", "filename": "nonexistent.txt"})
        assert resp.status_code == 404
        # Success delete
        resp = client.post("/api/admin/delete-document", data={"category": "other", "filename": "test_doc.txt"})
        assert resp.status_code == 200
        assert resp.json["data"]["success"] is True
        assert not os.path.exists(test_file)

    finally:
        if os.path.exists(test_file):
            os.remove(test_file)

def test_advanced_ops(client, sample_admin):
    # Mock psutil
    import sys
    from unittest.mock import MagicMock
    mock_psutil = MagicMock()
    mock_psutil.Process.return_value.memory_info.return_value.rss = 100 * 1024 * 1024
    mock_psutil.Process.return_value.cpu_percent.return_value = 5.0
    mock_psutil.Process.return_value.create_time.return_value = 1000.0
    mock_psutil.time.time.return_value = 2000.0
    sys.modules['psutil'] = mock_psutil

    login_as_admin(client, sample_admin)

    # stats-extended
    resp = client.get("/api/admin/advanced/stats-extended")
    assert resp.status_code == 200
    assert "memory_usage_mb" in resp.json["data"]

    # purge-history
    resp = client.post("/api/admin/advanced/purge-history")
    assert resp.status_code == 200
    assert resp.json["data"]["deleted_messages"] >= 0

