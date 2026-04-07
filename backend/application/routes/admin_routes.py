"""
File: admin_routes.py
Type: py
Summary: Flask routes for admin routes functionality.
"""

import os
import re
from datetime import datetime, timedelta
from functools import wraps

from flask import (
    Blueprint,
    request,
    jsonify,
    render_template,
    send_file,
    flash,
    current_app, session,
)
from application.decorators.api_response import api_response
from flask import redirect, url_for
from sqlalchemy import func, cast, Date, or_
from werkzeug.utils import secure_filename

from application.config import Config
from application.extensions import db, limiter
from application.models.achievements import Achievement, UserAchievement
from application.models.banned_words import BannedWords
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.configuration import Configuration
from application.models.conversation import Conversation
from application.models.duck_trade import DuckTradeLog
from application.models.message import Message
from application.models.project import Project
from application.models.user import User

admin = Blueprint("admin", __name__)
admin_pass = Config.ADMIN_PASSWORD
adminUsername = Config.ADMIN_USERNAME


@admin.before_request
@limiter.limit("5 per second, 50 per minute")
def before_user_request():
    pass


# def local_only(f):
#     @wraps(f)
#     def wrapper(*args, **kwargs):
#         if request.remote_addr != "127.0.0.1":
#             return render_template("error/nice_try.html"), 403
#         return f(*args, **kwargs)
#
#     return wrapper
#
#
# def check_auth(f):
#     @wraps(f)
#     def authenticate_and_execute(*args, **kwargs):
#         auth = request.authorization
#         if not auth or not (auth.password == admin_pass):
#             return (
#                 jsonify({"error": "Unauthorized"}),
#                 401,
#                 {"WWW-Authenticate": 'Basic realm="Login Required"'},
#             )
#         return f(*args, **kwargs)
#
#     return authenticate_and_execute

