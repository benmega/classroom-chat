# socket_events.py
from .extensions import socketio, db
from .models.user import User
from flask_socketio import emit
from flask import request




@socketio.on('connect')
def handle_connect():
    # Check if user is known (by IP address or session)

    user_ip = request.remote_addr  # Example identifier
    print(f'user connected {user_ip}')
    user = User.query.filter_by(ip_address=user_ip).first()

    if user:
        user.is_online = True
        db.session.commit()
        emit('user_status_change', {'user_id': user.id, 'is_online': True}, broadcast=True)
    else:
        # Create a dummy user entry if not registered
        new_user = User(username=f"guest_{user_ip}", ip_address=user_ip, is_online=True)
        db.session.add(new_user)
        db.session.commit()
        emit('user_status_change', {'user_id': new_user.id, 'is_online': True}, broadcast=True)


@socketio.on('disconnect')
def handle_disconnect():
    user_ip = request.remote_addr
    print(f'user disconnected {user_ip}')
    user = User.query.filter_by(ip_address=user_ip).first()

    if user:
        user.is_online = False
        db.session.commit()
        emit('user_status_change', {'user_id': user.id, 'is_online': False}, broadcast=True)



@socketio.on('connect')
def handle_connect(auth=None):
    if auth and 'user_id' in auth:
        user_id = auth['user_id']
        user = User.query.get(user_id)
        if user:
            print('User connected:', user.username)
        else:
            print('No user found with that ID')
    else:
        print('No auth data provided')

@socketio.on('disconnect')
def handle_disconnect(auth):
    print("Client disconnected")
    user = User.query.get(auth['user_id'])
    if user:
        user.is_online = False
        db.session.commit()
        socketio.emit('user_status_change', {'user_id': user.id, 'is_online': False}, namespace='/admin')
