"""
File: socket_events.py
Type: py
Summary: Socket.IO event handlers — classroom-scoped room joining and routing.

Room naming conventions:
    classroom:{classroom_id}   — one room per classroom
    classroom:global           — joined by all authenticated sockets
    user:{user_id}             — per-user room for push events (enrollment, DMs)
    admin                      — admins only
"""

from datetime import datetime
from flask import request, session
from flask_socketio import emit, join_room, leave_room

from application.extensions import db, socketio
from application.constants import GLOBAL_CLASSROOM_ID
import application.constants as _constants
from .models.user import User
from .models.classroom import user_classrooms
from .utilities.db_helpers import save_message_to_db

from sqlalchemy import select

# Track active socket connections per user to handle multiple tabs correctly
_active_sessions = {}  # {user_id: set([sid1, sid2, ...])}


def _get_enrolled_classroom_ids(user_id: int) -> list:
    """Return list of classroom IDs the user is enrolled in (DB query)."""
    rows = db.session.execute(
        select(user_classrooms.c.classroom_id).where(
            user_classrooms.c.user_id == user_id
        )
    ).fetchall()
    return [row[0] for row in rows]


@socketio.on("connect")
def handle_connect(auth=None):
    """
    On connect: re-verify session server-side, join per-classroom rooms.
    Client-supplied room identifiers are NOT trusted.
    """
    user_id = session.get("user")
    if not user_id:
        return False  # Reject unauthenticated connections

    user = User.query.get(user_id)
    if not user:
        return False

    # 1. Personal room (for push events like classroom_enrolled)
    join_room(f"user:{user.id}")

    # 2. Global room — every authenticated user
    join_room(f"classroom:{GLOBAL_CLASSROOM_ID}")

    # 3. One room per enrolled classroom
    enrolled_ids = _get_enrolled_classroom_ids(user.id)
    for cid in enrolled_ids:
        join_room(f"classroom:{cid}")

    # 4. Admin room
    if user.is_admin:
        join_room("admin")

    # Mark online
    if user.id not in _active_sessions:
        _active_sessions[user.id] = set()
    
    is_first_connection = len(_active_sessions[user.id]) == 0
    _active_sessions[user.id].add(request.sid)

    if is_first_connection:
        user.set_online(user.id, True)
        emit(
            "user_status_change",
            {"user_id": user.id, "is_online": True},
            broadcast=True,
        )


@socketio.on("disconnect")
def handle_disconnect(auth=None):
    user_id = session.get("user")
    if not user_id:
        return

    user = User.query.get(user_id)
    if user and user.id in _active_sessions:
        _active_sessions[user.id].discard(request.sid)
        
        if len(_active_sessions[user.id]) == 0:
            del _active_sessions[user.id]
            user.set_online(user.id, False)
            emit(
                "user_status_change",
                {"user_id": user.id, "is_online": False},
                broadcast=True,
            )


@socketio.on("send_message")
def handle_send_message(data):
    """
    Handle 'send_message' from the client.
    Server re-validates enrollment — client room IDs are not trusted.
    Emits 'message_received' only to the correct classroom room.
    """
    user_id = session.get("user")
    if not user_id:
        return

    user = User.query.get(user_id)
    if not user:
        return

    content = data.get("content")
    conversation_id = data.get("conversation_id")

    if not content or not conversation_id:
        return

    # Re-fetch the conversation to get its classroom_id
    from .models.conversation import Conversation
    conv = Conversation.query.get(conversation_id)
    if not conv:
        return

    classroom_id = conv.classroom_id
    is_global = classroom_id == GLOBAL_CLASSROOM_ID

    # ---- Server-side authorization ----------------------------------------
    if is_global:
        if not user.is_admin:
            # Silently drop — UI should have already gated this
            return
    else:
        if not user.is_admin:
            enrolled = db.session.execute(
                select(user_classrooms.c.classroom_id).where(
                    user_classrooms.c.user_id == user.id,
                    user_classrooms.c.classroom_id == classroom_id,
                )
            ).first()
            if not enrolled:
                return  # Not enrolled — drop silently; HTTP route returns 403

    # Ensure conversation is tracked in session for save_message_to_db
    session["conversation_id"] = conversation_id

    save_result = save_message_to_db(user.id, content, conversation_id=conversation_id)

    if not save_result.get("success"):
        return

    payload = {
        "id": save_result.get("message_id"),
        "user_id": user.id,
        "sender_id": user.id,
        "username": user.username,
        "nickname": user.nickname or user.username,
        "user_profile_pic": user.profile_picture,
        "slug": user.slug,
        "content": content,
        "timestamp": datetime.utcnow().isoformat(),
        "conversation_id": save_result.get("conversation_id"),
        "classroom_id": classroom_id,
        "is_global": is_global,
        "message_type": "text",
    }

    # Emit ONLY to the classroom room — never broadcast globally
    target_room = f"classroom:{classroom_id}"
    emit("message_received", payload, room=target_room)


def emit_classroom_enrolled(user_id: int, classroom_dict: dict):
    """
    Public helper — called from enrollment trigger in challenge_routes.py.
    Pushes a classroom_enrolled event to the student's personal socket room.
    """
    socketio.emit(
        "classroom_enrolled",
        {
            "classroom": classroom_dict,
            "user_id": user_id,
        },
        room=f"user:{user_id}",
    )
