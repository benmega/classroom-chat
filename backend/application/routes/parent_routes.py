"""
File: parent_routes.py
Type: py
Summary: API endpoints for parent accounts to view linked children, student report cards,
         historical progress data, and teacher contact functionality.
"""

from datetime import datetime, timedelta
from flask import Blueprint, session, request

from application.decorators.api_response import api_response
from application.decorators.login_required import require_login
from application.extensions import db
from application.models.user import User
from application.models.connection_attempt import ConnectionAttempt


parent = Blueprint("parent", __name__)


@parent.route("/children", methods=["GET"])
@require_login
@api_response
def get_children():
    """Returns the list of children linked to the authenticated parent."""
    user_id = session.get("user")
    user_obj = db.session.get(User, user_id)

    if not user_obj or user_obj.role != "parent":
        return "Access denied. Parent account required.", 403

    children = [
        {
            "id": child.id,
            "username": child.username,
            "nickname": child.nickname,
            "profile_picture_url": (
                f"/user/profile_pictures/{child.profile_picture}"
                if child.profile_picture
                else "/static/images/Default_pfp.jpg"
            ),
            "slug": child.slug,
            "current_activity": child.current_activity,
            "last_activity_time": child.last_activity_time.isoformat() if child.last_activity_time else None,
        }
        for child in user_obj.children
    ]

    return {"children": children}


@parent.route("/student/<int:student_id>/report", methods=["GET"])
@require_login
@api_response
def get_student_report(student_id):
    """Returns a read-only report card for a specific linked student."""
    user_id = session.get("user")
    user_obj = db.session.get(User, user_id)

    if not user_obj or user_obj.role != "parent":
        return "Access denied. Parent account required.", 403

    # Verify the student is linked to this parent
    child_ids = {child.id for child in user_obj.children}
    if student_id not in child_ids:
        return "Access denied. This student is not linked to your account.", 403

    student = db.session.get(User, student_id)
    if not student:
        return "Student not found.", 404

    # Build unlocked achievements list (earned only)
    unlocked_achievements = []
    for ua in student.achievements:
        achievement = ua.achievement
        if achievement:
            unlocked_achievements.append({
                "id": achievement.id,
                "slug": achievement.slug,
                "name": achievement.name,
                "type": achievement.type,
                "description": achievement.description,
                "earned_at": ua.earned_at.isoformat() if ua.earned_at else None,
            })

    report = {
        "username": student.username,
        "nickname": student.nickname,
        "profile_picture_url": (
            f"/user/profile_pictures/{student.profile_picture}"
            if student.profile_picture
            else "/static/images/Default_pfp.jpg"
        ),
        "contribution_data": student.get_contribution_data(),
        "unlocked_achievements": unlocked_achievements,
        "projects": [
            p.to_dict() if hasattr(p, "to_dict") else {"id": p.id, "name": p.name}
            for p in student.projects
        ],
        "notes": [
            (
                n.to_dict()
                if hasattr(n, "to_dict")
                else {"id": n.id, "url": f"/notes/view/{n.filename}"}
            )
            for n in student.notes
        ],
        "course_progress": student.get_course_progress_data(),
        "current_activity": student.current_activity,
        "last_activity_time": student.last_activity_time.isoformat() if student.last_activity_time else None,
    }

    return report


@parent.route("/connect/code", methods=["POST"])
@require_login
@api_response
def connect_via_code():
    """Instantly links the authenticated parent to a student using their connection code."""
    data = request.json or {}
    code = data.get("code", "").strip()

    if not code:
        return "Connection code is required.", 400

    user_id = session.get("user")
    user_obj = db.session.get(User, user_id)

    if not user_obj or user_obj.role != "parent":
        return "Access denied. Parent account required.", 403

    # Check rate limits
    is_allowed, error_msg = ConnectionAttempt.check_rate_limits(user_id)
    if not is_allowed:
        ConnectionAttempt.log_attempt(user_id, code, success=False)
        return error_msg, 429

    student = User.query.filter_by(connection_code=code).first()
    if not student:
        ConnectionAttempt.log_attempt(user_id, code, success=False)
        return "Invalid connection code.", 404

    if student in user_obj.children:
        ConnectionAttempt.log_attempt(user_id, code, success=False)
        return "Already linked to this student.", 400

    user_obj.children.append(student)
    db.session.commit()

    # Log successful attempt
    ConnectionAttempt.log_attempt(user_id, code, success=True)

    return {"message": "Student successfully linked.", "student": {"id": student.id, "nickname": student.nickname}}




@parent.route("/disconnect/<int:student_id>", methods=["POST"])
@require_login
@api_response
def disconnect_student(student_id):
    """Removes the connection between the authenticated parent and a student."""
    user_id = session.get("user")
    user_obj = db.session.get(User, user_id)

    if not user_obj or user_obj.role != "parent":
        return "Access denied. Parent account required.", 403

    student = db.session.get(User, student_id)
    if not student:
        return "Student not found.", 404

    if student not in user_obj.children:
        return "This student is not linked to your account.", 400

    user_obj.children.remove(student)
    db.session.commit()

    return {"message": f"Successfully disconnected from {student.nickname}."}


