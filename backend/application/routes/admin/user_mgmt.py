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
    user_ids = [u.id for u in pending]

    counts = (
        db.session.query(
            ChallengeLog.user_id, ChallengeLog.domain, func.count(ChallengeLog.id)
        )
        .filter(ChallengeLog.user_id.in_(user_ids))
        .group_by(ChallengeLog.user_id, ChallengeLog.domain)
        .all()
    )

    id_to_username = {u.id: u._username for u in pending}
    precomputed = {(id_to_username[user_id], domain): count for user_id, domain, count in counts}

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


@admin_bp.route("/user/<int:user_id>/toggle-chat", methods=["POST"])
@admin_only
@api_response
def toggle_user_chat(user_id):
    user_obj = db.get_or_404(User, user_id)
    # Default is True, if not set it acts as True
    current_status = getattr(user_obj, 'can_chat', True)
    user_obj.can_chat = not current_status
    db.session.commit()
    
    status_str = "unmuted" if user_obj.can_chat else "muted"
    return {"message": f"User {user_obj.username} has been {status_str}.", "can_chat": user_obj.can_chat}


@admin_bp.route("/users", methods=["GET"])
@admin_only
def get_users():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)
    search = request.args.get("search", "", type=str)

    from application.models.challenge_log import ChallengeLog
    from sqlalchemy import func

    query = User.query
    if search:
        query = query.filter(db.or_(
            User._username.ilike(f"%{search}%"),
            User.nickname.ilike(f"%{search}%")
        ))

    online_count = query.filter(User.is_online.is_(True)).count()
    admin_count = query.filter(User.is_admin.is_(True)).count()
    pending_count = query.filter(User.is_approved.is_(False), User.is_admin.is_(False)).count()

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    users = pagination.items
    user_ids = [u.id for u in users]

    counts = (
        db.session.query(
            ChallengeLog.user_id, ChallengeLog.domain, func.count(ChallengeLog.id)
        )
        .filter(ChallengeLog.user_id.in_(user_ids))
        .group_by(ChallengeLog.user_id, ChallengeLog.domain)
        .all()
    )

    id_to_username = {u.id: u._username for u in users}
    precomputed = {(id_to_username[user_id], domain): count for user_id, domain, count in counts}

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
            "stats": {
                "online": online_count,
                "admins": admin_count,
                "pending": pending_count
            }
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

    if user.is_admin:
        return jsonify({"success": False, "message": "Cannot reset password of another admin"}), 403

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

    if user.is_admin:
        return jsonify(success=False, message="Cannot remove another admin"), 403

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
    user_id = request.form.get("user_id", type=int)
    username = request.form.get("username")

    if not user_id or not username:
        return jsonify({"success": False, "message": "Missing arguments"}), 400

    if not re.fullmatch(r"[a-z0-9_]{3,30}", username.lower()):
        return jsonify(success=False, message="Username must be 3-30 chars: lowercase letters, numbers, or underscores only"), 400

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    import sqlalchemy.exc
    try:
        user.username = username.lower()
        db.session.commit()
        return jsonify({"success": True, "message": "Username set successfully"})
    except sqlalchemy.exc.IntegrityError:
        db.session.rollback()
        return jsonify({"success": False, "message": "Username already exists"}), 409


@admin_bp.route("/verify_password", methods=["POST"])
@admin_only
def verify_password():
    password = request.form.get("password")
    username = request.form.get("username")
    user_id = request.form.get("user_id", type=int)

    # testing patch is done against application.routes.admin_routes.admin_pass by test framework
    # so we should use current_app for normal usage but support testing
    try:
        from application.routes.admin_routes import admin_pass

        app_admin_pass = admin_pass
    except ImportError:
        app_admin_pass = current_app.config.get("ADMIN_PASSWORD", "duckduck")

    if password == app_admin_pass:
        if user_id and username:
            if not re.fullmatch(r"[a-z0-9_]{3,30}", username.lower()):
                return jsonify({"success": False, "message": "Invalid username format"}), 400
                
            user = db.session.get(User, user_id)
            if user:
                import sqlalchemy.exc
                try:
                    user.username = username.lower()
                    db.session.commit()
                except sqlalchemy.exc.IntegrityError:
                    db.session.rollback()
                    return jsonify({"success": False, "message": "Username already exists"}), 409
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



