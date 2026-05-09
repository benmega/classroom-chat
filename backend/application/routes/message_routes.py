"""
File: message_routes.py
Type: py
Summary: Flask routes for message/conversation functionality.
         Enforces classroom-scoped RBAC and Global Announcement access rules.
"""

from datetime import datetime

from flask import (
    Blueprint,
    request,
    jsonify,
    session,
    redirect,
)

from application.ai.ai_teacher import get_ai_response
from application.constants import GLOBAL_CLASSROOM_ID, GLOBAL_CONVERSATION_ID
import application.constants as _constants
from application.extensions import db, limiter
from application.models.banned_words import BannedWords
from application.models.classroom import Classroom, user_classrooms
from application.models.configuration import Configuration
from application.models.conversation import Conversation, conversation_users
from application.models.user import User
from application.utilities.db_helpers import get_user, save_message_to_db
from application.decorators.login_required import require_login

from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import select

message = Blueprint("message", __name__)


# ============================================================================
# HELPERS
# ============================================================================

def _get_enrolled_classroom_ids(user_id: int) -> set:
    """Return the set of classroom IDs the user is enrolled in."""
    rows = db.session.execute(
        select(user_classrooms.c.classroom_id).where(
            user_classrooms.c.user_id == user_id
        )
    ).fetchall()
    return {row[0] for row in rows}


def _user_enrolled_in(user_id: int, classroom_id: str) -> bool:
    """Return True if the user has an enrollment row for classroom_id."""
    row = db.session.execute(
        select(user_classrooms.c.classroom_id).where(
            user_classrooms.c.user_id == user_id,
            user_classrooms.c.classroom_id == classroom_id,
        )
    ).first()
    return row is not None


# ============================================================================
# SEND MESSAGE
# ============================================================================

@message.route("/send_message", methods=["POST"])
@limiter.limit("20 per minute; 100 per day")
def send_message():
    session_userid = session.get("user")
    form_message = request.form.get("message")

    if not session_userid:
        return jsonify(success=False, error="No session username found"), 400

    user = get_user(session_userid)
    if not user:
        return jsonify(success=False, error="Unknown User"), 403

    config = Configuration.query.first()
    if not config:
        return jsonify(success=False, error="No Configuration Found"), 500
    if not user.is_admin and not config.message_sending_enabled:
        return jsonify(success=False, error="Non-admin messages are disabled"), 403

    conversation_id = request.form.get("conversation_id")
    if not conversation_id:
        return jsonify(success=False, error="conversation_id is required"), 400

    conv = Conversation.query.get(conversation_id)
    if not conv:
        return jsonify(success=False, error="Conversation not found"), 404

    # ---- Global Announcement guard ----------------------------------------
    if conv.classroom_id == GLOBAL_CLASSROOM_ID:
        if not user.is_admin:
            return jsonify(
                success=False,
                error="Only instructors may post to the Global Announcements feed."
            ), 403

    # ---- Classroom enrollment guard (non-global) ---------------------------
    elif not user.is_admin:
        if not _user_enrolled_in(user.id, conv.classroom_id):
            return jsonify(
                success=False,
                error="You are not enrolled in this classroom."
            ), 403

    # ---- Conversation-level moderation ------------------------------------
    if conv.is_locked and not user.is_admin:
        return jsonify(success=False, error="This conversation is locked by admin"), 403

    if conv.slow_mode_delay > 0 and not user.is_admin:
        from application.models.message import Message
        from datetime import timedelta
        last_msg = (
            Message.query
            .filter_by(conversation_id=conv.id, user_id=user.id)
            .order_by(Message.created_at.desc())
            .first()
        )
        if last_msg:
            time_passed = (datetime.utcnow() - last_msg.created_at).total_seconds()
            if time_passed < conv.slow_mode_delay:
                wait_time = int(conv.slow_mode_delay - time_passed)
                return jsonify(
                    success=False,
                    error=f"Slow mode active. Please wait {wait_time} more seconds."
                ), 429

    if not message_is_appropriate(form_message):
        return jsonify(success=False, error="Inappropriate messages are not allowed"), 403

    if not save_message_to_db(user.id, form_message, conversation_id=conversation_id):
        return jsonify(success=False, error="Database commit failed"), 500

    if config.ai_teacher_enabled:
        ai_teacher_response = get_ai_response(form_message, user.username)
        return jsonify(success=True, ai_teacher_response=ai_teacher_response)

    return jsonify(success=True), 200


