import re
from flask import Blueprint, request, jsonify
from application.extensions import db
from application.models.user import User
from application.decorators.api_response import api_response
from application.decorators.admin_required import admin_only

user_mgmt_bp = Blueprint("admin_user_mgmt", __name__)

@user_mgmt_bp.route("/pending_users", methods=["GET"])
@admin_only
@api_response
def pending_users():
    pending = User.query.filter_by(is_approved=False, is_admin=False).all()
    return {"users": [u.to_dict_summary() for u in pending]}

@user_mgmt_bp.route("/approve_user/<int:user_id>", methods=["POST"])
@admin_only
@api_response
def approve_user(user_id):
    user_obj = User.query.get_or_404(user_id)
    user_obj.is_approved = True
    db.session.commit()
    return {"message": f"User {user_obj.username} approved successfully."}

@user_mgmt_bp.route("/reject_user/<int:user_id>", methods=["POST"])
@admin_only
@api_response
def reject_user(user_id):
    user_obj = User.query.get_or_404(user_id)
    username = user_obj.username
    db.session.delete(user_obj)
    db.session.commit()
    return {"message": f"User {username} rejected and removed."}

@user_mgmt_bp.route("/users", methods=["GET"])
@admin_only
def get_users():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    pagination = User.query.paginate(page=page, per_page=per_page, error_out=False)
    users = pagination.items
    
    user_data = []
    for u in users:
        d = u.to_dict_summary()
        # Defensive pop redundant but kept for safety with existing patterns
        for field in ['password_hash', 'salt', 'ip_address']:
            d.pop(field, None)
        user_data.append(d)
        
    return jsonify({
        "users": user_data,
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
        "per_page": per_page
    })

@user_mgmt_bp.route("/reset_password", methods=["POST"])
@admin_only
def reset_password():
    data = request.json
    username = data.get("username")
    new_password = data.get("new_password")

    if not username or not new_password:
        return jsonify({"success": False, "message": "Username and new password required"}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    user.set_password(new_password)
    db.session.commit()
    return jsonify({"success": True, "message": f"Password reset for {username}"})

@user_mgmt_bp.route("/create_user", methods=["POST"])
@admin_only
def create_user():
    username = request.form.get("username", "").strip().lower()
    password = request.form.get("password", "")
    ducks = request.form.get("ducks", type=int)

    if not username or not password or ducks is None or ducks < 0:
        return jsonify(success=False, message="Username, password, and non-negative ducks required"), 400

    if not re.fullmatch(r"[a-z0-9_]{3,30}", username):
        return jsonify(success=False, message="Username must be 3-30 chars: lowercase letters, numbers, or underscores only"), 400

    if User.query.filter_by(username=username).first():
        return jsonify(success=False, message="Username already exists"), 409

    try:
        new_user = User(username=username, duck_balance=ducks)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        return jsonify(success=True, message=f"User '{username}' created with {ducks} ducks")
    except Exception as e:
        db.session.rollback()
        return jsonify(success=False, message="Internal server error"), 500

@user_mgmt_bp.route("/remove_user", methods=["POST"])
@admin_only
def remove_user():
    username = request.form.get("username", "").strip().lower()
    if not username:
        return jsonify(success=False, message="Username is required"), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify(success=False, message="User not found"), 404

    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify(success=True, message=f"User '{username}' removed successfully")
    except Exception as e:
        db.session.rollback()
        return jsonify(success=False, message="Internal server error"), 500

@user_mgmt_bp.route("/adjust_ducks", methods=["POST"])
@admin_only
def adjust_ducks():
    username = request.form.get("username")
    amount = request.form.get("amount", type=float)

    if not username or amount is None:
        return jsonify({"success": False, "message": "Username and amount required"}), 400

    user = User.query.filter_by(username=username).first()
    if user:
        user.add_ducks(amount)
        db.session.commit()
        return jsonify({"success": True, "message": f"Updated {username}'s ducks by {amount}."})
    else:
        return jsonify({"success": False, "message": f"User '{username}' not found."}), 404
