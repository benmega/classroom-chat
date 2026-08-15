import re

from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response
from application.extensions import db
from application.models.user import User
from flask import current_app, jsonify, request

from ..admin_routes import admin_bp


@admin_bp.route("/student_activity", methods=["GET"])
@admin_only
@api_response
def student_activity():
    is_online = request.args.get("is_online", "false").lower() == "true"

    query = User.query.filter_by(role="student")
    if is_online:
        query = query.filter_by(is_online=True)

    students = query.all()

    # We can use to_dict_summary or a custom lightweight dict
    # We don't precompute counts here to keep it fast for this specific view
    return {
        "students": [
            {
                "id": u.id,
                "username": u.username,
                "nickname": u.nickname,
                "profile_picture_url": (
                    f"/user/profile_pictures/{u.profile_picture}"
                    if u.profile_picture
                    else "/static/images/Default_pfp.jpg"
                ),
                "slug": u.slug,
                "is_online": u.is_online,
                "current_activity": u.current_activity,
                "last_activity_time": u.last_activity_time.isoformat()
                if u.last_activity_time
                else None,
            }
            for u in students
        ]
    }


@admin_bp.route("/pending_users", methods=["GET"])
@admin_only
@api_response
def pending_users():
    from application.models.challenge_log import ChallengeLog
    from sqlalchemy import func

    pending = User.query.filter_by(is_approved=False).filter(User.role != 'admin').all()
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
    precomputed = {
        (id_to_username[user_id], domain): count for user_id, domain, count in counts
    }

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
    # Treat NULL as True (chat enabled) — getattr fallback does NOT work on
    # SQLAlchemy columns because the attribute always exists (value is just None).
    current_status = user_obj.can_chat if user_obj.can_chat is not None else True
    user_obj.can_chat = not current_status
    db.session.commit()

    status_str = "unmuted" if user_obj.can_chat else "muted"
    return {
        "message": f"User {user_obj.username} has been {status_str}.",
        "can_chat": user_obj.can_chat,
    }


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
        query = query.filter(
            db.or_(
                User._username.ilike(f"%{search}%"), User.nickname.ilike(f"%{search}%")
            )
        )
    role = request.args.get("role", "", type=str)
    if role:
        query = query.filter_by(role=role)
    query = query.order_by(
        User.is_approved.asc(),
        User.last_activity_time.desc().nullslast(),
        User.id.desc(),
    )

    online_count = query.filter(User.is_online.is_(True)).count()
    admin_count = query.filter(User.role == 'admin').count()
    pending_count = query.filter(
        User.is_approved.is_(False), User.role != 'admin'
    ).count()

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
    precomputed = {
        (id_to_username[user_id], domain): count for user_id, domain, count in counts
    }

    # Fetch levels completed today (UTC day start to match log timestamps)
    from datetime import datetime, time

    today_start = datetime.combine(datetime.utcnow().date(), time.min)

    today_counts = (
        db.session.query(ChallengeLog.user_id, func.count(ChallengeLog.id))
        .filter(ChallengeLog.user_id.in_(user_ids))
        .filter(ChallengeLog.timestamp >= today_start)
        .group_by(ChallengeLog.user_id)
        .all()
    )
    levels_today_map = dict(today_counts)

    user_data = []
    for u in users:
        d = u.to_dict_summary(precomputed)
        d["levels_today"] = levels_today_map.get(u.id, 0)
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
                "pending": pending_count,
            },
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

    if user.role == 'admin':
        return jsonify(
            {"success": False, "message": "Cannot reset password of another admin"}
        ), 403

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

    if user.role == 'admin':
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