# ============================================================================
# START CONVERSATION (admin only)
# ============================================================================

@message.route("/start_conversation", methods=["POST"])
def start_conversation():
    user_id = session.get("user")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({"error": "Only admins can create conversations"}), 403

    if request.is_json:
        data = request.get_json()
        title = data.get("title")
        classroom_id = data.get("classroom_id")
    else:
        title = request.form.get("title")
        classroom_id = request.form.get("classroom_id")

    # Conversations must belong to a classroom
    if not classroom_id:
        return jsonify({"error": "classroom_id is required"}), 400

    if not Classroom.query.get(classroom_id):
        return jsonify({"error": f"Classroom '{classroom_id}' not found"}), 404

    if title and title.strip():
        new_conversation = Conversation(title=title, creator_id=user.id, classroom_id=classroom_id)
    else:
        new_conversation = Conversation(creator_id=user.id, classroom_id=classroom_id)

    new_conversation.users.append(user)
    db.session.add(new_conversation)
    db.session.commit()

    session["conversation_id"] = new_conversation.id

    # Emit to the classroom room so all enrolled users see the new conversation in their sidebar
    from application.extensions import socketio
    socketio.emit(
        "conversation_created",
        {
            "conversation_id": new_conversation.id,
            "title": new_conversation.title,
            "classroom_id": new_conversation.classroom_id,
        },
        room=f"classroom:{new_conversation.classroom_id}"
    )

    return jsonify({
        "conversation_id": new_conversation.id,
        "title": new_conversation.title,
        "classroom_id": new_conversation.classroom_id,
    }), 201


@message.route("/update_conversation", methods=["POST"])
@require_login
def update_conversation():
    """
    Admin-only endpoint to update conversation metadata or moderation settings.
    Allows renaming, locking, or setting slow mode delay.
    """
    user_id = session.get("user")
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({"error": "Forbidden: Admin access required"}), 403

    data = request.get_json() or {}
    conv_id = data.get("conversation_id")
    conv = Conversation.query.get(conv_id)
    if not conv:
        return jsonify({"error": "Conversation not found"}), 404

    if "is_locked" in data:
        conv.is_locked = bool(data["is_locked"])
    if "slow_mode_delay" in data:
        try:
            conv.slow_mode_delay = int(data["slow_mode_delay"])
        except (ValueError, TypeError):
            return jsonify({"error": "slow_mode_delay must be an integer"}), 400
    if "title" in data and data["title"]:
        conv.title = str(data["title"]).strip()

    db.session.commit()

    # Broadcast update to the classroom room
    from application.extensions import socketio
    socketio.emit(
        "conversation_updated",
        {
            "conversation_id": conv.id,
            "title": conv.title,
            "is_locked": conv.is_locked,
            "slow_mode_delay": conv.slow_mode_delay,
            "classroom_id": conv.classroom_id
        },
        room=f"classroom:{conv.classroom_id}"
    )

    return jsonify({
        "success": True,
        "conversation": {
            "conversation_id": conv.id,
            "title": conv.title,
            "is_locked": conv.is_locked,
            "slow_mode_delay": conv.slow_mode_delay
        }
    })


@message.route("/delete_conversation/<int:conversation_id>", methods=["DELETE"])
@require_login
def delete_conversation(conversation_id):
    """Admin-only endpoint to permanently remove a conversation."""
    user_id = session.get("user")
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({"error": "Forbidden: Admin access required"}), 403

    conv = Conversation.query.get(conversation_id)
    if not conv:
        return jsonify({"error": "Conversation not found"}), 404

    # The Global Announcements feed cannot be deleted
    if conv.classroom_id == GLOBAL_CLASSROOM_ID:
        return jsonify({"error": "The Global Announcements feed cannot be deleted"}), 400

    classroom_id = conv.classroom_id
    conversation_id = conv.id

    db.session.delete(conv)
    db.session.commit()

    # Broadcast deletion to the classroom room
    from application.extensions import socketio
    socketio.emit(
        "conversation_deleted",
        {
            "conversation_id": conversation_id,
            "classroom_id": classroom_id
        },
        room=f"classroom:{classroom_id}"
    )

    return jsonify({"success": True})


