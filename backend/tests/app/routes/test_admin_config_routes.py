def login_as_admin(client, admin_user):
    with client.session_transaction() as sess:
        sess["_user_id"] = str(admin_user.id)
        sess["_fresh"] = True
        sess["user"] = admin_user.id


def test_admin_config_routes(client, sample_admin, init_db):
    login_as_admin(client, sample_admin)

    resp = client.post("/api/admin/toggle-message-sending")
    assert resp.status_code == 200
    assert resp.json["success"] is True

    resp = client.post("/api/admin/update_duck_multiplier", json={"multiplier": 2.5})
    assert resp.status_code == 200
    assert resp.json["success"] is True
    assert resp.json["new_multiplier"] == 2.5

    resp = client.post("/api/admin/update_duck_multiplier", json={})
    assert resp.status_code == 400

    resp = client.post(
        "/api/admin/update_duck_multiplier", json={"multiplier": "invalid"}
    )
    assert resp.status_code == 400

    resp = client.post(
        "/api/admin/add-banned-word", data={"word": "badword", "reason": "offensive"}
    )
    assert resp.status_code == 200
    assert resp.json["success"] is True

    # Duplicate banned word
    resp = client.post("/api/admin/add-banned-word", data={"word": "badword"})
    assert resp.status_code == 400

    # Empty word
    resp = client.post("/api/admin/add-banned-word", data={})
    assert resp.status_code == 400


def test_ai_teacher_routes_removed(test_app):
    """The AI teacher feature was removed: neither its admin toggle nor its
    chat endpoint is registered any more."""
    rules = [rule.rule for rule in test_app.url_map.iter_rules()]

    assert "/api/admin/toggle-ai" not in rules
    assert not any(rule.startswith("/ai/") for rule in rules)
