# socket_events.py
from .extensions import db, socketio
from .models.user import User
from flask_socketio import emit
from flask import request
#
#
# @socketio.on('connect')
# def handle_connect(auth=None):
#     user_ip = request.remote_addr
#     print(f'user connected {user_ip}')
#
#     # Try finding user by IP address first (works without auth)
#     user = User.query.filter_by(ip_address=user_ip).first()
#
#     # If user not found by IP, try using auth info
#     if not user and auth and 'user_id' in auth:
#         user_id = auth['user_id']
#         user = User.query.get(user_id)
#
#     # Update user status and broadcast event
#     if user:
#         user.is_online = True
#         db.session.commit()
#         emit('user_status_change', {'user_id': user.id, 'is_online': True}, broadcast=True)
#     else:
#         # Create a dummy user for anonymous connection
#         new_user = User(username=f"guest_{user_ip}", ip_address=user_ip, is_online=True)
#         db.session.add(new_user)
#         db.session.commit()
#         emit('user_status_change', {'user_id': new_user.id, 'is_online': True}, broadcast=True)
#
#         print(f'New anonymous user created: {new_user.username}')
#
#
# @socketio.on('disconnect')
# def handle_disconnect(auth=None):
#     user_ip = request.remote_addr
#     print(f'user disconnected {user_ip}')
#
#     # Try getting user by IP address first (works without auth)
#     user = User.query.filter_by(ip_address=user_ip).first()
#
#     # If user not found by IP or authentication is available, try using auth
#     if not user and auth:
#         user = User.query.get(auth['user_id'])
#
#     if user:
#         user.is_online = False
#         db.session.commit()
#
#         # Check for namespace for broadcast (default or admin)
#         namespace = '/admin'  # request.namespace.strip('/')  # Remove leading slash
#         emit('user_status_change', {'user_id': user.id, 'is_online': False}, broadcast=True, namespace=namespace)


from flask import session

@socketio.on('connect')
def handle_connect(auth=None):
    # Check if user is logged in by session
    user_username = session.get('user')
    if user_username:
        # Find the user by their username stored in the session
        user = User.query.filter_by(username=user_username).first()
    else:
        user_ip = request.remote_addr
        print(f'user connected {user_ip}')
        # Fallback to IP address-based lookup (for anonymous users or unauthenticated connections)
        user = User.query.filter_by(ip_address=user_ip).first()

    if user:
        user.is_online = True
        db.session.commit()
        emit('user_status_change', {'user_id': user.id, 'is_online': True}, broadcast=True)
    else:
        # Create a dummy user for anonymous connection if not found in session
        new_user = User(username=f"guest_{request.remote_addr}", ip_address=request.remote_addr, is_online=True, password_hash = "test")
        db.session.add(new_user)
        db.session.commit()
        emit('user_status_change', {'user_id': new_user.id, 'is_online': True}, broadcast=True)

        print(f'New anonymous user created: {new_user.username}')


@socketio.on('disconnect')
def handle_disconnect(auth=None):
    # Check if the user is logged in by session
    user_username = session.get('user')
    if user_username:
        user = User.query.filter_by(username=user_username).first()
    else:
        user_ip = request.remote_addr
        print(f'user disconnected {user_ip}')
        user = User.query.filter_by(ip_address=user_ip).first()

    if user:
        user.is_online = False
        db.session.commit()
        emit('user_status_change', {'user_id': user.id, 'is_online': False}, broadcast=True)
