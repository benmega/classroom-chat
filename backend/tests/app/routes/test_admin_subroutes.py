import pytest
from application.extensions import db
from application.models.challenge import Challenge


def login_as_admin(client, admin_user):
    with client.session_transaction() as sess:
        sess["_user_id"] = str(admin_user.id)
        sess["_fresh"] = True
        sess["user"] = admin_user.id


def test_crud_schema(client, sample_admin):
    login_as_admin(client, sample_admin)

    # Valid resource
    resp = client.get("/api/admin/crud/schema/challenge")
    assert resp.status_code == 200
    assert resp.json["resource"] == "challenge"
    assert len(resp.json["fields"]) > 0

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

    c = Challenge(
        name="Test Chall",
        slug="test-chall",
        domain="domain",
        difficulty="easy",
        value=5,
    )
    db.session.add(c)
    db.session.commit()

    resp = client.get(f"/api/admin/crud/challenge/{c.id}")
    assert resp.status_code == 200
    assert resp.json["data"]["name"] == "Test Chall"

    resp = client.get("/api/admin/crud/challenge/99999")
    assert resp.status_code == 404


def test_crud_create_update_delete(client, sample_admin):
    login_as_admin(client, sample_admin)

    resp = client.post(
        "/api/admin/crud/challenge",
        json={
            "name": "New Chall",
            "slug": "new-chall",
            "domain": "test-domain",
            "difficulty": "hard",
            "value": 15,
        },
    )
    assert resp.status_code == 200
    assert resp.json["data"]["name"] == "New Chall"
    new_id = resp.json["data"]["id"]

    resp = client.put(
        f"/api/admin/crud/challenge/{new_id}", json={"name": "Updated Chall Name"}
    )
    assert resp.status_code == 200
    assert resp.json["data"]["name"] == "Updated Chall Name"

    resp = client.delete(f"/api/admin/crud/challenge/{new_id}")
    assert resp.status_code == 200
    assert resp.json["data"]["id"] == str(new_id)

    resp = client.get(f"/api/admin/crud/challenge/{new_id}")
    assert resp.status_code == 404


def test_bulk_add_challenges(client, sample_admin):
    login_as_admin(client, sample_admin)

    # Empty payload
    resp = client.post("/api/admin/challenges/bulk_add", json={})
    assert resp.status_code == 400

    resp = client.post(
        "/api/admin/challenges/bulk_add",
        json={"challenges": [{"name": "A", "slug": "a"}]},
    )
    assert resp.status_code == 200
    assert resp.json["data"]["skipped"] == 1

    # Empty challenges set
    resp = client.post(
        "/api/admin/challenges/bulk_add",
        json={"course_id": "1", "domain": "domain", "challenges": []},
    )
    assert resp.status_code == 400

    resp = client.post(
        "/api/admin/challenges/bulk_add",
        json={
            "course_id": "CS1",
            "domain": "domain",
            "challenges": [
                {"name": "Bulk 1", "slug": "bulk-1"},
                {"name": "Bulk 2", "slug": "bulk-2"},
                {"name": "Invalid"},  # missing slug, should be skipped
            ],
        },
    )
    assert resp.status_code == 200
    # The response is wrapped by api_response decorator!
    data = resp.json["data"]
    assert data["added"] == 2
    assert data["skipped"] == 1


def test_advanced_ops(client, sample_admin, monkeypatch):
    import sys
    from unittest.mock import MagicMock

    mock_psutil = MagicMock()
    mock_psutil.Process.return_value.memory_info.return_value.rss = 100 * 1024 * 1024
    mock_psutil.Process.return_value.cpu_percent.return_value = 5.0
    mock_psutil.Process.return_value.create_time.return_value = 1000.0
    # Scoped to this test: a bare sys.modules assignment leaked the mock into the rest
    # of the session, so a psutil missing from requirements.txt was never noticed.
    monkeypatch.setitem(sys.modules, "psutil", mock_psutil)

    login_as_admin(client, sample_admin)

    # stats-extended
    resp = client.get("/api/admin/advanced/stats-extended")
    assert resp.status_code == 200
    assert resp.json["data"]["memory_usage_mb"] == 100.0
    assert resp.json["data"]["cpu_percent"] == 5.0

    # purge-history
    resp = client.post("/api/admin/advanced/purge-history")
    assert resp.status_code == 200
    assert resp.json["data"]["deleted_messages"] >= 0


def test_extended_stats_with_real_psutil(client, sample_admin):
    # psutil is a runtime requirement; skipped only where it is not installed yet.
    pytest.importorskip("psutil")
    login_as_admin(client, sample_admin)

    resp = client.get("/api/admin/advanced/stats-extended")

    assert resp.status_code == 200
    data = resp.json["data"]
    assert data["memory_usage_mb"] > 0
    assert data["cpu_percent"] >= 0
    assert data["uptime_seconds"] >= 0
    assert isinstance(data["table_counts"], dict)
