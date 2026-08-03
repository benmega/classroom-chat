import logging

from application.decorators.login_required import require_login
from application.extensions import db
from application.models.message import Message
from application.models.user import User
from flask import Blueprint, g, jsonify, request

logger = logging.getLogger(__name__)

message = Blueprint("message", __name__)


@message.route("/api/feed", methods=["GET"])
@require_login
def get_feed():
    try:
        user = g.get("user")
        if not user:
            return jsonify({"success": False, "error": "User not logged in"}), 401

        if getattr(user, "role", None) == "parent":
            return jsonify({"success": False, "error": "Forbidden: Parents cannot access chat feed"}), 403

        limit = request.args.get("limit", 50, type=int)
        before_id = request.args.get("before_id", type=int)
        classroom_id = request.args.get("classroom_id", type=str)

        from application.models.message import message_classrooms, message_users

        # Admin gets everything, UNLESS a classroom_id is specified
        if user.role == 'admin' and not classroom_id:
            query = Message.query.filter(Message.deleted_at.is_(None))
            if before_id:
                query = query.filter(Message.id < before_id)
            messages = query.order_by(Message.id.desc()).limit(limit).all()
        else:
            user_classroom_ids = [classroom_id] if classroom_id else [c.id for c in user.classrooms]




            # Use UNION to avoid massive table scan with OR + EXISTS
            base_query = db.session.query(Message.id).filter(
                Message.deleted_at.is_(None)
            )
            if before_id:
                base_query = base_query.filter(Message.id < before_id)

            q1 = base_query.filter(Message.is_global.is_(True))

            queries = [q1]

            if not classroom_id:
                # If a specific classroom filter is NOT applied, include direct messages
                q2 = base_query.filter(Message.user_id == user.id)
                q3 = base_query.join(
                    message_users, Message.id == message_users.c.message_id
                ).filter(message_users.c.user_id == user.id)
                queries.extend([q2, q3])

            # If a specific classroom filter IS applied, include messages by this user
            # to ensure they see their own messages in the stream even if they are missing from classroom target somehow
            # Wait, no, we only want messages targeted at this classroom or global.
            # But the user might want to see their own global/classroom messages. Those will be caught by q1 and q4.

            if user_classroom_ids:
                q4 = base_query.join(
                    message_classrooms, Message.id == message_classrooms.c.message_id
                ).filter(message_classrooms.c.classroom_id.in_(user_classroom_ids))
                queries.append(q4)

            from sqlalchemy import desc

            union_query = (
                queries[0].union(*queries[1:]).order_by(desc(Message.id)).limit(limit)
            )
            message_ids = [row[0] for row in union_query.all()]

            if message_ids:
                # Fetch full models only for the matched IDs
                messages = (
                    Message.query.filter(Message.id.in_(message_ids))
                    .order_by(Message.id.desc())
                    .all()
                )
            else:
                messages = []

        message_data = []
        for msg in messages:
            msg_dict = {
                "id": msg.id,
                "user_id": msg.user_id,
                "user_name": msg.user.nickname
                if msg.user and msg.user.nickname
                else (msg.user.username if msg.user else "Unknown"),
                "slug": msg.user.slug if msg.user else None,
                "user_profile_pic": msg.user.profile_picture if msg.user else None,
                "content": msg.content,
                "message_type": msg.message_type,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
                "is_global": msg.is_global,
                "target_live": msg.target_live,
                "target_classrooms": [c.name for c in msg.target_classrooms]
                if msg.target_classrooms
                else [],
                "target_classroom_ids": [c.id for c in msg.target_classrooms]
                if msg.target_classrooms
                else [],
                "target_users": [(u.nickname or u.username) for u in msg.target_users]
                if msg.target_users
                else [],
                "is_struck": msg.is_struck,
                "has_animated_border": msg.has_animated_border,
                "animated_border_speed": msg.animated_border_speed,
                "animated_border_color": msg.animated_border_color,
                "chat_font_color": msg.chat_font_color,
            }
            message_data.append(msg_dict)

        return jsonify({"success": True, "messages": message_data})

    except Exception as e:
        logger.exception(f"Error fetching feed: {e}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@message.route("/api/me/context", methods=["GET"])
@require_login
def get_me_context():
    try:
        user = g.get("user")
        if not user:
            return jsonify({"success": False, "error": "User not logged in"}), 401

        if user.role == 'admin':
            from application.models.classroom import Classroom

            classrooms = Classroom.query.all()
            users = User.query.filter(User.role != "parent").all()

            classroom_data = [{"id": c.id, "name": c.name} for c in classrooms]
            user_data = [
                {"id": u.id, "username": u.username, "nickname": u.nickname}
                for u in users
            ]
        else:
            classroom_data = [{"id": c.id, "name": c.name} for c in user.classrooms]
            user_data = []

        return jsonify(
            {"success": True, "classrooms": classroom_data, "users": user_data}
        )
    except Exception as e:
        logger.exception(f"Error fetching context: {e}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@message.route("/delete_message/<int:message_id>", methods=["DELETE"])
@require_login
def delete_message(message_id):
    """Admin or author endpoint to strike/delete a message."""
    user = g.get("user")
    if not user:
        return jsonify({"error": "Forbidden: Login required"}), 401

    try:
        from datetime import datetime

        msg = db.session.get(Message, message_id)
        if not msg:
            return jsonify({"error": "Message not found"}), 404

        if user.role != 'admin' and msg.user_id != user.id:
            return jsonify(
                {"error": "Forbidden: Admin access or message author required"}
            ), 403

        msg.is_struck = True
        msg.deleted_at = datetime.utcnow()
        db.session.commit()

        # Broadcast deletion to everyone
        from application.constants import GLOBAL_CLASSROOM_ID
        from application.extensions import socketio

        socketio.emit(
            "message_deleted",
            {"message_id": msg.id},
            room=f"classroom:{GLOBAL_CLASSROOM_ID}",
        )

        # Also emit to individual rooms to ensure it reaches users who only got it directly
        socketio.emit("message_deleted", {"message_id": msg.id})

        return jsonify({"success": True})
    except Exception as e:
        logger.exception(f"Error deleting message: {e}")
        return jsonify({"success": False, "error": "Internal server error"}), 500