def admin_only(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user_id = session.get("user")
        if not user_id:
            if request.is_json or request.accept_mimetypes.accept_json:
                return jsonify({"error": "Authentication required"}), 401
            return render_template("index.html")


        user = User.query.get(user_id)
        if not user or not user.is_admin:
            if request.is_json or request.accept_mimetypes.accept_json:
                return jsonify({"error": "Admin access required"}), 403
            return render_template("index.html")


        return f(*args, **kwargs)
    return wrapper

def update_username(new_username, user_id=None, user_ip=None):
    if user_id:
        user = User.query.get(user_id)
    elif user_ip:
        user = User.query.filter_by(ip_address=user_ip).first()
    else:
        return False, "User not found"

    print(f"Admin updating user from {user.username} to {new_username}")
    user.username = new_username
    db.session.commit()
    return True, None


def get_duck_transactions_data():
    """Generate chart data for duck transactions over the past 7 days"""
    end_date = datetime.now()
    config = Configuration.query.first()
    multiplier = config.duck_multiplier if config and config.duck_multiplier else 1.0

    labels = [(end_date - timedelta(days=i)).strftime("%a") for i in range(6, -1, -1)]

    earned = []
    spent = []

    for i in range(6, -1, -1):
        day = end_date - timedelta(days=i)
        day_start = datetime(day.year, day.month, day.day, 0, 0, 0)
        day_end = datetime(day.year, day.month, day.day, 23, 59, 59)

        # 1. Challenge earnings (with multiplier and robust slug matching)
        day_challenge_earned = (
            db.session.query(func.coalesce(func.sum(Challenge.value * multiplier), 0))
            .select_from(ChallengeLog)
            .join(Challenge, or_(
                Challenge.slug.ilike(ChallengeLog.challenge_slug),
                Challenge.slug.ilike(func.replace(ChallengeLog.challenge_slug, '-', ' '))
            ))
            .filter(ChallengeLog.timestamp.between(day_start, day_end))
            .scalar() or 0
        )

        # 2. Achievement earnings
        day_achievement_earned = (
            db.session.query(func.coalesce(func.sum(Achievement.reward), 0))
            .select_from(UserAchievement)
            .join(Achievement, Achievement.id == UserAchievement.achievement_id)
            .filter(UserAchievement.earned_at.between(day_start, day_end))
            .scalar() or 0
        )

        # 3. Duck Trade spending (approved trades)
        day_spent = (
            db.session.query(func.coalesce(func.sum(DuckTradeLog.digital_ducks), 0))
            .filter(
                DuckTradeLog.timestamp.between(day_start, day_end),
                DuckTradeLog.status == "approved",
            )
            .scalar() or 0
        )

        earned.append(float(day_challenge_earned + day_achievement_earned))
        spent.append(float(day_spent))

    return {"labels": labels, "earned": earned, "spent": spent}


@admin.route("/")
@admin_only
def base():
    return redirect(url_for("admin.dashboard"))



@admin.route("/dashboard")
@admin_only
def dashboard():
    total_ducks = db.session.query(func.sum(User.duck_balance)).scalar() or 0

    # Determine start of the current week (Monday)
    today = datetime.now().date()
    start_of_week = today - timedelta(days=today.weekday())

    config = Configuration.query.first()
    multiplier = config.duck_multiplier if config and config.duck_multiplier else 1.0

    # 1. Sum ducks earned from Challenges this week (with dash/space handling & multiplier)
    challenge_ducks = (
        db.session.query(func.coalesce(func.sum(Challenge.value * multiplier), 0))
        .select_from(ChallengeLog)
        .join(Challenge, or_(
            Challenge.slug.ilike(ChallengeLog.challenge_slug),
            Challenge.slug.ilike(func.replace(ChallengeLog.challenge_slug, '-', ' '))
        ))
        .filter(cast(ChallengeLog.timestamp, Date) >= start_of_week)
        .scalar() or 0
    )

    # 2. Sum ducks earned from Achievements this week
    achievement_ducks = (
        db.session.query(func.coalesce(func.sum(Achievement.reward), 0))
        .select_from(UserAchievement)
        .join(Achievement, Achievement.id == UserAchievement.achievement_id)
        .filter(cast(UserAchievement.earned_at, Date) >= start_of_week)
        .scalar() or 0
    )


    ducks_earned_this_week = challenge_ducks + achievement_ducks

    pending_trades_count = DuckTradeLog.query.filter_by(status="pending").count()
    pending_users_count = User.query.filter_by(is_approved=False, is_admin=False).count()
    active_users_count = User.query.filter_by(is_online=True).count()

    users = User.query.all()
    users_sorted = sorted(users, key=lambda u: u.duck_balance or 0, reverse=True)
    banned_words = BannedWords.query.all()

    chart_data = get_duck_transactions_data()

    if request.is_json or request.accept_mimetypes.accept_json:
        return jsonify({
            "status": "success",
            "data": {
                "total_ducks": total_ducks,
                "ducks_earned_this_week": ducks_earned_this_week,
                "pending_trades_count": pending_trades_count,
                "pending_users_count": pending_users_count,
                "active_users_count": active_users_count,
                "users": [u.to_dict() for u in users_sorted],
                "config": config.to_dict() if config else None,
                "banned_words": [bw.to_dict() for bw in banned_words],
                "chart_data": chart_data
            }
        })

    return render_template(
        "admin/admin.html",
        users=users_sorted,
        config=config,
        banned_words=banned_words,
        total_ducks=total_ducks,
        ducks_earned_this_week=ducks_earned_this_week,
        pending_trades_count=pending_trades_count,
        active_users_count=active_users_count,
        chart_data=chart_data,
    )

@admin.route("/duck_transactions_data")
@admin_only
def duck_transactions_data():
    chart_data = get_duck_transactions_data()
    return jsonify(chart_data)


@admin.route("/pending_users", methods=["GET"])
@admin_only
@api_response
def pending_users():
    pending = User.query.filter_by(is_approved=False, is_admin=False).all()
    return {"users": [u.to_dict() for u in pending]}


@admin.route("/approve_user/<int:user_id>", methods=["POST"])
@admin_only
@api_response
def approve_user(user_id):
    user_obj = User.query.get_or_404(user_id)
    user_obj.is_approved = True
    db.session.commit()
    return {"message": f"User {user_obj.username} approved successfully."}


@admin.route("/reject_user/<int:user_id>", methods=["POST"])
@admin_only
@api_response
def reject_user(user_id):
    user_obj = User.query.get_or_404(user_id)
    username = user_obj.username
    db.session.delete(user_obj)
    db.session.commit()
    return {"message": f"User {username} rejected and removed."}


@admin.route("/users", methods=["GET"])
@admin_only
def get_users():
    users = User.query.all()
    users_data = []
    for user in users:
        user_dict = {
            column.name: getattr(user, column.name) for column in user.__table__.columns
        }
        user_dict["skills"] = [
            {"id": skill.id, "name": skill.name} for skill in user.skills
        ]
        user_dict["projects"] = [
            {
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "link": project.link,
            }
            for project in user.projects
        ]
        users_data.append(user_dict)

    return jsonify(users_data)


@admin.route("/users/<int:user_id>", methods=["PUT"])
@admin_only
def update_user(user_id):
    user = User.query.get(user_id)
    if user:
        for column in user.__table__.columns:
            column_name = column.name
            if column_name in request.form:
                setattr(user, column_name, request.form[column_name])

        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"error": "User not found"}), 404


