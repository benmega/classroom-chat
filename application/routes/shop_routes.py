# Name: shop_routes.py
# Type: Flask Blueprint
# Location: /routes/shop_routes.py
# Summary: Dynamic pricing and purchase endpoints using Flask session.
from collections import defaultdict

from flask import Blueprint, jsonify, request, session, render_template
from decimal import Decimal, ROUND_HALF_UP

from application.models.user import User
from application.extensions import db
from application.models.store_item import StoreItem, FulfillmentType
from application.models.user_item_purchase import UserItemPurchase

INCREASE_RATE = Decimal("0.10")
shop = Blueprint("shop", __name__)

def calculate_price(base_price: float, times_purchased: int) -> float:
    bp = Decimal(str(base_price))
    t = Decimal(times_purchased)
    raw = bp * (Decimal("1") + INCREASE_RATE * t)
    rounded = raw.quantize(Decimal("0.0"), rounding=ROUND_HALF_UP)
    return float(rounded)

@shop.route("/")
def shop_page():
    return render_template("shop.html")


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
)
        .all()
    )

    grouped_output = defaultdict(list)

    for item, record in rows:
        times = record.times_purchased if record else 0
        price = calculate_price(item.base_price, times)

        item_data = {
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "price": price,
            "times_purchased": times,
            "fulfillment_type": item.fulfillment_type.value  # Send type to frontend
        }

        # Add the item to the list corresponding to its type
        grouped_output[item.fulfillment_type.value].append(item_data)
    return jsonify(grouped_output)  # Return the grouped object

    # output = []
    # for item, record in rows:
    #     times = record.times_purchased if record else 0
    #     price = calculate_price(item.base_price, times)
    #     output.append({
    #         "id": item.id,
    #         "name": item.name,
    #         "description": item.description,
    #         "price": price,
    #         "times_purchased": times
    #     })
    #
    # return jsonify(output)


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
)
        db.session.add(record)

    price = calculate_price(item.base_price, record.times_purchased)

    # Check balance
    user = User.query.get_or_404(user_id)
    if user.duck_balance < price:
        return jsonify({"error": "insufficient ducks"}), 400

    # Stage all changes first, before the commit

    # 1. Deduct cost
    user.duck_balance -= price
    db.session.add(user)

    # 2. Increment purchase count
    record.times_purchased += 1
    db.session.add(record)

    # 3. Handle fulfillment
    fulfillment_status = "pending"  # Default

    try:
        if item.fulfillment_type == FulfillmentType.AUTOMATED:
            # Grant the perk immediately
            grant_automated_perk(user, item)  # This function will stage user changes
            fulfillment_status = "granted"

        elif item.fulfillment_type == FulfillmentType.PHYSICAL:
            # Flag for admin. This could create a new 'PendingOrder' row,
            # send an email, or post to a Discord webhook.
            # For now, we just print to the console.
            print(f"ADMIN_ACTION: User {user.id} purchased PHYSICAL item {item.name}.")
            fulfillment_status = "pending_admin"

        elif item.fulfillment_type == FulfillmentType.CUSTOM_INFO:
            # The user needs to provide more info.
            # We don't do anything here, but we'll return a special status
            # to tell the frontend to redirect.
            fulfillment_status = "needs_info"

        # 4. Commit all changes at once (money + fulfillment)
        db.session.commit()

    except Exception as e:
        # If fulfillment fails (e.g., grant_automated_perk),
        # roll back the *entire* transaction (user keeps their money)
        db.session.rollback()
        print(f"CRITICAL: Failed to fulfill purchase for user {user.id}, item {item.id}. Error: {e}")
        return jsonify({"error": "Fulfillment failed. You have not been charged."}), 500

    # Return a more useful response
    return jsonify({
        "status": "ok",
        "item": item.name,
        "price_paid": price,
        "fulfillment_status": fulfillment_status,
        "fulfillment_type": item.fulfillment_type.value  # e.g., "CUSTOM_INFO"
    })

def grant_automated_perk(user: User, item: StoreItem):
    """
    Applies automated perks to the user's profile.
    This function *stages* changes to the db.session.
    The caller is responsible for the commit.
    """
    # You'll need to add a way to identify items, e.g., a 'key' column
    # For now, we'll just use the name
    if item.name == 'Chat Font':
        user.has_custom_font = True # Assumes User model has this column
        db.session.add(user)
    elif item.name == 'Custom Wallpaper':
        user.has_custom_wallpaper = True # Assumes User model has this column
        db.session.add(user)
    else:
        # This is bad! It's marked AUTOMATED but has no logic.
        raise Exception(f"No automated fulfillment logic for item: {item.name}")

# You would also add a new route for the custom print page
@shop.route("/provide-info/<int:item_id>")
def provide_info(item_id):
    # This page would show a form for the user to submit
    # info for their custom print.
    item = StoreItem.query.get_or_404(item_id)
    return render_template("provide_info.html", item=item)