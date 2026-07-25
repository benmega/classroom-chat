"""
File: classroom_routes.py
Type: py
Summary: Student-facing blueprint for classroom join-code enrollment
         and enrolled-classroom listing.
"""

from flask import Blueprint, request, session

from application.decorators.api_response import api_response
from application.decorators.login_required import require_login
from application.extensions import db
from application.models.classroom import Classroom
from application.models.classroom_join_attempt import ClassroomJoinAttempt
from application.models.user import User

classroom_bp = Blueprint("classroom_bp", __name__)

# Reserved classroom IDs that students must never be able to join directly.
_RESERVED_IDS = {"global", "archive"}


@classroom_bp.route("/join", methods=["POST"])
@require_login
@api_response
def join_classroom():
    """
    Student submits {"code": "XXXXX"} to enroll in a classroom.

    Steps:
      1. Validate the user session and role (parents cannot join classrooms).
      2. Rate-limit check.
      3. Look up the classroom by join code.
      4. Ensure the student is not already enrolled.
      5. Guard against reserved classrooms.
      6. Enroll and return success.
    """
    user_id = session.get("user")
    user = User.query.get(user_id)
    if not user:
        return "User not found.", 401

    if user.role == "parent":
        return "Parents cannot join classrooms via a join code.", 403

    data = request.get_json(silent=True) or {}
    code = (data.get("code") or "").strip().upper()
    if not code:
        return "Join code is required.", 400

    # ── Rate limiting ────────────────────────────────────────────────────────
    is_allowed, error_msg = ClassroomJoinAttempt.check_rate_limits(user_id)
    if not is_allowed:
        ClassroomJoinAttempt.log_attempt(user_id, code, success=False)
        return error_msg, 429

    # ── Code lookup ──────────────────────────────────────────────────────────
    classroom = Classroom.query.filter_by(join_code=code).first()
    if not classroom:
        ClassroomJoinAttempt.log_attempt(user_id, code, success=False)
        return "Invalid classroom code.", 404

    # ── Reserved classroom guard ─────────────────────────────────────────────
    if classroom.id in _RESERVED_IDS:
        return "Cannot join reserved classrooms.", 400

    # ── Already enrolled check ───────────────────────────────────────────────
    if user in classroom.users:
        ClassroomJoinAttempt.log_attempt(user_id, code, success=False)
        return "Already enrolled in this classroom.", 400

    # ── Enroll ───────────────────────────────────────────────────────────────
    classroom.users.append(user)
    db.session.commit()
    ClassroomJoinAttempt.log_attempt(user_id, code, success=True)

    return {
        "message": "Successfully joined classroom.",
        "classroom": {
            "id": classroom.id,
            "name": classroom.name,
        },
    }


@classroom_bp.route("/mine", methods=["GET"])
@require_login
@api_response
def my_classrooms():
    """
    Returns all classrooms the authenticated student is enrolled in,
    excluding the reserved 'global' and 'archive' classrooms.
    """
    user_id = session.get("user")
    user = User.query.get(user_id)
    if not user:
        return "User not found.", 401

    classrooms = [
        {
            "id": c.id,
            "name": c.name,
            "language": c.language,
        }
        for c in (user.classrooms or [])
        if c.id not in _RESERVED_IDS
    ]

    return {"classrooms": classrooms}
