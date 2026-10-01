"""
File: socket_events.py
Type: py
Summary: Socket.IO event handlers — classroom-scoped room joining and routing.

Room naming conventions:
    classroom:{classroom_id}   — one room per classroom
    classroom:global           — joined by all authenticated sockets
    user:{user_id}             — per-user room for push events (enrollment, DMs)
    admin                      — admins only

Admins are joined to the room of every classroom (they can read and post in all
of them over HTTP); everyone else only to the classrooms they are enrolled in.
Rooms are fixed at connect time, so sync_user_rooms() re-applies them to a
user's live sockets whenever enrollment or role changes.
"""

import logging
from datetime import datetime

from application.constants import GLOBAL_CLASSROOM_ID
from application.extensions import db, socketio
from flask import request, session
from flask_socketio import emit, join_room
from sqlalchemy import select

from .models.classroom import Classroom, user_classrooms
from .models.session_log import SessionLog
from .models.user import User
from .utilities.db_helpers import save_message_to_db

logger = logging.getLogger(__name__)

# Track active socket connections per user to handle multiple tabs correctly
_active_sessions: dict = {}  # {user_id: set([sid1, sid2, ...])}
# Reverse index so a disconnect can be cleaned up without the session or the user row
_sid_users: dict = {}  # {sid: user_id}

# Rooms whose membership follows the DB; any other room (user:<id>, the sid's own) is left alone
_ADMIN_ROOM = "admin"
_CLASSROOM_PREFIX = "classroom:"


def _get_enrolled_classroom_ids(user_id: int) -> list:
    """Return list of classroom IDs the user is enrolled in (DB query)."""
    rows = db.session.execute(
        select(user_classrooms.c.classroom_id).where(
            user_classrooms.c.user_id == user_id
        )
    ).fetchall()
    return [row[0] for row in rows]


def _desired_rooms(user) -> set:
    """Every room the user's sockets should be in right now, per the DB."""
    rooms = {f"user:{user.id}", f"{_CLASSROOM_PREFIX}{GLOBAL_CLASSROOM_ID}"}
    if user.role == "admin":
        rooms.add(_ADMIN_ROOM)
        classroom_ids = db.session.execute(select(Classroom.id)).scalars().all()
    else:
        classroom_ids = _get_enrolled_classroom_ids(user.id)
    rooms.update(f"{_CLASSROOM_PREFIX}{cid}" for cid in classroom_ids)
    return rooms


def _apply_rooms(sid: str, desired: set) -> None:
    """Join the socket to the missing rooms and drop it from classroom/admin rooms no longer wanted."""
    server = socketio.server
    current = set(server.rooms(sid, namespace="/"))
    for room in desired - current:
        server.enter_room(sid, room, namespace="/")
    for room in current - desired:
        if room == _ADMIN_ROOM or room.startswith(_CLASSROOM_PREFIX):
            server.leave_room(sid, room, namespace="/")


def sync_user_rooms(user_id: int) -> None:
    """
    Re-apply the user's DB-derived rooms to every socket they have open, so that
    enrollment, unenrollment and role changes take effect without a reconnect.
    Never raises: the caller has already committed the change that triggered it.
    """
    sids = list(_active_sessions.get(user_id, ()))
    if not sids:
        return
    try:
        user = db.session.get(User, user_id)
        if not user:
            return
        desired = _desired_rooms(user)
        for sid in sids:
            try:
                _apply_rooms(sid, desired)
            except (KeyError, ValueError):
                continue  # socket disconnected in the meantime
    except Exception:
        logger.exception("Could not sync socket rooms for user %s", user_id)


def sync_admin_rooms() -> None:
    """Re-sync every connected admin, e.g. after a classroom was created."""
    try:
        admin_ids = (
            db.session.execute(
                select(User.id).where(
                    User.id.in_(list(_active_sessions)), User.role == "admin"
                )
            )
            .scalars()
            .all()
        )
    except Exception:
        logger.exception("Could not look up connected admins")
        return
    for admin_id in admin_ids:
        sync_user_rooms(admin_id)