@admin.route("/set_username", methods=["POST"])
@admin_only
def set_username_route():
    return set_username()


@admin.route("/verify_password", methods=["POST"])
@admin_only
def verify_password():
    password = request.form["password"]
    if password == admin_pass:
        return set_username()
    else:
        return jsonify(success=False), 401


def set_username():
    user_id = request.form.get("user_id")
    user_ip = request.remote_addr
    new_username = request.form.get("username")
    if not new_username:
        return jsonify({"error": "Missing user ID or new username"}), 400

    success, error_message = update_username(new_username, user_id, user_ip)
    if not success:
        return (
            jsonify({"error": "Failed to update username", "message": error_message}),
            500,
        )

    return jsonify({"success": True})


@admin.route("/reset_password", methods=["POST"])
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


@admin.route("/create_user", methods=["POST"])
@admin_only
def create_user():
    username = request.form.get("username", "").strip().lower()
    password = request.form.get("password", "")
    ducks = request.form.get("ducks", type=int)

    if not username or not password or ducks is None or ducks < 0:
        return (
            jsonify(
                success=False,
                message="Username, password, and non0negative ducks required",
            ),
            400,
        )

    if not re.fullmatch(r"[a-z0-9_]{3,30}", username):
        return (
            jsonify(
                success=False,
                message="Username must be 30 chars: lowercase letters, numbers, or underscores only",
            ),
            400,
        )

    if User.query.filter_by(username=username).first():
        return jsonify(success=False, message="Username already exists"), 409

    try:
        new_user = User(username=username, ducks=ducks)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        return jsonify(
            success=True, message=f"User '{username}' created with {ducks} ducks"
        )
    except Exception as e:
        db.session.rollback()
        print(f"Error: Failed to create user: {e}")
        return jsonify(success=False, message="Internal server error"), 500


@admin.route("/remove_user", methods=["POST"])
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
        print(f"Error deleting user '{username}': {e}")
        return jsonify(success=False, message="Internal server error"), 500


@admin.route("/toggle-ai", methods=["POST"])
@admin_only
def toggle_ai():
    config = Configuration.query.first()
    if config is None:
        config = Configuration(ai_teacher_enabled=False)
        db.session.add(config)

    config.ai_teacher_enabled = not config.ai_teacher_enabled
    db.session.commit()

    return jsonify(
        {
            "success": True,
            "message": f"AI Teacher has been {'disabled' if config.ai_teacher_enabled else 'enabled'}",
            "status": config.ai_teacher_enabled,
        }
    )


@admin.route("/toggle-message-sending", methods=["POST"])
@admin_only
def toggle_message_sending():
    config = Configuration.query.first()

    if config is None:
        config = Configuration(message_sending_enabled=False)
        db.session.add(config)
    else:
        config.message_sending_enabled = not config.message_sending_enabled
    db.session.commit()

    return jsonify(
        {
            "success": True,
            "message": f"Message sending has been {'disabled' if config.message_sending_enabled else 'enabled'}",
            "status": config.message_sending_enabled,
        }
    )


@admin.route("/clear-partial-history", methods=["POST"])
@admin_only
def clear_partial_history():
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        conversations_to_delete = Conversation.query.filter(
            Conversation.created_at < cutoff_date
        )
        count = conversations_to_delete.count()
        conversations_to_delete.delete(synchronize_session=False)
        db.session.commit()

        return jsonify(
            {
                "success": True,
                "message": f"Cleared {count} conversations older than 30 days",
            }
        )
    except Exception as e:
        db.session.rollback()
        print(f"Error clearing history: {e}")
        return (
            jsonify({"success": False, "message": "Failed to clear partial history"}),
            500,
        )


