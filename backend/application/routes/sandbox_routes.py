"""
File: sandbox_routes.py
Type: py
Summary: API routes for Classroom Sandbox Mode, including LevelGame administration,
         CSV ingestion, classroom sandbox toggling, status reporting, and student games.
"""

import contextlib
from datetime import datetime

from application.decorators.admin_required import admin_only
from application.extensions import csrf, db, socketio
from application.models.classroom import Classroom
from application.models.level_game import LevelGame
from application.models.message import Message
from application.models.user import User
from application.services.level_game_service import (
    get_student_sandbox_games,
    ingest_games_csv,
)
from flask import Blueprint, Response, g, jsonify, request, session

sandbox_bp = Blueprint("sandbox_bp", __name__)


@sandbox_bp.route("/admin/level-games/upload-csv", methods=["POST"])
@admin_only
@csrf.exempt
def upload_level_games_csv():
    """Accepts a multipart CSV file and ingests level games."""
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file uploaded in 'file' field"}), 400

    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"success": False, "error": "No selected file"}), 400

    replace_all = request.form.get("replace_all", "true").lower() in ("true", "1", "yes")
    result = ingest_games_csv(file, replace_all=replace_all)
    status_code = 200 if result.get("success") else 400
    return jsonify(result), status_code


@sandbox_bp.route("/admin/level-games", methods=["GET"])
@admin_only
def get_admin_level_games():
    """Returns list of uploaded level games, supporting ?course_id= and ?chapter= filters."""
    course_id = request.args.get("course_id")
    chapter = request.args.get("chapter")

    query = LevelGame.query
    if course_id:
        query = query.filter_by(course_id=course_id)
    if chapter is not None and chapter != "":
        try:
            query = query.filter_by(chapter=int(chapter))
        except ValueError:
            pass

    games = query.order_by(LevelGame.progression_order.asc(), LevelGame.id.asc()).all()
    return jsonify({
        "success": True,
        "count": len(games),
        "games": [g.to_dict() for g in games],
    }), 200


@sandbox_bp.route("/admin/level-games", methods=["DELETE"])
@admin_only
def delete_admin_level_games():
    """Clears all level games."""
    deleted_count = LevelGame.query.delete()
    db.session.commit()
    return jsonify({
        "success": True,
        "message": f"Successfully deleted {deleted_count} games",
        "deleted": deleted_count,
    }), 200


@sandbox_bp.route("/admin/level-games/sample-csv", methods=["GET"])
@admin_only
def download_sample_csv():
    """Downloads a valid sample CSV for level games."""
    sample_csv_content = (
        "Title,Link,Assigned Lesson,Chapter,Chapter Name,Platform,Comment,RequiresAccount,Rating,Verified\n"
        "Kithgard Dungeon,https://codecombat.com/play/level/kithgard-dungeon,1.1a,1,CS1,Web,Introductory dungeon level,False,4.5,True\n"
        "Gems in the Deep,https://codecombat.com/play/level/gems-in-the-deep,1.1b,1,CS1,Web,Basic movement practice,False,4.6,True\n"
        "Shadow Guard,https://codecombat.com/play/level/shadow-guard,1.2a,1,CS1,Web,Avoid the guard patrol,False,4.7,True\n"
    )
    return Response(
        sample_csv_content,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=level_games_sample.csv"},
    )


@sandbox_bp.route("/admin/classrooms/<class_id>/sandbox/toggle", methods=["POST"])
@admin_only
@csrf.exempt
def toggle_classroom_sandbox(class_id):
    """
    Toggles sandbox mode for a classroom.
    Accepts optional JSON {"sandbox_active": bool} or toggles current boolean.
    Updates classroom.sandbox_active and classroom.sandbox_activated_at.
    Emits Socket.IO event sandbox_status_changed to f"classroom:{class_id}".
    When turned ON, creates an automated message in Message for that classroom.
    """
    classroom = db.session.get(Classroom, class_id)
    if not classroom:
        return jsonify({"error": "Classroom not found"}), 404

    data = request.get_json(silent=True) or {}
    if "sandbox_active" in data:
        is_active = bool(data["sandbox_active"])
    else:
        is_active = not classroom.sandbox_active

    classroom.sandbox_active = is_active
    classroom.sandbox_activated_at = datetime.utcnow() if is_active else None

    if is_active:
        user_id = session.get("user")
        admin_user = (
            getattr(g, "user", None)
            or (db.session.get(User, user_id) if user_id else None)
            or User.query.filter_by(role="admin").first()
        )
        sender_id = admin_user.id if admin_user else 1

        announcement_content = (
            "🎉 All Tests Passed! Sandbox Mode is now active! Click to play your unlocked games."
        )
        new_message = Message(
            user_id=sender_id,
            content=announcement_content,
            message_type="text",
            is_global=False,
            target_live=False,
        )
        new_message.target_classrooms.append(classroom)
        db.session.add(new_message)
        db.session.flush()

        msg_payload = {
            "id": new_message.id,
            "user_id": sender_id,
            "user_name": (admin_user.nickname or admin_user.username) if admin_user else "System",
            "slug": admin_user.slug if admin_user else "system",
            "user_profile_pic": admin_user.profile_picture if admin_user else None,
            "content": new_message.content,
            "message_type": "text",
            "created_at": (
                new_message.created_at.isoformat()
                if new_message.created_at
                else datetime.utcnow().isoformat()
            ),
            "is_global": False,
            "target_live": False,
            "target_classrooms": [classroom.name],
            "target_classroom_ids": [classroom.id],
            "target_users": [],
            "is_struck": False,
            "has_animated_border": False,
            "animated_border_speed": "normal",
            "animated_border_color": None,
            "chat_font_color": None,
        }
        with contextlib.suppress(Exception):
            socketio.emit("message_received", msg_payload, room=f"classroom:{class_id}")

    db.session.commit()

    activated_at_iso = (
        classroom.sandbox_activated_at.isoformat()
        if classroom.sandbox_activated_at
        else None
    )

    status_payload = {
        "classroom_id": class_id,
        "sandbox_active": is_active,
        "activated_at": activated_at_iso,
    }
    with contextlib.suppress(Exception):
        socketio.emit("sandbox_status_changed", status_payload, room=f"classroom:{class_id}")
        socketio.emit("sandbox_status_changed", status_payload, room="admin")

    return jsonify({
        "success": True,
        "sandbox_active": is_active,
        "activated_at": activated_at_iso,
    }), 200


@sandbox_bp.route("/classrooms/<class_id>/sandbox-status", methods=["GET"])
def get_classroom_sandbox_status(class_id):
    """Returns sandbox status and activation timestamp for a classroom."""
    classroom = db.session.get(Classroom, class_id)
    if not classroom:
        return jsonify({"error": "Classroom not found"}), 404

    return jsonify({
        "sandbox_active": bool(classroom.sandbox_active),
        "activated_at": (
            classroom.sandbox_activated_at.isoformat()
            if classroom.sandbox_activated_at
            else None
        ),
    }), 200


@sandbox_bp.route("/student/classrooms/<class_id>/sandbox-games", methods=["GET"])
def get_student_sandbox_games_route(class_id):
    """Returns available sandbox games for the logged-in student in the specified classroom."""
    user_id = session.get("user")
    user = getattr(g, "user", None) or (db.session.get(User, user_id) if user_id else None)
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    classroom = db.session.get(Classroom, class_id)
    if not classroom:
        return jsonify({"error": "Classroom not found"}), 404

    result = get_student_sandbox_games(user, classroom)
    return jsonify(result), 200