@admin_bp.route("/adjust_packets", methods=["POST"])
@admin_only
def adjust_packets():
    username = request.form.get("username")
    amount = request.form.get("amount", type=float)

    if not username or amount is None:
        return (
            jsonify({"success": False, "message": "Username and amount required"}),
            400,
        )

    user = User.query.filter_by(username=username).first()
    if user:
        user.packets += amount
        db.session.commit()
        return jsonify(
            {"success": True, "message": f"Updated {username}'s packets by {amount}."}
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
        return jsonify(
            success=False,
            message="Username must be 3-30 chars: lowercase letters, numbers, or underscores only",
        ), 400

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

    # Tests monkeypatch application.routes.admin_routes.admin_pass to inject a
    # known value; in normal operation it's None, so we use the real
    # ADMIN_PASSWORD from config.
    from application.routes.admin_routes import admin_pass

    app_admin_pass = (
        admin_pass
        if admin_pass is not None
        else current_app.config.get("ADMIN_PASSWORD")
    )

    if password == app_admin_pass:
        if user_id and username:
            if not re.fullmatch(r"[a-z0-9_]{3,30}", username.lower()):
                return jsonify(
                    {"success": False, "message": "Invalid username format"}
                ), 400

            user = db.session.get(User, user_id)
            if user:
                import sqlalchemy.exc

                try:
                    user.username = username.lower()
                    db.session.commit()
                except sqlalchemy.exc.IntegrityError:
                    db.session.rollback()
                    return jsonify(
                        {"success": False, "message": "Username already exists"}
                    ), 409
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
            "profile_picture": child.profile_picture,
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
        return jsonify(
            {
                "success": True,
                "message": f"Linked {student.username} to {parent.username}",
            }
        )
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
        return jsonify(
            {
                "success": True,
                "message": f"Unlinked {student.username} from {parent.username}",
            }
        )
    return jsonify({"success": True, "message": "Not linked"})


@admin_bp.route("/user/<int:user_id>/connection_card", methods=["GET"])
@admin_only
@api_response
def get_connection_card(user_id):
    student = db.session.get(User, user_id)
    if not student:
        return "Student not found.", 404

    code = student.get_connection_code()
    return {
        "connection_code": code,
        "student_id": student.id,
        "username": student.username,
        "nickname": student.nickname,
    }


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
        cards.append(
            {
                "id": student.id,
                "username": student.username,
                "nickname": student.nickname,
                "connection_code": code,
            }
        )

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
                return {
                    "conflict": True,
                    "message": f"Drawer {drawer} is already assigned to @{existing_user.username}.",
                    "current_owner": existing_user.username,
                }, 409
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


@admin_bp.route("/user/<int:user_id>", methods=["GET"])
@admin_only
def get_user_details(user_id):

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    d = user.to_dict()
    for field in ["password_hash", "salt", "ip_address"]:
        d.pop(field, None)

    return jsonify({"user": d})


@admin_bp.route("/user/<int:user_id>", methods=["PUT", "POST"])
@admin_only
@api_response
def update_user_details(user_id):
    user_obj = db.session.get(User, user_id)
    if not user_obj:
        return {"error": "User not found"}, 404

    data = request.get_json() or request.form.to_dict()

    # Username
    if data.get("username"):
        new_username = str(data["username"]).strip().lower()
        if new_username != user_obj.username:
            if not re.fullmatch(r"[a-z0-9_]{3,30}", new_username):
                return {
                    "error": "Username must be 3-30 chars: lowercase letters, numbers, or underscores only"
                }, 400
            existing = User.query.filter_by(_username=new_username).first()
            if existing and existing.id != user_obj.id:
                return {"error": f"Username '{new_username}' is already taken"}, 409
            user_obj.username = new_username

    # Nickname
    if "nickname" in data:
        new_nick = str(data["nickname"]).strip() if data["nickname"] is not None else ""
        user_obj.nickname = new_nick if new_nick else user_obj.username
        user_obj.slug = user_obj.generate_slug()

    # Active track (current course track)
    if data.get("active_track"):
        user_obj.active_track = str(data["active_track"]).strip()

    # Bio
    if "bio" in data:
        user_obj.bio = str(data["bio"]) if data["bio"] is not None else None

    # Email
    if "email" in data:
        user_obj.email = str(data["email"]).strip() if data["email"] else None

    # Role
    if "role" in data and data["role"] in ["student", "parent", "teacher"]:
        user_obj.role = data["role"]

    # Admin toggle (sent as is_admin boolean from frontend checkbox)
    if "is_admin" in data:
        val = data["is_admin"]
        is_admin_val = val if isinstance(val, bool) else (str(val).lower() == "true")
        if is_admin_val:
            user_obj.role = "admin"
        elif user_obj.role == "admin":
            # Demoting from admin — fall back to student
            user_obj.role = "student"

    # Boolean flags & permissions

    if "is_approved" in data:
        val = data["is_approved"]
        user_obj.is_approved = (
            val if isinstance(val, bool) else (str(val).lower() == "true")
        )

    if "can_chat" in data:
        val = data["can_chat"]
        user_obj.can_chat = (
            val if isinstance(val, bool) else (str(val).lower() == "true")
        )

    # Profile Picture
    if data.get("profile_picture"):
        user_obj.profile_picture = str(data["profile_picture"]).strip()

    # Shop Perk Toggles
    perk_fields = [
        "has_chat_font",
        "chat_font_color",
        "has_animated_border",
        "animated_border_speed",
        "has_auto_bitshift",
        "has_custom_wallpaper",
        "profile_wallpaper",
        "has_auto_claimer",
        "has_double_duck",
    ]
    for perk in perk_fields:
        if perk in data:
            val = data[perk]
            if perk.startswith("has_"):
                bool_val = (
                    val if isinstance(val, bool) else (str(val).lower() == "true")
                )
                setattr(user_obj, perk, bool_val)
            else:
                setattr(user_obj, perk, str(val) if val is not None else None)

    import sqlalchemy.exc

    try:
        db.session.commit()
        d = user_obj.to_dict()
        for field in ["password_hash", "salt", "ip_address"]:
            d.pop(field, None)
        return {"message": f"Updated profile for @{user_obj.username}", "user": d}
    except sqlalchemy.exc.IntegrityError:
        db.session.rollback()
        return {"error": "Database integrity error updating user fields"}, 409


@admin_bp.route("/students/<int:student_id>/parents", methods=["GET"])
@admin_only
def get_student_parents(student_id):
    student = db.session.get(User, student_id)
    if not student or student.role != "student":
        return jsonify({"success": False, "message": "Student not found"}), 404

    parents = [
        {
            "id": parent.id,
            "username": parent.username,
            "nickname": parent.nickname,
            "profile_picture": parent.profile_picture,
        }
        for parent in student.parents
    ]
    return jsonify({"success": True, "parents": parents})


@admin_bp.route("/parents/connections", methods=["GET"])
@admin_only
def get_parent_child_connections():
    parents = User.query.filter_by(role="parent").all()
    connections = []
    for parent in parents:
        for child in parent.children:
            connections.append(
                {
                    "parent": {
                        "id": parent.id,
                        "username": parent.username,
                        "nickname": parent.nickname,
                        "profile_picture": parent.profile_picture,
                    },
                    "student": {
                        "id": child.id,
                        "username": child.username,
                        "nickname": child.nickname,
                        "profile_picture": child.profile_picture,
                    },
                }
            )
    return jsonify({"success": True, "connections": connections})


@admin_bp.route("/classrooms/<classroom_id>", methods=["GET"])
@admin_only
def get_classroom_details(classroom_id):
    from application.models.classroom import Classroom

    classroom = Classroom.query.get(classroom_id)
    if not classroom:
        return jsonify({"error": "Classroom not found"}), 404

    # Convert users (roster)
    students = [
        {
            "id": u.id,
            "username": u.username,
            "nickname": u.nickname,
            "profile_picture": u.profile_picture,
            "is_online": u.is_online,
        }
        for u in classroom.users
        if u.role == "student"
    ]

    # Convert course assignments
    course_assignments = [
        {
            "id": assignment.id,
            "course_id": assignment.course_id,
            "course_name": assignment.course.name if assignment.course else None,
            "created_at": assignment.created_at.isoformat()
            if assignment.created_at
            else None,
        }
        for assignment in classroom.course_assignments
    ]

    return jsonify(
        {
            "classroom": {
                "id": classroom.id,
                "name": classroom.name,
                "language": classroom.language,
                "created_at": classroom.created_at.isoformat()
                if classroom.created_at
                else None,
                "students": students,
                "course_assignments": course_assignments,
            }
        }
    )


@admin_bp.route("/classrooms/<classroom_id>/join-code", methods=["GET"])
@admin_only
@api_response
def get_classroom_join_code(classroom_id):
    """Returns the classroom's join code, generating one if it doesn't exist yet."""
    from application.models.classroom import Classroom

    classroom = db.session.get(Classroom, classroom_id)
    if not classroom:
        return "Classroom not found.", 404
    code = classroom.get_join_code()
    base_url = request.host_url.rstrip("/")
    return {"join_code": code, "join_url": f"{base_url}/join-class?code={code}"}


@admin_bp.route("/classrooms/<classroom_id>/join-code/regenerate", methods=["POST"])
@admin_only
@api_response
def regenerate_classroom_join_code(classroom_id):
    """Generates a new join code for the classroom, invalidating the old one."""
    from application.models.classroom import Classroom

    classroom = db.session.get(Classroom, classroom_id)
    if not classroom:
        return "Classroom not found.", 404
    classroom.join_code = classroom.generate_join_code()
    db.session.commit()
    base_url = request.host_url.rstrip("/")
    return {
        "join_code": classroom.join_code,
        "join_url": f"{base_url}/join-class?code={classroom.join_code}",
    }


@admin_bp.route("/classrooms/<classroom_id>", methods=["PUT"])
@admin_only
def update_classroom(classroom_id):
    from application.models.classroom import Classroom

    classroom = Classroom.query.get(classroom_id)
    if not classroom:
        return jsonify({"error": "Classroom not found"}), 404

    data = request.get_json() or {}
    if "name" in data:
        classroom.name = data["name"]
    if "language" in data:
        classroom.language = data["language"]

    db.session.commit()
    return jsonify({"success": True, "message": "Classroom updated successfully"})


@admin_bp.route("/classrooms/<classroom_id>", methods=["DELETE"])
@admin_only
def delete_classroom(classroom_id):
    from application.models.classroom import Classroom

    classroom = Classroom.query.get(classroom_id)
    if not classroom:
        return jsonify({"error": "Classroom not found"}), 404

    db.session.delete(classroom)
    db.session.commit()
    return jsonify({"success": True, "message": "Classroom deleted successfully"})


@admin_bp.route("/classrooms/<classroom_id>/enroll", methods=["POST"])
@admin_only
def enroll_student_in_classroom(classroom_id):
    from application.models.classroom import Classroom

    classroom = Classroom.query.get(classroom_id)
    if not classroom:
        return jsonify({"error": "Classroom not found"}), 404

    data = request.get_json() or {}
    student_id = data.get("student_id")
    if not student_id:
        return jsonify({"error": "Student ID is required"}), 400

    student = User.query.filter_by(id=student_id, role="student").first()
    if not student:
        return jsonify({"error": "Student not found"}), 404

    if student not in classroom.users:
        classroom.users.append(student)
        db.session.commit()

    return jsonify({"success": True, "message": "Student enrolled successfully"})


@admin_bp.route("/classrooms/<classroom_id>/unenroll", methods=["POST"])
@admin_only
def unenroll_student_from_classroom(classroom_id):
    from application.models.classroom import Classroom

    classroom = Classroom.query.get(classroom_id)
    if not classroom:
        return jsonify({"error": "Classroom not found"}), 404

    data = request.get_json() or {}
    student_id = data.get("student_id")
    if not student_id:
        return jsonify({"error": "Student ID is required"}), 400

    student = User.query.get(student_id)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    if student in classroom.users:
        classroom.users.remove(student)
        db.session.commit()

    return jsonify({"success": True, "message": "Student unenrolled successfully"})

@admin_bp.route("/user/<int:user_id>/pass_chapter_preview", methods=["POST"])
@admin_only
@api_response
def pass_chapter_preview(user_id):
    from application.models.achievements import Achievement
    from application.models.challenge import Challenge
    from application.models.challenge_log import ChallengeLog

    user_obj = db.get_or_404(User, user_id)
    data = request.get_json() or {}
    course_id = data.get("course_id")

    if not course_id:
        return {"error": "course_id is required"}, 400

    from application.utilities.db_helpers import resolve_course_id
    db_course_id = resolve_course_id(course_id)
    challenges = Challenge.query.filter_by(course_id=db_course_id).all()
    if not challenges:
        return {"error": f"No challenges found for course_id: {db_course_id}"}, 404

    existing_logs = ChallengeLog.query.filter_by(user_id=user_obj.id).all()
    existing_slugs = {cl.challenge_slug for cl in existing_logs}

    missing_challenges = [c for c in challenges if c.slug not in existing_slugs]

    total_ducks = sum(c.scale_value() for c in missing_challenges)

    # Check if there are any certificates related to this course
    # Assuming certificate achievement source is course_id
    certificate_achievements = Achievement.query.filter(
        (Achievement.type == "certificate")
        & ((Achievement.source == db_course_id) | (Achievement.slug == db_course_id))
    ).all()

    from application.models.user_certificate import UserCertificate

    existing_certs = {
        uc.achievement_id
        for uc in UserCertificate.query.filter_by(user_id=user_obj.id).all()
    }

    missing_certs = [
        cert.name for cert in certificate_achievements if cert.id not in existing_certs
    ]

    return {
        "success": True,
        "preview": {
            "challenges_to_complete": len(missing_challenges),
            "ducks_to_award": total_ducks,
            "certificates_to_award": missing_certs,
        },
    }


@admin_bp.route("/user/<int:user_id>/pass_chapter", methods=["POST"])
@admin_only
@api_response
def pass_chapter(user_id):
    import datetime

    from application.models.achievements import Achievement
    from application.models.challenge import Challenge
    from application.models.challenge_log import ChallengeLog
    from application.models.user_certificate import UserCertificate
    from application.services.achievement_engine import evaluate_user

    user_obj = db.get_or_404(User, user_id)
    data = request.get_json() or {}
    course_id = data.get("course_id")

    if not course_id:
        return {"error": "course_id is required"}, 400

    from application.utilities.db_helpers import resolve_course_id
    db_course_id = resolve_course_id(course_id)
    challenges = Challenge.query.filter_by(course_id=db_course_id).all()
    if not challenges:
        return {"error": f"No challenges found for course_id: {db_course_id}"}, 404

    existing_logs = ChallengeLog.query.filter_by(user_id=user_obj.id).all()
    existing_slugs = {cl.challenge_slug for cl in existing_logs}

    missing_challenges = [c for c in challenges if c.slug not in existing_slugs]
    total_ducks = 0

    for c in missing_challenges:
        # Create log
        log = ChallengeLog(user_id=user_obj.id, domain=c.domain, challenge_slug=c.slug)
        db.session.add(log)
        total_ducks += c.scale_value()

    # Manually bypass duck caps for this admin override
    if total_ducks > 0:
        user_obj.earned_ducks += total_ducks
        user_obj.duck_balance += total_ducks
        from application.models.duck_transaction import DuckTransaction

        tx = DuckTransaction(
            user_id=user_obj.id,
            amount=total_ducks,
            reason=f"Admin Pass Chapter Override for {course_id}",
        )
        db.session.add(tx)

    certificate_achievements = Achievement.query.filter(
        (Achievement.type == "certificate")
        & ((Achievement.source == db_course_id) | (Achievement.slug == db_course_id))
    ).all()
    existing_certs = {
        uc.achievement_id
        for uc in UserCertificate.query.filter_by(user_id=user_obj.id).all()
    }

    for cert in certificate_achievements:
        if cert.id not in existing_certs:
            uc = UserCertificate(
                user_id=user_obj.id,
                achievement_id=cert.id,
                url="Honorary Degree",
                status="approved",
                reviewed_at=datetime.datetime.utcnow(),
            )
            db.session.add(uc)

    # Need to commit before evaluate_user so logs are readable
    db.session.commit()

    # Run evaluation to grant any progress achievements
    evaluate_user(user_obj, force=True)

    return {
        "success": True,
        "message": f"Successfully passed {course_id} for user. Awarded {total_ducks} ducks and completed {len(missing_challenges)} challenges.",
    }

@admin_bp.route("/user/<int:user_id>/generate_certificate", methods=["POST"])
@admin_only
def generate_manual_certificate(user_id):
    import io

    from application.models.user import User
    from application.utilities.cert_generator import generate_certificate
    from application.utilities.db_helpers import get_canonical_course_slug
    from flask import send_file

    user_obj = db.session.get(User, user_id)
    if not user_obj:
        return {"error": "User not found"}, 404

    data = request.get_json(silent=True) or request.form or {}
    course_id = data.get("course_id", "cs-1")
    student_name = user_obj.nickname or user_obj.username

    try:
        pdf_bytes = generate_certificate(course_id, None, student_name)
    except Exception as e:
        return {"error": f"Failed to generate certificate: {e!s}"}, 500

    memory_file = io.BytesIO(pdf_bytes)
    memory_file.seek(0)

    canonical_slug = get_canonical_course_slug(course_id)
    filename = f"{student_name}_{canonical_slug}_Certificate.pdf"

    return send_file(
        memory_file,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename
    )