@admin.route("/add-banned-word", methods=["POST"])
@admin_only
def add_banned_word():
    word = request.form.get("word")
    reason = request.form.get("reason", None)

    if not word:
        return jsonify({"success": False, "message": "Word cannot be empty"}), 400

    if BannedWords.query.filter_by(word=word).first():
        return jsonify({"success": False, "message": "Word already banned"}), 400

    new_banned_word = BannedWords(word=word, reason=reason)
    db.session.add(new_banned_word)
    db.session.commit()

    return jsonify(
        {"success": True, "message": f"'{word}' has been added to banned words"}
    )


@admin.route("/strike_message/<int:message_id>", methods=["POST"])
@admin_only
def strike_message(message_id):
    message = Message.query.get(message_id)
    if not message:
        return jsonify(success=False, error="Message not found"), 404

    try:
        message.is_struck = True
        db.session.commit()
        return jsonify(success=True, message="Message struck successfully"), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error striking message: {e}")
        return (
            jsonify(
                success=False, error="An error occurred while striking the message"
            ),
            500,
        )


@admin.route("/pending_trades", methods=["GET"])
@admin_only
def pending_trades():
    pend_trades = DuckTradeLog.query.filter_by(status="pending").all()
    
    if request.is_json or request.accept_mimetypes.accept_json:
        return jsonify({
            "status": "success",
            "data": {
                "trades": [{
                    "id": t.id,
                    "username": t.username,
                    "digital_ducks": t.digital_ducks,
                    "bit_ducks": t.bit_ducks,
                    "byte_ducks": t.byte_ducks,
                    "timestamp": t.timestamp.isoformat() if t.timestamp else None
                } for t in pend_trades]
            }
        })

    return render_template("admin/pending_trades.html", trades=pend_trades)


@admin.route("/trade_action", methods=["POST"])
@admin_only
def trade_action():
    trade_id = request.form.get("trade_id")
    action = request.form.get("action")

    trade = DuckTradeLog.query.get(trade_id)
    if not trade:
        return jsonify({"status": "error", "message": "Trade not found"}), 404

    if action == "approve":
        user = User.query.filter_by(username=trade.username).first()
        if not user:
            return jsonify({"status": "error", "message": "User not found"}), 404

        if user.duck_balance < trade.digital_ducks:
            return jsonify({"status": "error", "message": "Insufficient ducks"}), 400

        user.duck_balance -= trade.digital_ducks
        trade.approve()
        db.session.commit()
        return jsonify({"status": "success", "message": "Trade approved"})

    elif action == "reject":
        trade.reject()
        db.session.commit()
        return jsonify({"status": "success", "message": "Trade rejected"})

    return jsonify({"status": "error", "message": "Invalid action"}), 400


@admin.route("/update_duck_multiplier", methods=["POST"])
def update_duck_multiplier():
    data = request.get_json()
    new_multiplier = data.get("multiplier")

    if new_multiplier is None:
        return jsonify({"success": False, "error": "No multiplier provided"}), 400

    try:
        new_multiplier = float(new_multiplier)

        config = Configuration.query.first()
        if config is None:
            return jsonify({"success": False, "error": "Configuration not found"}), 404
        config.duck_multiplier = new_multiplier

        db.session.commit()
        return jsonify({"success": True, "new_multiplier": new_multiplier})
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "Invalid multiplier value"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@admin.route("/adjust_ducks", methods=["POST"])
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
        user.duck_balance += amount
        db.session.commit()

        return jsonify(
            {"success": True, "message": f"Updated {username}'s ducks by {amount}."}
        )
    else:
        return jsonify({"success": False, "message": "User not found."}), 404


@admin.route("/advanced-panel")
@admin_only
def advanced_panel():
    # In a real scenario, these come from the Flask-Admin instance
    # We'll provide a curated list for the React frontend
    admin_views = [
        {"name": "Users", "endpoint": "user"},
        {"name": "Projects", "endpoint": "project"},
        {"name": "Achievements", "endpoint": "achievement"},
        {"name": "Duck Trade Logs", "endpoint": "ducktradelog"},
        {"name": "Configuration", "endpoint": "configuration"},
        {"name": "Banned Words", "endpoint": "bannedwords"},
        {"name": "Messages", "endpoint": "message"},
        {"name": "Conversations", "endpoint": "conversation"},
    ]

    if request.is_json or request.accept_mimetypes.accept_json:
        return jsonify({
            "status": "success",
            "data": {
                "views": admin_views
            }
        })

    return render_template("admin/advanced_panel.html", views=admin_views)


