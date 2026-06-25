from application.models.store_item import StoreItem
from application.models.user_item_purchase import UserItemPurchase
from application.extensions import db

def test_get_store_items(client, sample_user, init_db):
    item1 = StoreItem(name="Test Item 1", description="desc", base_price=10.0, is_crowdfunded=False)
    item2 = StoreItem(name="Test Item 2", description="desc", base_price=20.0, is_crowdfunded=True, crowdfund_goal=100.0)
    db.session.add_all([item1, item2])
    db.session.commit()

    purchase = UserItemPurchase(user_id=sample_user.id, item_id=item1.id, times_purchased=1)
    db.session.add(purchase)
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get("/api/shop/items")
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 2
    for d in data:
        if d["id"] == item1.id:
            assert d["is_purchased"] is True
        elif d["id"] == item2.id:
            assert d["is_purchased"] is False

def test_purchase_item(client, sample_user, init_db):
    item1 = StoreItem(name="Chat Font Color", description="desc", base_price=10.0, is_crowdfunded=False)
    item2 = StoreItem(name="Crowdfunded", description="desc", base_price=10.0, is_crowdfunded=True)
    db.session.add_all([item1, item2])
    db.session.commit()

    sample_user.packets = 5.0
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # Item not found
    resp = client.post("/api/shop/purchase/999")
    assert resp.status_code == 404

    # Crowdfunded
    resp = client.post(f"/api/shop/purchase/{item2.id}")
    assert resp.status_code == 400

    # Not enough packets
    resp = client.post(f"/api/shop/purchase/{item1.id}")
    assert resp.status_code == 400

    # Success
    sample_user.packets = 20.0
    db.session.commit()
    resp = client.post(f"/api/shop/purchase/{item1.id}")
    assert resp.status_code == 200
    assert resp.get_json()["new_balance"] == 10.0
    
    # Already purchased
    resp = client.post(f"/api/shop/purchase/{item1.id}")
    assert resp.status_code == 400

def test_purchase_all_perks(client, sample_user, init_db):
    perks = [
        "Chat Font Color", "Animated Profile Border", "Auto Bitshift",
        "Custom Profile Wallpaper", "Auto Challenge Claimer", "Permanent Double Duck"
    ]
    sample_user.packets = 1000.0
    db.session.commit()

    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    for p in perks:
        item = StoreItem(name=p, description="desc", base_price=10.0, is_crowdfunded=False)
        db.session.add(item)
        db.session.commit()
        resp = client.post(f"/api/shop/purchase/{item.id}")
        assert resp.status_code == 200

    assert sample_user.has_chat_font
    assert sample_user.has_animated_border
    assert sample_user.has_auto_bitshift
    assert sample_user.has_custom_wallpaper
    assert sample_user.has_auto_claimer
    assert sample_user.has_double_duck

def test_configure_perk(client, sample_user, init_db):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    # Unknown perk
    resp = client.put("/api/shop/configure", json={"perk_name": "unknown"})
    assert resp.status_code == 400

    # chat_font_color not owned
    resp = client.put("/api/shop/configure", json={"perk_name": "chat_font_color", "value": "#fff"})
    assert resp.status_code == 403

    # chat_font_color invalid
    sample_user.has_chat_font = True
    db.session.commit()
    resp = client.put("/api/shop/configure", json={"perk_name": "chat_font_color", "value": "red"})
    assert resp.status_code == 400

    # chat_font_color success
    resp = client.put("/api/shop/configure", json={"perk_name": "chat_font_color", "value": "#ff0000"})
    assert resp.status_code == 200
    assert sample_user.chat_font_color == "#ff0000"

    # profile_wallpaper not owned
    resp = client.put("/api/shop/configure", json={"perk_name": "profile_wallpaper", "value": "url"})
    assert resp.status_code == 403

    # profile_wallpaper success
    sample_user.has_custom_wallpaper = True
    db.session.commit()
    resp = client.put("/api/shop/configure", json={"perk_name": "profile_wallpaper", "value": "url"})
    assert resp.status_code == 200
    assert sample_user.profile_wallpaper == "url"