def close_classroom_room(classroom_id: str) -> None:
    """Remove every socket from a deleted classroom's room."""
    if classroom_id == GLOBAL_CLASSROOM_ID:
        return  # the global room is not tied to the classroom row
    try:
        socketio.server.close_room(f"{_CLASSROOM_PREFIX}{classroom_id}", namespace="/")
    except Exception:
        logger.exception("Could not close the room of classroom %s", classroom_id)


def connected_user_ids() -> set:
    """IDs of users with at least one open socket in this process."""
    return set(_active_sessions)


def touch_presence(user_id: int) -> None:
    """Socket activity counts as presence: bump last_seen so the stale-session cleanup leaves the user alone."""
    try:
        SessionLog.touch(user_id)
    except Exception:
        db.session.rollback()
        logger.exception("Could not record socket activity for user %s", user_id)


def disconnect_user_sockets(user_id: int) -> None:
    """
    Drop every socket the user has open (logout). The sockets keep the rooms and
    the session as they were at handshake time, so they must not outlive the login.
    """
    sids = list(_active_sessions.get(user_id, ()))
    for sid in sids:
        try:
            socketio.server.disconnect(sid, namespace="/")
        except Exception:
            logger.exception("Could not disconnect socket %s of user %s", sid, user_id)
    # handle_disconnect normally empties the registry; sweep what it could not
    remaining = _active_sessions.get(user_id)
    if remaining is not None:
        remaining.difference_update(sids)
        if not remaining:
            del _active_sessions[user_id]
    for sid in sids:
        _sid_users.pop(sid, None)


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

    # Personal room (push events like classroom_enrolled), the global room,
    # enrolled classrooms (all of them for admins) and the admin room
    for room in _desired_rooms(user):
        join_room(room)

    # Mark online
    if user.id not in _active_sessions:
        _active_sessions[user.id] = set()

    is_first_connection = len(_active_sessions[user.id]) == 0
    _active_sessions[user.id].add(request.sid)
    _sid_users[request.sid] = user.id

    if is_first_connection:
        user.set_online(user.id, True)
        emit(
            "user_status_change",
            {"user_id": user.id, "is_online": True},
            broadcast=True,
        )

    touch_presence(user.id)