@admin_bp.route("/user/<int:user_id>/connection_card", methods=["GET"])
@admin_only
@api_response
def get_connection_card(user_id):
    student = db.session.get(User, user_id)
    if not student:
        return "Student not found.", 404
    
    code = student.get_connection_code()
    return {"connection_code": code, "student_id": student.id, "username": student.username, "nickname": student.nickname}


@admin_bp.route("/classrooms", methods=["GET"])
@admin_only
@api_response
def get_classrooms_list():
    from application.models.classroom import Classroom
    classrooms = Classroom.query.order_by(Classroom.name).all()
    return {"classrooms": [c.to_dict() for c in classrooms]}


@admin_bp.route("/classrooms/<classroom_id>/connection_cards", methods=["GET"])
@admin_only
@api_response
def get_classroom_connection_cards(classroom_id):
    from application.models.classroom import Classroom
    
    if classroom_id == "all":
        students = User.query.filter_by(role="student").all()
        classroom_name = "All Students"
    else:
        classroom = db.session.get(Classroom, classroom_id)
        if not classroom:
            return "Classroom not found.", 404
        students = [u for u in classroom.users if u.role == "student"]
        classroom_name = classroom.name
    
    cards = []
    for student in students:
        code = student.get_connection_code()
        cards.append({
            "id": student.id,
            "username": student.username,
            "nickname": student.nickname,
            "connection_code": code
        })
    
    # Sort students by nickname or username for easier distribution
    cards.sort(key=lambda x: (x["nickname"] or x["username"]).lower())
    
    return {"classroom_name": classroom_name, "cards": cards}


@admin_bp.route("/set_drawer", methods=["POST"])
@admin_only
@api_response
def set_drawer():
    username = request.json.get("username")
    drawer = request.json.get("drawer")
    force = request.json.get("force", False)
    
    if not username:
        return "Username is required", 400
        
    user = User.query.filter_by(username=username).first()
    if not user:
        return "User not found", 404
        
    if user.role != "student":
        return "Drawers can only be assigned to students", 403
        
    if not drawer or str(drawer).strip() == "":
        user.drawer = None
    else:
        drawer = str(drawer).strip()
        
        # Be flexible: if they omitted 0x, we can add it (frontend does this now, but backend should too)
        if not drawer.lower().startswith("0x"):
            drawer = "0x" + drawer
            
        if not re.fullmatch(r"0[xX][0-9A-Fa-f]{1,2}", drawer):
            return "Drawer must be in hex format (e.g. 0xA6 or A6)", 400
            
        try:
            val = int(drawer, 16)
            if val < 0 or val > 35:
                return "Drawer number must be between 0 (0x00) and 35 (0x23)", 400
        except ValueError:
            return "Invalid hex drawer", 400
            
        # Standardize format to 0x uppercase hex
        drawer = f"0x{val:02X}"
        
        existing_user = User.query.filter_by(drawer=drawer).first()
        if existing_user and existing_user.id != user.id:
            if not force:
                return {"conflict": True, "message": f"Drawer {drawer} is already assigned to @{existing_user.username}.", "current_owner": existing_user.username}, 409
            else:
                existing_user.drawer = None
                
        user.drawer = drawer
        
    import sqlalchemy.exc
    try:
        db.session.commit()
        return {"message": f"Drawer updated for {username}"}
    except sqlalchemy.exc.IntegrityError:
        db.session.rollback()
        return "Drawer number is already assigned to another student", 409

