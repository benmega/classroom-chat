import re
from flask import request, jsonify
from application.extensions import db
from application.models.user import User
from application.decorators.api_response import api_response
from application.decorators.admin_required import admin_only

from flask import current_app
from ..admin_routes import admin_bp


@admin_bp.route("/pending_users", methods=["GET"])
@admin_only
@api_response
def pending_users():
    from application.models.challenge_log import ChallengeLog
    from sqlalchemy import func

    pending = User.query.filter_by(is_approved=False, is_admin=False).all()
    usernames = [u.username for u in pending]

    counts = (
        db.session.query(
            ChallengeLog.username, ChallengeLog.domain, func.count(ChallengeLog.id)
        )
        .filter(ChallengeLog.username.in_(usernames))
        .group_by(ChallengeLog.username, ChallengeLog.domain)
        .all()
    )

    precomputed = {(username, domain): count for username, domain, count in counts}

    return {"users": [u.to_dict_summary(precomputed) for u in pending]}


@admin_bp.route("/approve_user/<int:user_id>", methods=["POST"])
@admin_only
@api_response
def approve_user(user_id):
    user_obj = db.get_or_404(User, user_id)
    user_obj.is_approved = True
    db.session.commit()
    return {"message": f"User {user_obj.username} approved successfully."}


@admin_bp.route("/reject_user/<int:user_id>", methods=["POST"])
@admin_only
@api_response
def reject_user(user_id):
    user_obj = db.get_or_404(User, user_id)
    username = user_obj.username
    db.session.delete(user_obj)
    db.session.commit()
    return {"message": f"User {username} rejected and removed."}


@admin_bp.route("/users", methods=["GET"])
@admin_only
def get_users():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)

    from application.models.challenge_log import ChallengeLog
    from sqlalchemy import func

    pagination = User.query.paginate(page=page, per_page=per_page, error_out=False)
    users = pagination.items
    usernames = [u.username for u in users]

    counts = (
        db.session.query(
            ChallengeLog.username, ChallengeLog.domain, func.count(ChallengeLog.id)
        )
        .filter(ChallengeLog.username.in_(usernames))
        .group_by(ChallengeLog.username, ChallengeLog.domain)
        .all()
    )

    precomputed = {(username, domain): count for username, domain, count in counts}

    user_data = []
    for u in users:
        d = u.to_dict_summary(precomputed)
        # Defensive pop redundant but kept for safety with existing patterns
        for field in ["password_hash", "salt", "ip_address"]:
            d.pop(field, None)
        user_data.append(d)

    return jsonify(
        {
            "users": user_data,
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": pagination.page,
            "per_page": per_page,
        }
    )


@admin_bp.route("/reset_password", methods=["POST"])
@admin_only
def reset_password():
    data = request.json
    username = data.get("username")
    new_password = data.get("new_password")

    if not username or not new_password:
        return (
            jsonify(
                {"success": False, "message": "Username and new password required"}
            ),
            400,
        )

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    user.set_password(new_password)
    db.session.commit()
    return jsonify({"success": True, "message": f"Password reset for {username}"})


@admin_bp.route("/create_user", methods=["POST"])
@admin_only
def create_user():
    username = request.form.get("username", "").strip().lower()
    password = request.form.get("password", "")
    ducks = request.form.get("ducks", type=int)

    if not username or not password or ducks is None or ducks < 0:
        return (
            jsonify(
                success=False,
                message="Username, password, and non-negative ducks required",
            ),
            400,
        )

    if not re.fullmatch(r"[a-z0-9_]{3,30}", username):
        return (
            jsonify(
                success=False,
                message="Username must be 3-30 chars: lowercase letters, numbers, or underscores only",
            ),
            400,
        )

    if User.query.filter_by(username=username).first():
        return jsonify(success=False, message="Username already exists"), 409

    try:
        new_user = User(username=username)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.flush()  # Get user ID
        if ducks > 0:
            new_user.add_ducks(ducks, reason="Initial Balance")
        db.session.commit()
        return jsonify(
            success=True, message=f"User '{username}' created with {ducks} ducks"
        )
    except Exception:
        db.session.rollback()
        return jsonify(success=False, message="Internal server error"), 500


