
def login_as_admin(client, admin_user):
    with client.session_transaction() as sess:
        sess["_user_id"] = str(admin_user.id)
        sess["_fresh"] = True
        sess["user"] = admin_user.id

def test_admin_config_routes(client, sample_admin, init_db):
    login_as_admin(client, sample_admin)

    # 1. Toggle AI
    resp = client.post("/api/admin/toggle-ai")
    assert resp.status_code == 200
    assert resp.json["success"] is True

    # 2. Toggle message sending
    resp = client.post("/api/admin/toggle-message-sending")
    assert resp.status_code == 200
    assert resp.json["success"] is True

    # 3. Update duck multiplier
    # Success
    resp = client.post("/api/admin/update_duck_multiplier", json={"multiplier": 2.5})
    assert resp.status_code == 200
    assert resp.json["success"] is True
    assert resp.json["new_multiplier"] == 2.5

    # Missing multiplier
    resp = client.post("/api/admin/update_duck_multiplier", json={})
    assert resp.status_code == 400

    # Invalid multiplier value
    resp = client.post("/api/admin/update_duck_multiplier", json={"multiplier": "invalid"})
    assert resp.status_code == 400

    # 4. Add banned word
    # Success
    resp = client.post("/api/admin/add-banned-word", data={"word": "badword", "reason": "offensive"})
    assert resp.status_code == 200
    assert resp.json["success"] is True

    # Duplicate banned word
    resp = client.post("/api/admin/add-banned-word", data={"word": "badword"})
    assert resp.status_code == 400

    # Empty word
    resp = client.post("/api/admin/add-banned-word", data={})
    assert resp.status_code == 400
