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
from flask_socketio import emit, join_room

from application.extensions import db, socketio
from application.constants import GLOBAL_CLASSROOM_ID
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

    user = db.session.get(User, user_id)
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

    user = db.session.get(User, user_id)
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
    Handle 'send_message' from the client for the unified feed.
    """
    user_id = session.get("user")
    if not user_id:
        return

    user = db.session.get(User, user_id)
    if not user:
        return

    content = data.get("content")
    if not content or len(content) > 4000:
        return

    # Parse targeting parameters from frontend
    is_global = data.get("is_global", False)
    target_live = data.get("target_live", False)
    target_classrooms = data.get("target_classrooms", [])
    target_users = data.get("target_users", [])

    # Server-side validation
    if not user.is_admin:
        # Students can't send global messages
        is_global = False
        # Students can only target their own classrooms
        enrolled_ids = _get_enrolled_classroom_ids(user.id)
        # Filter target_classrooms to only those the student is enrolled in
        if target_classrooms:
            target_classrooms = [cid for cid in target_classrooms if cid in enrolled_ids]
        else:
            # Default to all their classrooms if not specified
            target_classrooms = enrolled_ids
            
        # Optional: restrict students from targeting specific users unless explicitly allowed.
        # But per the prompt, students can post to live students and their specific classroom.
        target_users = []

    save_result = save_message_to_db(
        user.id, 
        message=content, 
        is_global=is_global, 
        target_live=target_live, 
        target_classrooms=target_classrooms,
        target_user_ids=target_users
    )

    if not save_result.get("success"):
        return

    from .models.message import Message
    msg = db.session.get(Message, save_result.get("message_id"))

    payload = {
        "id": msg.id,
        "user_id": user.id,
        "user_name": user.nickname if user.nickname else user.username,
        "slug": user.slug,
        "user_profile_pic": user.profile_picture,
        "content": msg.content,
        "message_type": msg.message_type,
        "created_at": msg.created_at.isoformat() if msg.created_at else datetime.utcnow().isoformat(),
        "is_global": msg.is_global,
        "target_live": msg.target_live,
        "target_classrooms": [c.name for c in msg.target_classrooms] if msg.target_classrooms else [],
        "target_users": [(u.nickname or u.username) for u in msg.target_users] if msg.target_users else [],
        "is_struck": msg.is_struck
    }

    # Emit to appropriate rooms
    if is_global:
        emit("message_received", payload, room=f"classroom:{GLOBAL_CLASSROOM_ID}")
    else:
        # Emit to specific classrooms
        for cid in target_classrooms:
            emit("message_received", payload, room=f"classroom:{cid}")
            
        # Emit to sender
        emit("message_received", payload, room=f"user:{user.id}")
        
        # Emit to specifically targeted users
        for uid in target_users:
            if uid != user.id:
                emit("message_received", payload, room=f"user:{uid}")

        if target_live:
            online_users = User.query.filter_by(is_online=True).all()
            for u in online_users:
                # Basic dedup: if u in target_users, we already sent
                if u.id not in target_users and u.id != user.id:
                    emit("message_received", payload, room=f"user:{u.id}")


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