@admin.route("/documents", methods=["GET"])
@admin_only
def list_documents():
    """List all uploaded documents across all categories"""
    documents = []
    base_path = current_app.config["UPLOAD_FOLDER"]

    categories = ["image", "pdf", "other"]

    for category in categories:
        category_path = os.path.join(base_path, category)
        if os.path.exists(category_path):
            for filename in os.listdir(category_path):
                file_path = os.path.join(category_path, filename)
                if os.path.isfile(file_path):
                    file_stats = os.stat(file_path)
                    documents.append(
                        {
                            "filename": filename,
                            "category": category,
                            "path": file_path,
                            "size": file_stats.st_size,
                            "size_formatted": format_file_size(file_stats.st_size),
                            "created": datetime.fromtimestamp(
                                file_stats.st_ctime
                            ).isoformat(),
                            "modified": datetime.fromtimestamp(
                                file_stats.st_mtime
                            ).isoformat(),
                        }
                    )

    documents.sort(key=lambda x: x["created"], reverse=True)

    return jsonify({"success": True, "documents": documents, "total": len(documents)})


@admin.route("/documents/<category>/<filename>/download", methods=["GET"])
@admin_only
def download_document(category, filename):
    """Download a specific document"""
    if category not in ["image", "pdf", "other"]:
        return jsonify({"success": False, "message": "Invalid category"}), 400

    base_path = current_app.config["UPLOAD_FOLDER"]
    file_path = os.path.join(base_path, category, filename)

    if not os.path.exists(file_path):
        return jsonify({"success": False, "message": "File not found"}), 404

    abs_file_path = os.path.abspath(file_path)
    abs_user_data = os.path.abspath(base_path)
    if not abs_file_path.startswith(abs_user_data):
        return jsonify({"success": False, "message": "Invalid file path"}), 403

    return send_file(file_path, as_attachment=True, download_name=filename)


@admin.route("/documents/<category>/<filename>/view", methods=["GET"])
@admin_only
def view_document(category, filename):
    """View a specific document in browser"""
    if category not in ["image", "pdf", "other"]:
        return jsonify({"success": False, "message": "Invalid category"}), 400

    base_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "..", "userData"
    )
    file_path = os.path.join(base_path, category, filename)

    if not os.path.exists(file_path):
        return jsonify({"success": False, "message": "File not found"}), 404

    abs_file_path = os.path.abspath(file_path)
    abs_user_data = os.path.abspath(base_path)
    if not abs_file_path.startswith(abs_user_data):
        return jsonify({"success": False, "message": "Invalid file path"}), 403

    return send_file(file_path)


@admin.route("/delete-document", methods=["POST"])
@admin_only
def delete_document():
    """Delete a specific document"""
    category = request.form.get("category")
    filename = request.form.get("filename")

    if not category or not filename:
        return (
            jsonify(
                {"success": False, "message": "Category and filename are required"}
            ),
            400,
        )

    if category not in ["image", "pdf", "other"]:
        return jsonify({"success": False, "message": "Invalid category"}), 400

    base_path = current_app.config["UPLOAD_FOLDER"]
    file_path = os.path.join(base_path, category, filename)

    if not os.path.exists(file_path):
        return jsonify({"success": False, "message": "File not found"}), 404

    abs_file_path = os.path.abspath(file_path)
    abs_user_data = os.path.abspath(base_path)
    if not abs_file_path.startswith(abs_user_data):
        return jsonify({"success": False, "message": "Invalid file path"}), 403

    try:
        os.remove(file_path)
        return jsonify(
            {"success": True, "message": f"'{filename}' has been deleted successfully"}
        )
    except Exception as e:
        print(f"Error deleting file: {e}")
        return (
            jsonify({"success": False, "message": f"Failed to delete file: {str(e)}"}),
            500,
        )


