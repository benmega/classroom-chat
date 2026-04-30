"""
File: socket_events.py
Type: py
Summary: Socket.IO event handlers for user connections and status changes.
"""

from datetime import datetime
from flask import request, session
from flask_socketio import emit

from application.extensions import db, socketio
from .models.user import User
from .utilities.db_helpers import save_message_to_db


@socketio.on("connect")
def handle_connect(auth=None):
    user_userid = session.get("user")
    if not user_userid:
        return False  # Reject unauthenticated connections

    user = User.query.get(user_userid)
    if user:
        user.set_online(user.id, True)
        emit(
            "user_status_change",
            {"user_id": user.id, "is_online": True},
            broadcast=True,
        )
    else:
        return False



@socketio.on("disconnect")
def handle_disconnect(auth=None):
    user_userid = session.get("user")
    if not user_userid:
        return

    user = User.query.get(user_userid)


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
    Handles 'send_message' from client, persists to DB, and emits 'message_received' to all clients.
    The data should include 'content' and 'conversation_id'.
    """
    user_userid = session.get("user")
    if not user_userid:
        return

    user = User.query.get(user_userid)
    if not user:
        return


    content = data.get("content")
    conversation_id = data.get("conversation_id")
    
    if not content:
        return

    # Ensure conversation_id is in session for save_message_to_db if not already there
    if conversation_id:
        session["conversation_id"] = conversation_id

    save_result = save_message_to_db(user.id, content, conversation_id=conversation_id)
    
    if save_result.get("success"):
        emit(
            "message_received",
            {
                "id": save_result.get("message_id"), # Use 'id' to match frontend expectations
                "user_id": user.id,
                "username": user.username,
                "nickname": user.nickname or user.username,
                "user_profile_pic": user.profile_picture,
                "slug": user.slug,
                "content": content,
                "timestamp": datetime.utcnow().isoformat(),
                "conversation_id": save_result.get("conversation_id"),
                "message_type": "text",
            },
            broadcast=True,
        )