# ============================================================================
# ME CONTEXT — called once on login by the frontend
# ============================================================================

@message.route("/api/me/context", methods=["GET"])
@require_login
def get_me_context():
    """
    Returns the current user's enrolled classrooms and the global conversation ID.
    The frontend calls this once on login to populate the sidebar and set the
    default open conversation to the Global Announcements feed.
    """
    user_id = session.get("user")
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Refresh the in-process constant in case the server just started
    global_conv_id = _constants.GLOBAL_CONVERSATION_ID

    if user.is_admin:
        # Admins see all classrooms
        classrooms = Classroom.query.all()
    else:
        # Students see only their enrolled classrooms
        classrooms = user.classrooms

    return jsonify({
        "global_conversation_id": global_conv_id,
        "global_classroom_id": GLOBAL_CLASSROOM_ID,
        "classrooms": [c.to_dict() for c in classrooms],
    }), 200


# ============================================================================
# CONVERSATION HISTORY (scoped)
# ============================================================================

@message.route("/api/conversations/<int:user_id>", methods=["GET"])
@require_login
def get_conversation_history(user_id):
    current_user_id = session.get("user")
    current_user = User.query.get(current_user_id)

    if user_id != current_user_id and not getattr(current_user, "is_admin", False):
        return jsonify({"error": "Forbidden: You can only access your own conversation history"}), 403

    if getattr(current_user, "is_admin", False):
        # Admins see all conversations
        conversations = (
            Conversation.query
            .options(selectinload(Conversation.messages))
            .order_by(Conversation.created_at.desc())
            .all()
        )
    else:
        # Students see:
        # 1. The global feed (always)
        # 2. Any conversation in a classroom they are enrolled in
        enrolled_ids = _get_enrolled_classroom_ids(current_user_id)
        allowed_classroom_ids = enrolled_ids | {GLOBAL_CLASSROOM_ID}

        conversations = (
            Conversation.query
            .filter(Conversation.classroom_id.in_(allowed_classroom_ids))
            .options(selectinload(Conversation.messages))
            .order_by(Conversation.created_at.desc())
            .all()
        )

    return jsonify([
        {
            "conversation_id": conv.id,
            "title": conv.title,
            "classroom_id": conv.classroom_id,
            "is_global": conv.classroom_id == GLOBAL_CLASSROOM_ID,
            "is_locked": conv.is_locked,
            "slow_mode_delay": conv.slow_mode_delay,
            "messages": [serialize_message(msg) for msg in conv.messages if not msg.is_struck],
        }
        for conv in conversations
    ])


# ============================================================================
# VIEW / MANAGE INDIVIDUAL CONVERSATIONS
# ============================================================================

@message.route("/set_active_conversation", methods=["POST"])
@require_login
def set_active_conversation():
    conversation_id = request.json.get("conversation_id")
    conversation = Conversation.query.get(conversation_id)
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404

    session["conversation_id"] = conversation_id
    return jsonify({"message": "Conversation updated", "conversation_id": conversation_id}), 200


@message.route("/get_current_conversation", methods=["GET"])
@limiter.limit("60 per minute")
@require_login
def get_current_conversation():
    conversation = (
        Conversation.query.options(joinedload(Conversation.messages))
        .order_by(Conversation.created_at.desc())
        .first()
    )
    if not conversation:
        return jsonify({"error": "No active conversation available"}), 400

    session["conversation_id"] = conversation.id
    conversation_data = {
        "conversation_id": conversation.id,
        "title": conversation.title,
        "messages": [serialize_message(msg) for msg in conversation.messages],
    }
    return jsonify(conversation=conversation_data)


@message.route("/get_historical_conversation", methods=["GET"])
@require_login
def get_historical_conversation():
    conversation_id = session.get("conversation_id")
    if not conversation_id:
        return jsonify({"error": "No historical conversation in session"}), 400

    conversation = Conversation.query.get(conversation_id)
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404

    conversation_data = {
        "conversation_id": conversation.id,
        "title": conversation.title,
        "messages": [serialize_message(msg) for msg in conversation.messages],
    }
    return jsonify(conversation=conversation_data)


