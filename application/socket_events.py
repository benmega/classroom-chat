"""
File: socket_events.py
Type: py
Summary: Socket.IO event handlers for user connections and status changes.
"""

from flask import request, session
from flask_socketio import emit

from .extensions import db, socketio
from .models.user import User


@socketio.on("connect")
def handle_connect(auth=None):
    user_userid = session.get("user")
    if user_userid:
        user = User.query.filter_by(id=user_userid).first()
        print(f"user connected {user_userid}")
    else:
        user_ip = request.remote_addr
        print(f"user connected {user_ip}")
        user = User.query.filter_by(ip_address=user_ip).first()

    if user:
        user.set_online(user.id, True)
        emit(
            "user_status_change",
            {"user_id": user.id, "is_online": True},
            broadcast=True,
        )
    else:
        new_user = User(
            username=f"guest_{request.remote_addr}",
            ip_address=request.remote_addr,
            is_online=True,
            password_hash="temp",
        )
        db.session.add(new_user)
        db.session.commit()
        emit(
            "user_status_change",
            {"user_id": new_user.id, "is_online": True},
            broadcast=True,
        )

        print(f"New anonymous user created: {new_user.username}")


@socketio.on("disconnect")
def handle_disconnect(auth=None):
    user_userid = session.get("user")
    if user_userid:
        user = User.query.filter_by(id=user_userid).first()
    else:
        user_ip = request.remote_addr
        print(f"user disconnected {user_ip}")
        user = User.query.filter_by(ip_address=user_ip).first()

    if user:
        user.set_online(user.id, False)
        emit(
            "user_status_change",
            {"user_id": user.id, "is_online": False},
            broadcast=True,
        )