@socketio.on("disconnect")
def handle_disconnect(auth=None):
    # The registry knows whose socket this was even when the session is gone
    # or the user row has been deleted
    user_id = _sid_users.pop(request.sid, None) or session.get("user")
    sids = _active_sessions.get(user_id)
    if sids is None:
        return

    sids.discard(request.sid)
    if sids:
        return  # another tab is still open

    del _active_sessions[user_id]
    user = db.session.get(User, user_id)
    if user:
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
        return {"success": False, "error": "Not authenticated"}

    user = db.session.get(User, user_id)
    if not user:
        return {"success": False, "error": "User not found"}

    touch_presence(user.id)

    if getattr(user, "role", None) == "parent":
        return {"success": False, "error": "Forbidden: Parents cannot send chat messages"}

    if not isinstance(data, dict):
        return {"success": False, "error": "Invalid message payload"}

    content = data.get("content")
    if not isinstance(content, str) or not content.strip() or len(content) > 4000:
        return {"success": False, "error": "Invalid message length"}

    # Parse targeting parameters from frontend
    is_global = data.get("is_global", False)
    target_live = data.get("target_live", False)
    target_classrooms = data.get("target_classrooms", [])
    target_users = data.get("target_users", [])

    # Server-side validation
    if user.role != 'admin':
        if len(content) > 500:
            return {"success": False, "error": "Message too long"}

        if user.can_chat is False:
            return {"success": False, "error": "You are currently muted"}

        from .models.message import Message

        # Only the timestamp is needed, not the message and everything it targets
        last_message_at = db.session.scalar(
            select(Message.created_at)
            .where(Message.user_id == user.id)
            .order_by(Message.id.desc())
            .limit(1)
        )
        if last_message_at:
            time_elapsed = (datetime.utcnow() - last_message_at).total_seconds()
            if time_elapsed < 30:
                remaining = int(30 - time_elapsed)
                return {
                    "success": False,
                    "error": f"Please wait {remaining} seconds before sending another message.",
                }

        from .models.configuration import Configuration

        config = Configuration.get_current()
        if config and not config.message_sending_enabled:
            return {"success": False, "error": "Chat is currently disabled"}
        # Students can't send global messages
        is_global = False
        # Students can only target their own classrooms
        enrolled_ids = _get_enrolled_classroom_ids(user.id)
        # Filter target_classrooms to only those the student is enrolled in
        if target_classrooms:
            target_classrooms = [
                cid for cid in target_classrooms if cid in enrolled_ids
            ]
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
        target_user_ids=target_users,
    )

    if not save_result.get("success"):
        return {
            "success": False,
            "error": save_result.get("error", "Failed to save message"),
        }

    # save_message_to_db hands back what the broadcast needs: no second load of the message
    msg = save_result["message"]

    payload = {
        "id": msg["id"],
        "user_id": user.id,
        "user_name": user.nickname if user.nickname else user.username,
        "slug": user.slug,
        "user_profile_pic": user.profile_picture,
        "content": msg["content"],
        "message_type": msg["message_type"],
        "created_at": msg["created_at"].isoformat()
        if msg["created_at"]
        else datetime.utcnow().isoformat(),
        "is_global": msg["is_global"],
        "target_live": msg["target_live"],
        "target_classrooms": [c["name"] for c in save_result["target_classrooms"]],
        "target_classroom_ids": [c["id"] for c in save_result["target_classrooms"]],
        "target_users": save_result["target_user_names"],
        "is_struck": msg["is_struck"],
        "has_animated_border": msg["has_animated_border"],
        "animated_border_speed": msg["animated_border_speed"],
        "animated_border_color": msg["animated_border_color"],
        "chat_font_color": msg["chat_font_color"],
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
            # Only the ids are needed to address the rooms
            online_user_ids = db.session.scalars(
                select(User.id).where(User.is_online.is_(True))
            ).all()
            for online_id in online_user_ids:
                # Basic dedup: if the user is in target_users, we already sent
                if online_id not in target_users and online_id != user.id:
                    emit("message_received", payload, room=f"user:{online_id}")

    # Evaluate achievements (respects the 5-minute throttle)
    from .services.achievement_engine import evaluate_user

    new_awards = evaluate_user(user)
    awards_payload = []
    if new_awards:
        awards_payload = [
            {
                "id": a.id,
                "name": a.name,
                "slug": a.slug,
                "badge": f"/static/images/achievement_badges/{a.slug}.png",
            }
            for a in new_awards
        ]
        emit("achievement_unlocked", {"new_awards": awards_payload}, room=f"user:{user.id}")

    return {"success": True, "new_awards": awards_payload}


def emit_classroom_enrolled(user_id: int, classroom_dict: dict):
    """
    Public helper — called after a student is enrolled in a classroom (challenge
    submission, join code, admin enroll). Joins the student's open sockets to the
    new classroom's room so its messages arrive without a reconnect, and pushes a
    classroom_enrolled event to the student's personal socket room.
    """
    sync_user_rooms(user_id)
    try:
        socketio.emit(
            "classroom_enrolled",
            {
                "classroom": classroom_dict,
                "user_id": user_id,
            },
            room=f"user:{user_id}",
        )
    except Exception:
        # The enrollment is already committed; a lost push must not fail the request
        logger.exception("Could not push classroom_enrolled to user %s", user_id)


def emit_activity_resolved(user_id: int, kind: str, item_id: int, status: str):
    """
    Public helper — called when a teacher/admin resolves a student's pending
    submission (certificate, file, or course-connection request). Pushes a
    push event to the student's personal socket room so the client can
    surface an unread badge / refresh the /activity timeline live.
    """
    socketio.emit(
        "activity_resolved",
        {
            "kind": kind,
            "id": item_id,
            "status": status,
        },
        room=f"user:{user_id}",
    )
