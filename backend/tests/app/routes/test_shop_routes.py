from application.extensions import db
from application.models.store_item import StoreItem
from application.models.user import User


def test_shop_routes_unauthenticated(client):
    resp = client.get("/api/shop/items")
    assert resp.status_code == 302 or resp.status_code == 401 or resp.status_code == 403


def test_shop_flow_success(client, init_db):
    # (they are already seeded by seed_global_data in conftest.py init_db fixture!)
    # Let's verify by querying them
    items = StoreItem.query.all()
    assert len(items) > 0

    test_user = User(username="shopper_1", packets=100.0, is_approved=True)
    test_user.set_password("pass123")
    db.session.add(test_user)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = test_user.id
        sess["_user_id"] = str(test_user.id)

    resp = client.get("/api/shop/items")
    assert resp.status_code == 200
    items_data = resp.json
    assert len(items_data) > 0

    # Let's find "Chat Font Color" item
    font_item = None
    for it in items_data:
        if it["name"] == "Chat Font Color":
            font_item = it
            break
    assert font_item is not None
    assert font_item["is_purchased"] is False

    resp = client.post("/api/shop/purchase/999")
    assert resp.status_code == 404

    resp = client.post(f"/api/shop/purchase/{font_item['id']}")
    assert resp.status_code == 200
    assert resp.json["message"] == "Purchase successful!"
    assert resp.json["new_balance"] < 100.0

    db.session.refresh(test_user)
    assert test_user.has_chat_font is True

    # Already purchased check
    resp = client.post(f"/api/shop/purchase/{font_item['id']}")
    assert resp.status_code == 400

    # Configure owned perk success
    resp = client.put(
        "/api/shop/configure", json={"perk_name": "chat_font_color", "value": "#ff0000"}
    )
    assert resp.status_code == 200
    db.session.refresh(test_user)
    assert test_user.chat_font_color == "#ff0000"

    # Configure owned perk invalid value
    resp = client.put(
        "/api/shop/configure", json={"perk_name": "chat_font_color", "value": "red"}
    )
    assert resp.status_code == 400

    # Configure unowned perk failure
    resp = client.put(
        "/api/shop/configure",
        json={"perk_name": "profile_wallpaper", "value": "bg.jpg"},
    )
    assert resp.status_code == 403

    # Unknown perk
    resp = client.put(
        "/api/shop/configure", json={"perk_name": "unknown", "value": "value"}
    )
    assert resp.status_code == 400


def test_purchase_not_enough_packets(client, init_db):
    test_user = User(username="poor_shopper", packets=0.0, is_approved=True)
    test_user.set_password("pass123")
    db.session.add(test_user)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = test_user.id
        sess["_user_id"] = str(test_user.id)

    item = StoreItem.query.first()
    assert item is not None

    resp = client.post(f"/api/shop/purchase/{item.id}")
    assert resp.status_code == 400
    assert "Not enough packets" in resp.json["message"]