@message.route("/end_conversation", methods=["POST"])
@require_login
def end_conversation():
    if "conversation_id" in session:
        session.pop("conversation_id")
        return jsonify({"message": "Conversation ended"}), 200
    return jsonify({"error": "No active conversation to end"}), 400


@message.route("/get_conversation", methods=["GET"])
@require_login
def get_conversation():
    conversation_id = session.get("conversation_id")
    if not conversation_id:
        return jsonify({"error": "No active conversation"}), 400

    conversation = Conversation.query.options(joinedload(Conversation.messages)).get(conversation_id)
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404

    conversation_data = {
        "conversation_id": conversation.id,
        "title": conversation.title,
        "messages": [serialize_message(msg) for msg in conversation.messages],
    }
    return jsonify(conversation=conversation_data)


@message.route("/conversation_history", methods=["GET"])
def conversation_history():
    if "user" not in session:
        if request.is_json or request.accept_mimetypes.accept_json:
            return {"error": "Authentication required"}, 401
        return redirect("/login")

    user_id = session["user"]
    user = User.query.filter_by(id=user_id).first()

    if not user:
        if request.is_json or request.accept_mimetypes.accept_json:
            return {"error": "User not found"}, 404
        return redirect("/login")

    if user.is_admin:
        conversations = (
            Conversation.query
            .options(selectinload(Conversation.messages))
            .order_by(Conversation.created_at.desc())
            .all()
        )
    else:
        enrolled_ids = _get_enrolled_classroom_ids(user_id)
        allowed_ids = enrolled_ids | {GLOBAL_CLASSROOM_ID}
        conversations = (
            Conversation.query
            .filter(Conversation.classroom_id.in_(allowed_ids))
            .options(selectinload(Conversation.messages))
            .order_by(Conversation.created_at.desc())
            .all()
        )

    if request.is_json or request.accept_mimetypes.accept_json:
        return jsonify([
            {
                "conversation_id": conv.id,
                "title": conv.title,
                "classroom_id": conv.classroom_id,
                "created_at": conv.created_at.isoformat() if conv.created_at else None,
            }
            for conv in conversations
        ])

    return redirect("/chat/history")


@message.route("/view_conversation/<int:conversation_id>", methods=["GET"])
@require_login
def view_conversation(conversation_id):
    conversation = Conversation.query.get_or_404(conversation_id)
    conversation_data = {
        "conversation_id": conversation.id,
        "title": conversation.title,
        "messages": [serialize_message(msg) for msg in conversation.messages],
    }
    if request.is_json or request.accept_mimetypes.accept_json:
        return jsonify(conversation_data)
    return redirect(f"/chat/view/{conversation_id}")


# ============================================================================
# MESSAGE VALIDATION
# ============================================================================

def message_is_appropriate(message):
    banned_words = [word.word for word in BannedWords.query.all()]
    return is_appropriate(message=message, banned_words=banned_words)


def is_appropriate(message, banned_words=None):
    if banned_words is None:
        banned_words = []
    message_lower = message.lower()
    banned_words = [word.lower() for word in banned_words]
    return not any(word in message_lower for word in banned_words)


# ============================================================================
# SERIALIZATION
# ============================================================================

def serialize_message(msg):
    user = getattr(msg, "user", None)
    if user:
        username = getattr(user, "username", None)
        nickname = getattr(user, "nickname", None)
        profile_pic = getattr(user, "profile_picture", None)
        slug = getattr(user, "slug", None)
    else:
        username = None
        nickname = "Deleted User"
        profile_pic = None
        slug = None

    timestamp = getattr(msg, "created_at", None)
    if timestamp is not None:
        timestamp = timestamp.isoformat()

    conv = getattr(msg, "conversation", None)
    classroom_id = getattr(conv, "classroom_id", None) if conv else None

    return {
        "id": msg.id,
        "user_id": msg.user_id,
        "sender_id": msg.user_id,          # alias for WS parity
        "username": username,
        "nickname": nickname,
        "user_profile_pic": profile_pic,
        "slug": slug,
        "content": msg.content,
        "timestamp": timestamp,
        "message_type": getattr(msg, "message_type", "text"),
        "classroom_id": classroom_id,
        "is_global": classroom_id == GLOBAL_CLASSROOM_ID,
        "conversation_id": msg.conversation_id,
    }
