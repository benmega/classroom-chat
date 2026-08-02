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


def test_purchase_all_store_items(client, init_db):
    user = User(username="rich_shopper", packets=10000.0, is_approved=True)
    user.set_password("pass123")
    db.session.add(user)

    items_to_create = [
        ("Animated Profile Border", 10.0),
        ("Auto Bitshift", 10.0),
        ("Custom Profile Wallpaper", 10.0),
        ("Auto Challenge Claimer", 10.0),
        ("Permanent Double Duck", 10.0),
    ]
    for name, price in items_to_create:
        if not StoreItem.query.filter_by(name=name).first():
            db.session.add(StoreItem(name=name, description="Test item", base_price=price))
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = user.id
        sess["_user_id"] = str(user.id)

    item_flag_map = {
        "Animated Profile Border": "has_animated_border",
        "Auto Bitshift": "has_auto_bitshift",
        "Custom Profile Wallpaper": "has_custom_wallpaper",
        "Auto Challenge Claimer": "has_auto_claimer",
        "Permanent Double Duck": "has_double_duck",
    }

    for item_name, attr in item_flag_map.items():
        item = StoreItem.query.filter_by(name=item_name).first()
        assert item is not None
        resp = client.post(f"/api/shop/purchase/{item.id}")
        assert resp.status_code == 200
        db.session.refresh(user)
        assert getattr(user, attr) is True


def test_configure_perk_wallpaper_and_animated_border(client, init_db):
    user = User(username="perk_configurator", packets=100.0, is_approved=True)
    user.set_password("pass1234")
    db.session.add(user)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = user.id
        sess["_user_id"] = str(user.id)

    # 0. Chat Font Color unowned -> 403
    resp_font = client.put(
        "/api/shop/configure", json={"perk_name": "chat_font_color", "value": "#ff0000"}
    )
    assert resp_font.status_code == 403

    # 1. Profile Wallpaper unowned -> 403
    resp = client.put(
        "/api/shop/configure", json={"perk_name": "profile_wallpaper", "value": "my_bg.jpg"}
    )
    assert resp.status_code == 403

    # Grant profile wallpaper perk
    user.has_custom_wallpaper = True
    db.session.commit()

    # Profile Wallpaper owned -> 200
    resp = client.put(
        "/api/shop/configure", json={"perk_name": "profile_wallpaper", "value": "my_bg.jpg"}
    )
    assert resp.status_code == 200
    db.session.refresh(user)
    assert user.profile_wallpaper == "my_bg.jpg"

    # 2. Animated border speed unowned -> 403
    resp = client.put(
        "/api/shop/configure", json={"perk_name": "animated_border_speed", "value": "fast"}
    )
    assert resp.status_code == 403

    # Grant animated border perk
    user.has_animated_border = True
    db.session.commit()

    # Invalid speed value -> 400
    resp = client.put(
        "/api/shop/configure", json={"perk_name": "animated_border_speed", "value": "hyper"}
    )
    assert resp.status_code == 400

    # Valid speed value -> 200
    resp = client.put(
        "/api/shop/configure", json={"perk_name": "animated_border_speed", "value": "fast"}
    )
    assert resp.status_code == 200
    db.session.refresh(user)
    assert user.animated_border_speed == "fast"