@admin_bp.route("/remove_user", methods=["POST"])
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
    except Exception:
        db.session.rollback()
        return jsonify(success=False, message="Internal server error"), 500


@admin_bp.route("/adjust_ducks", methods=["POST"])
@admin_only
def adjust_ducks():
    username = request.form.get("username")
    amount = request.form.get("amount", type=float)

    if not username or amount is None:
        return (
            jsonify({"success": False, "message": "Username and amount required"}),
            400,
        )

    user = User.query.filter_by(username=username).first()
    if user:
        user.add_ducks(amount, reason="Admin Adjustment")
        db.session.commit()
        return jsonify(
            {"success": True, "message": f"Updated {username}'s ducks by {amount}."}
        )
    else:
        return (
            jsonify({"success": False, "message": f"User '{username}' not found."}),
            404,
        )


@admin_bp.route("/set_username", methods=["POST"])
@admin_only
def set_username_route():
    user_id = request.form.get("user_id")
    username = request.form.get("username")

    if not user_id or not username:
        return jsonify({"success": False, "message": "Missing arguments"}), 400

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    user.username = username.lower()
    db.session.commit()
    return jsonify({"success": True, "message": "Username set successfully"})


@admin_bp.route("/verify_password", methods=["POST"])
@admin_only
def verify_password():
    password = request.form.get("password")
    username = request.form.get("username")
    user_id = request.form.get("user_id")

    # testing patch is done against application.routes.admin_routes.admin_pass by test framework
    # so we should use current_app for normal usage but support testing
    try:
        from application.routes.admin_routes import admin_pass

        app_admin_pass = admin_pass
    except ImportError:
        app_admin_pass = current_app.config.get("ADMIN_PASSWORD", "duckduck")

    if password == app_admin_pass:
        if user_id and username:
            user = db.session.get(User, user_id)
            if user:
                user.username = username.lower()
                db.session.commit()
        return jsonify({"success": True})
    else:
        return jsonify({"success": False}), 401


@admin_bp.route("/parents/<int:parent_id>/children", methods=["GET"])
@admin_only
def get_parent_children(parent_id):
    parent = db.session.get(User, parent_id)
    if not parent or parent.role != "parent":
        return jsonify({"success": False, "message": "Parent not found"}), 404
        
    children = [
        {
            "id": child.id,
            "username": child.username,
            "nickname": child.nickname,
            "profile_picture": child.profile_picture
        }
        for child in parent.children
    ]
    return jsonify({"success": True, "children": children})


@admin_bp.route("/parents/<int:parent_id>/link/<int:student_id>", methods=["POST"])
@admin_only
def link_parent_child(parent_id, student_id):
    parent = db.session.get(User, parent_id)
    student = db.session.get(User, student_id)
    
    if not parent or parent.role != "parent":
        return jsonify({"success": False, "message": "Parent not found"}), 404
    if not student or student.role != "student":
        return jsonify({"success": False, "message": "Student not found"}), 404
        
    if student not in parent.children:
        parent.children.append(student)
        db.session.commit()
        return jsonify({"success": True, "message": f"Linked {student.username} to {parent.username}"})
    return jsonify({"success": True, "message": "Already linked"})


@admin_bp.route("/parents/<int:parent_id>/unlink/<int:student_id>", methods=["POST"])
@admin_only
def unlink_parent_child(parent_id, student_id):
    parent = db.session.get(User, parent_id)
    student = db.session.get(User, student_id)
    
    if not parent or parent.role != "parent":
        return jsonify({"success": False, "message": "Parent not found"}), 404
    if not student or student.role != "student":
        return jsonify({"success": False, "message": "Student not found"}), 404
        
    if student in parent.children:
        parent.children.remove(student)
        db.session.commit()
        return jsonify({"success": True, "message": f"Unlinked {student.username} from {parent.username}"})
    return jsonify({"success": True, "message": "Not linked"})
