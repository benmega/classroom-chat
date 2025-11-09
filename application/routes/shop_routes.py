# Name: shop_routes.py
# Type: Flask Blueprint
# Location: /routes/shop_routes.py
# Summary: Dynamic pricing and purchase endpoints using Flask session.

from flask import Blueprint, jsonify, request, session
from decimal import Decimal, ROUND_HALF_UP
from application.extensions import db
from application.models.store_item import StoreItem
from application.models.user_item_purchase import UserItemPurchase

INCREASE_RATE = Decimal("0.10")
shop = Blueprint("shop", __name__)

def calculate_price(base_price: float, times_purchased: int) -> float:
    bp = Decimal(str(base_price))
    t = Decimal(times_purchased)
    raw = bp * (Decimal("1") + INCREASE_RATE * t)
    rounded = raw.quantize(Decimal("0.0"), rounding=ROUND_HALF_UP)
    return float(rounded)

@shop.route("/items", methods=["GET"])
def list_items():
    user_id = session.get("user", None)
    if not user_id:
        return jsonify({"error": "not authenticated"}), 401

    rows = (
        db.session.query(StoreItem, UserItemPurchase)
        .outerjoin(
            UserItemPurchase,
            (UserItemPurchase.item_id == StoreItem.id)
            & (UserItemPurchase.user_id == user_id)
***REMOVED***
        .all()
    )

    output = []
    for item, record in rows:
        times = record.times_purchased if record else 0
        price = calculate_price(item.base_price, times)
        output.append({
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "price": price,
            "times_purchased": times
        })

    return jsonify(output)


@shop.route("/purchase/<int:item_id>", methods=["POST"])
def purchase_item(item_id):
    user_id = session.get("user", None)
    if not user_id:
        return jsonify({"error": "not authenticated"}), 401

    item = StoreItem.query.get_or_404(item_id)

    record = UserItemPurchase.query.filter_by(
        user_id=user_id,
        item_id=item_id
    ).first()

    if not record:
        record = UserItemPurchase(
            user_id=user_id,
            item_id=item_id,
            times_purchased=0
***REMOVED***
        db.session.add(record)

    price = calculate_price(item.base_price, record.times_purchased)

    #TODO: check user duck balance
    #TODO: deduct ducks

    record.times_purchased += 1
    db.session.commit()

    return jsonify({"status": "ok", "item": item.name, "price_paid": price})
