import logging
from flask import Blueprint, jsonify, request, g
from application.models.message import Message, message_classrooms, message_users
from application.models.user import User
from application.decorators.login_required import require_login
from application.extensions import db

logger = logging.getLogger(__name__)

message = Blueprint("message", __name__)

@message.route("/api/feed", methods=["GET"])
@require_login
def get_feed():
    try:
        user = g.get("user")
        if not user:
            return jsonify({"success": False, "error": "User not logged in"}), 401

        limit = request.args.get("limit", 50, type=int)
        before_id = request.args.get("before_id", type=int)

        query = Message.query.filter(Message.deleted_at.is_(None))

        # Admin gets everything
        if not user.is_admin:
            # User classrooms
            user_classroom_ids = [c.id for c in user.classrooms]

            # Condition 1: Global messages
            # Condition 2: Authored by user
            # Condition 3: Targeted to user
            # Condition 4: Targeted to one of user's classrooms
            
            # Using SQLAlchemy any() or direct joins for associations
            query = query.filter(
                db.or_(
                    Message.is_global == True,
                    Message.user_id == user.id,
                    Message.target_users.any(User.id == user.id),
                    Message.target_classrooms.any(Message.target_classrooms.property.mapper.class_.id.in_(user_classroom_ids)) if user_classroom_ids else False
                )
            )

        if before_id:
            query = query.filter(Message.id < before_id)

        messages = query.order_by(Message.id.desc()).limit(limit).all()

        message_data = []
        for msg in messages:
            msg_dict = {
                "id": msg.id,
                "user_id": msg.user_id,
                "user_name": msg.user.nickname if msg.user and msg.user.nickname else (msg.user.username if msg.user else "Unknown"),
                "slug": msg.user.slug if msg.user else None,
                "user_profile_pic": msg.user.profile_picture if msg.user else None,
                "content": msg.content,
                "message_type": msg.message_type,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
                "is_global": msg.is_global,
                "target_live": msg.target_live,
                "target_classrooms": [c.name for c in msg.target_classrooms] if msg.target_classrooms else [],
                "target_users": [(u.nickname or u.username) for u in msg.target_users] if msg.target_users else [],
                "is_struck": msg.is_struck
            }
            message_data.append(msg_dict)

        return jsonify({"success": True, "messages": message_data})

    except Exception as e:
        logger.error(f"Error fetching feed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@message.route("/api/me/context", methods=["GET"])
@require_login
def get_me_context():
    try:
        user = g.get("user")
        if not user:
            return jsonify({"success": False, "error": "User not logged in"}), 401

        if user.is_admin:
            from application.models.classroom import Classroom
            classrooms = Classroom.query.all()
            users = User.query.filter(User.role != 'parent').all()
            
            classroom_data = [{"id": c.id, "name": c.name} for c in classrooms]
            user_data = [{"id": u.id, "username": u.username, "nickname": u.nickname} for u in users]
        else:
            classroom_data = [{"id": c.id, "name": c.name} for c in user.classrooms]
            user_data = []

        return jsonify({
            "success": True,
            "classrooms": classroom_data,
            "users": user_data
        })
    except Exception as e:
        logger.error(f"Error fetching context: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@message.route("/delete_message/<int:message_id>", methods=["DELETE"])
@require_login
def delete_message(message_id):
    """Admin-only endpoint to strike/delete a message."""
    user = g.get("user")
    if not user or not user.is_admin:
        return jsonify({"error": "Forbidden: Admin access required"}), 403

    try:
        from datetime import datetime
        msg = db.session.get(Message, message_id)
        if not msg:
            return jsonify({"error": "Message not found"}), 404

        msg.is_struck = True
        msg.deleted_at = datetime.utcnow()
        db.session.commit()

        # Broadcast deletion to everyone
        from application.extensions import socketio
        from application.constants import GLOBAL_CLASSROOM_ID

        socketio.emit(
            "message_deleted",
            {"message_id": msg.id},
            room=f"classroom:{GLOBAL_CLASSROOM_ID}"
        )
        
        # Also emit to individual rooms to ensure it reaches users who only got it directly
        socketio.emit(
            "message_deleted",
            {"message_id": msg.id}
        )

        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Error deleting message: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