def _fmt_date(dt):
    """Format a datetime to e.g. 'Jul 4' cross-platform."""
    try:
        return dt.strftime("%b ") + str(dt.day)
    except Exception:
        return str(dt)[:10]


@parent.route("/student/<int:student_id>/history", methods=["GET"])
@require_login
@api_response
def get_student_history(student_id):
    """Returns 30-day historical duck balance and daily challenge completion counts for a linked student."""
    user_id = session.get("user")
    user_obj = db.session.get(User, user_id)

    if not user_obj or user_obj.role != "parent":
        return "Access denied. Parent account required.", 403

    child_ids = {child.id for child in user_obj.children}
    if student_id not in child_ids:
        return "Access denied. This student is not linked to your account.", 403

    student = db.session.get(User, student_id)
    if not student:
        return "Student not found.", 404

    from application.models.duck_transaction import DuckTransaction
    from application.models.challenge_log import ChallengeLog

    cutoff = datetime.utcnow() - timedelta(days=30)

    # --- Duck balance over time (last 30 days of transactions) ---
    transactions = (
        DuckTransaction.query
        .filter(DuckTransaction.user_id == student_id, DuckTransaction.timestamp >= cutoff)
        .order_by(DuckTransaction.timestamp.asc())
        .all()
    )

    # Build a running-balance series from the transactions
    # Start from 30 days ago: current balance minus all tx amounts in window
    tx_total_in_window = sum(t.amount for t in transactions)
    balance_at_start = (student.duck_balance or 0) - tx_total_in_window

    duck_labels = []
    duck_data = []
    running = balance_at_start
    for tx in transactions:
        running += tx.amount
        duck_labels.append(_fmt_date(tx.timestamp) if hasattr(tx.timestamp, "strftime") else str(tx.timestamp))
        duck_data.append(round(running, 2))

    # Add today's current balance as the final point if there are transactions
    if transactions:
        duck_labels.append("Now")
        duck_data.append(round(student.duck_balance or 0, 2))

    # --- Daily challenge completions (last 30 days) ---
    challenge_logs = (
        ChallengeLog.query
        .filter(ChallengeLog.user_id == student_id, ChallengeLog.timestamp >= cutoff)
        .order_by(ChallengeLog.timestamp.asc())
        .all()
    )

    # Aggregate by date
    daily_counts = {}
    for log in challenge_logs:
        date_str = _fmt_date(log.timestamp) if hasattr(log.timestamp, "strftime") else str(log.timestamp)[:10]
        daily_counts[date_str] = daily_counts.get(date_str, 0) + 1

    challenge_labels = list(daily_counts.keys())
    challenge_data = list(daily_counts.values())

    # --- Recent events feed (achievements + challenges, last 14 days) ---
    events = []
    event_cutoff = datetime.utcnow() - timedelta(days=14)

    for ua in student.achievements:
        if ua.earned_at and ua.earned_at >= event_cutoff:
            ach = ua.achievement
            events.append({
                "type": "achievement",
                "label": f"Earned \"{ach.name if ach else 'an achievement'}\"",
                "timestamp": ua.earned_at.isoformat(),
                "icon": "award",
            })

    for log in challenge_logs:
        if log.timestamp >= event_cutoff:
            events.append({
                "type": "challenge",
                "label": f"Completed challenge: {log.challenge_slug}",
                "timestamp": log.timestamp.isoformat(),
                "icon": "zap",
            })

    events.sort(key=lambda e: e["timestamp"], reverse=True)

    return {
        "duck_history": {
            "labels": duck_labels,
            "data": duck_data,
        },
        "challenge_history": {
            "labels": challenge_labels,
            "data": challenge_data,
        },
        "recent_events": events[:20],
        "current_balance": round(student.duck_balance or 0, 2),
    }


@parent.route("/contact-teacher", methods=["POST"])
@require_login
@api_response
def contact_teacher():
    """Allows a parent to send a message to the admin/teacher via the existing message system."""
    user_id = session.get("user")
    user_obj = db.session.get(User, user_id)

    if not user_obj or user_obj.role != "parent":
        return "Access denied. Parent account required.", 403

    data = request.json or {}
    subject = data.get("subject", "").strip()
    body = data.get("body", "").strip()

    if not body:
        return "Message body is required.", 400
    if len(body) > 2000:
        return "Message is too long (max 2000 characters).", 400

    # Find all admin users to broadcast to
    admins = User.query.filter_by(is_admin=True).all()
    if not admins:
        return "No teacher accounts found. Please contact your school directly.", 404

    # Compose the message content
    child_names = ", ".join(
        child.nickname or child.username for child in user_obj.children
    ) or "unknown student"
    parent_name = user_obj.nickname or user_obj.username
    full_content = (
        f"📩 **Parent Message** from {parent_name} (re: {child_names})\n\n"
        + (f"**Subject:** {subject}\n\n" if subject else "")
        + body
    )

    # Use the existing Message model to create a system message visible to admins
    from application.models.message import Message
    from application.extensions import db as _db

    msg = Message(
        user_id=user_obj.id,
        content=full_content,
        is_global=False,
        message_type="text",
    )
    # Target all admin users
    for admin in admins:
        msg.target_users.append(admin)

    _db.session.add(msg)
    _db.session.commit()

    return {"message": "Your message has been sent to the teacher."}
