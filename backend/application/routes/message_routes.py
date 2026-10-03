import logging

from application.decorators.login_required import require_login
from application.extensions import db
from application.models.message import Message
from application.models.user import User
from application.utilities.helper_functions import utcnow_naive
from flask import Blueprint, g, jsonify, request
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)

message = Blueprint("message", __name__)

# A page of the feed is never larger than this, whatever ?limit= asks for
MAX_FEED_LIMIT = 100
# The unread badge counts within the newest messages only, as it always did (the layout
# used to fetch the latest 50 messages just to count them)
UNREAD_WINDOW = 50


def _visible_message_ids(user, classroom_id, before_id, limit):
    """Ids of the newest `limit` live messages `user` may see, newest first.

    Only ids are selected here, so the full models are fetched just for the page
    that is returned (get_feed) or not at all (get_unread_count).
    """
    from application.models.message import message_classrooms, message_users

    # Admin gets everything, UNLESS a classroom_id is specified
    if user.role == 'admin' and not classroom_id:
        query = db.session.query(Message.id).filter(Message.deleted_at.is_(None))
        if before_id:
            query = query.filter(Message.id < before_id)
        return [row[0] for row in query.order_by(Message.id.desc()).limit(limit)]

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
    return [row[0] for row in union_query.all()]


@message.route("/api/feed", methods=["GET"])
@require_login
def get_feed():
    try:
        user = g.get("user")
        if not user:
            return jsonify({"success": False, "error": "User not logged in"}), 401

        if getattr(user, "role", None) == "parent":
            return jsonify({"success": False, "error": "Forbidden: Parents cannot access chat feed"}), 403

        limit = max(1, min(request.args.get("limit", 50, type=int), MAX_FEED_LIMIT))
        before_id = request.args.get("before_id", type=int)
        classroom_id = request.args.get("classroom_id", type=str)

        message_ids = _visible_message_ids(user, classroom_id, before_id, limit)

        if message_ids:
            # Fetch full models only for the matched IDs, with their authors in one query
            messages = (
                Message.query.options(selectinload(Message.user))
                .filter(Message.id.in_(message_ids))
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


@message.route("/api/unread-count", methods=["GET"])
@require_login
def get_unread_count():
    """Unread badge for the layout, without shipping the messages themselves.

    Counts the messages newer than `last_read_id` among the newest UNREAD_WINDOW
    that /api/feed would show, and reports the newest visible id so a client with
    no read marker yet can start from it.
    """
    try:
        user = g.get("user")
        if not user:
            return jsonify({"success": False, "error": "User not logged in"}), 401

        if getattr(user, "role", None) == "parent":
            return jsonify({"success": False, "error": "Forbidden: Parents cannot access chat feed"}), 403

        last_read_id = request.args.get("last_read_id", type=int)

        message_ids = _visible_message_ids(user, None, None, UNREAD_WINDOW)

        count = (
            0
            if last_read_id is None
            else sum(1 for message_id in message_ids if message_id > last_read_id)
        )
        return jsonify(
            {
                "success": True,
                "count": count,
                "latest_id": message_ids[0] if message_ids else None,
            }
        )

    except Exception as e:
        logger.exception(f"Error counting unread messages: {e}")
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
            for c in classrooms:
                c.check_sandbox_expiry()
            # Read the rows before committing: a commit expires them, and reading
            # an expired row costs one query per classroom
            classroom_data = [
                {
                    "id": c.id,
                    "name": c.name,
                    "sandbox_active": bool(c.sandbox_active),
                }
                for c in classrooms
            ]
            db.session.commit()
            # The picker only needs three columns: no full User rows
            user_data = [
                {"id": uid, "username": username, "nickname": nickname}
                for uid, username, nickname in db.session.query(
                    User.id, User._username, User.nickname
                )
                .filter(User.role != "parent")
                .order_by(User._username)
            ]
        else:
            classrooms = user.classrooms
            for c in classrooms:
                c.check_sandbox_expiry()
            classroom_data = [
                {
                    "id": c.id,
                    "name": c.name,
                    "sandbox_active": bool(c.sandbox_active),
                }
                for c in classrooms
            ]
            db.session.commit()
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
        msg = db.session.get(Message, message_id)
        if not msg:
            return jsonify({"error": "Message not found"}), 404

        if user.role != 'admin' and msg.user_id != user.id:
            return jsonify(
                {"error": "Forbidden: Admin access or message author required"}
            ), 403

        msg.is_struck = True
        msg.deleted_at = utcnow_naive()
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
