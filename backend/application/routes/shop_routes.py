from flask import Blueprint, jsonify, session
from application.decorators.login_required import require_login

from application.extensions import db
from application.models.store_item import StoreItem
from application.models.user_item_purchase import UserItemPurchase
from application.models.user import User

shop_bp = Blueprint("shop_routes", __name__)

@shop_bp.route("/items", methods=["GET"])
@require_login
def get_store_items():
    user_id = session.get("user")
    items = StoreItem.query.all()
    
    # Get user's purchases
    user_purchases = UserItemPurchase.query.filter_by(user_id=user_id).all()
    purchased_item_ids = [p.item_id for p in user_purchases]

    result = []
    for item in items:
        result.append({
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "base_price": item.base_price,
            "is_purchased": item.id in purchased_item_ids
        })
        
    return jsonify(result)

@shop_bp.route("/purchase/<int:item_id>", methods=["POST"])
@require_login
def purchase_item(item_id):
    user_id = session.get("user")
    current_user = db.session.get(User, user_id)

    item = db.session.get(StoreItem, item_id)
    if not item:
        return jsonify({"message": "Item not found"}), 404
        

    # Check if already purchased
    existing_purchase = UserItemPurchase.query.filter_by(user_id=user_id, item_id=item.id).first()
    if existing_purchase:
        return jsonify({"message": "You already own this item!"}), 400
        
    # Check balance using Decimal to avoid floating point errors
    from decimal import Decimal
    
    user_packets = Decimal(str(current_user.packets))
    item_price = Decimal(str(item.base_price))
    
    if user_packets < item_price:
        return jsonify({"message": "Not enough packets!"}), 400
        
    # Deduct balance
    new_packets = user_packets - item_price
    current_user.packets = float(new_packets)
    
    # Create purchase record
    purchase = UserItemPurchase(user_id=user_id, item_id=item.id, times_purchased=1)
    db.session.add(purchase)
    
    # Apply perks immediately
    if item.name == "Chat Font Color":
        current_user.has_chat_font = True
    elif item.name == "Animated Profile Border":
        current_user.has_animated_border = True
    elif item.name == "Auto Bitshift":
        current_user.has_auto_bitshift = True
    elif item.name == "Custom Profile Wallpaper":
        current_user.has_custom_wallpaper = True
    elif item.name == "Auto Challenge Claimer":
        current_user.has_auto_claimer = True
    elif item.name == "Permanent Double Duck":
        current_user.has_double_duck = True
        
    db.session.commit()
    
    return jsonify({
        "message": "Purchase successful!",
        "new_balance": current_user.packets,
        "user": current_user.to_dict_auth()
    })

@shop_bp.route("/configure", methods=["PUT"])
@require_login
def configure_perk():
    from flask import request
    
    user_id = session.get("user")
    current_user = db.session.get(User, user_id)
    
    data = request.json
    perk_name = data.get("perk_name")
    value = data.get("value")
    
    if perk_name == "chat_font_color":
        if not current_user.has_chat_font:
            return jsonify({"message": "You do not own this perk."}), 403
            
        # Basic hex color validation
        if not value or not value.startswith("#") or len(value) not in [4, 7]:
            return jsonify({"message": "Invalid color format."}), 400
            
        current_user.chat_font_color = value
        db.session.commit()
        
        return jsonify({
            "message": "Chat font color updated successfully!",
            "user": current_user.to_dict_auth()
        })
        
    elif perk_name == "profile_wallpaper":
        if not current_user.has_custom_wallpaper:
            return jsonify({"message": "You do not own this perk."}), 403
            
        current_user.profile_wallpaper = value
        db.session.commit()
        
        return jsonify({
            "message": "Profile wallpaper updated successfully!",
            "user": current_user.to_dict_auth()
        })
        
    elif perk_name == "animated_border_speed":
        if not current_user.has_animated_border:
            return jsonify({"message": "You do not own this perk."}), 403
            
        if value not in ["slow", "normal", "fast"]:
            return jsonify({"message": "Invalid speed value."}), 400
            
        current_user.animated_border_speed = value
        db.session.commit()
        
        return jsonify({
            "message": "Animated border speed updated successfully!",
            "user": current_user.to_dict_auth()
        })
        
    return jsonify({"message": "Unknown perk."}), 400