@admin.route("/documents/stats", methods=["GET"])
@admin_only
def document_stats():
    """Get statistics about uploaded documents"""
    stats = {
        "total_files": 0,
        "total_size": 0,
        "total_size_formatted": "0 B",
        "by_category": {},
    }

    base_path = current_app.config["UPLOAD_FOLDER"]
    categories = ["image", "pdf", "other"]

    for category in categories:
        category_path = os.path.join(base_path, category)
        category_stats = {"count": 0, "size": 0, "size_formatted": "0 B"}

        if os.path.exists(category_path):
            for filename in os.listdir(category_path):
                file_path = os.path.join(category_path, filename)
                if os.path.isfile(file_path):
                    file_size = os.path.getsize(file_path)
                    category_stats["count"] += 1
                    category_stats["size"] += file_size
                    stats["total_files"] += 1
                    stats["total_size"] += file_size

        category_stats["size_formatted"] = format_file_size(category_stats["size"])
        stats["by_category"][category] = category_stats

    stats["total_size_formatted"] = format_file_size(stats["total_size"])

    return jsonify({"success": True, "stats": stats})


def format_file_size(size_bytes):
    """Format file size in human-readable format"""
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} PB"


@admin.route("/project/edit/<int:project_id>", methods=["GET", "POST"])
def edit_project_details(project_id):
    project = Project.query.get_or_404(project_id)

    if request.method == "POST":
        project.name = request.form.get("name")
        project.description = request.form.get("description")
        project.link = request.form.get("link")
        project.teacher_comment = request.form.get("teacher_comment")
        project.video_url = request.form.get("video_url")
        project.code_snippet = request.form.get("code_snippet")
        project.github_link = request.form.get("github_link")

        if "project_image" in request.files:
            file = request.files["project_image"]

            if file and file.filename != "":
                filename = secure_filename(f"proj_{project.id}_{file.filename}")

                upload_folder = os.path.join(
                    current_app.static_folder, "images", "project_thumbs"
                )
                os.makedirs(upload_folder, exist_ok=True)

                file.save(os.path.join(upload_folder, filename))

                project.image_url = f"images/project_thumbs/{filename}"

        db.session.commit()
        flash(f"Project '{project.name}' updated successfully!", "success")
        return redirect(url_for("user.view_user_profile", slug=project.user.slug))

    return render_template("user/edit_project.html", project=project)


# Renamed from 'pending_reviews' to 'manage_projects' to reflect the new capabilities
@admin.route("/manage-projects")
@admin_only
@api_response
def manage_projects():
    # 1. Get filter type from URL (default to 'pending')
    filter_type = request.args.get("filter", "pending")

    # 2. Always calculate pending count for the UI tab label
    pending_count = Project.query.filter(
        (Project.teacher_comment == None) | (Project.teacher_comment == "")
    ).count()

    # 3. Build the query based on filter
    query = Project.query
    if filter_type == "pending":
        query = query.filter(
            (Project.teacher_comment == None) | (Project.teacher_comment == "")
        )

    # 4. Fetch results (Newest first)
    projects = query.order_by(Project.id.desc()).all()

    if request.is_json or request.accept_mimetypes.accept_json:
        return {
            "projects": [p.to_dict() for p in projects],
            "filter_type": filter_type,
            "pending_count": pending_count,
            "total_count": Project.query.count()
        }

    return render_template(
        "admin/manage_projects.html",
        projects=projects,
        filter_type=filter_type,
        pending_count=pending_count,
    )


# Renamed to handle both Approval and Rejection logic
@admin.route("/handle-project-review/<int:project_id>", methods=["POST"])
@admin_only
@api_response
def handle_project_review(project_id):
    project = Project.query.get_or_404(project_id)

    if request.is_json:
        data = request.get_json()
        action = data.get("action")
        comment = data.get("teacher_comment")
        filter_context = data.get("filter_context", "pending")
    else:
        action = request.form.get("action")
        comment = request.form.get("teacher_comment")
        filter_context = request.form.get("filter_context", "pending")

    if action == "reject":
        project.teacher_comment = None
        msg = f'Project "{project.name}" marked for revision.'
    elif action == "approve":
        project.teacher_comment = comment
        msg = f'Feedback published for "{project.name}".'

    db.session.commit()

    if request.is_json or request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return {"message": msg, "project": project.to_dict()}

    flash(msg, "success" if action == "approve" else "warning")
    return redirect(url_for("admin.manage_projects", filter=filter_context))
