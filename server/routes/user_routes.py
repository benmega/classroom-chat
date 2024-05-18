from flask import Blueprint, request, jsonify

from server.ai_teacher import ChatBotEnabled, get_ai_response
from server.models import db, User
from server.routes.routes import conversation_history

user_bp = Blueprint('user_bp', __name__)


@user_bp.route('/send_message', methods=['POST'])
def send_message():
    # TODO refactor to part of the user object
    # TODO make user object
    user_ip = request.remote_addr
    username = request.form['username']
    user = User.query.filter_by(ip_address=user_ip).first()
    print(f'sending message from {user_ip} ({username})')
    if user:
        if not username:
            username = user.username
        elif user.username != username:
            print(f"Updating user from {user.username} to {username}")
            user.username = username
            try:
                db.session.commit()
            except Exception as e:
                print(f"Database error: {e}")
                db.session.rollback()  # Roll back on error
    else:
        print("No user found, creating a new one.")
        user = User(ip_address=user_ip, username=username)
        db.session.add(user)
        db.session.commit()

    user_message = request.form['message']
    conversation_history.append((username, user_message))

    if not ChatBotEnabled:
        return jsonify(success=True)

    return jsonify(success=True, ai_response=get_ai_response(user_message, username))

@user_bp.route('/get_users', methods=['GET'])
def get_users():
    pass
    # Logic to retrieve users

@user_bp.route('/admin/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    pass
    # Logic to update user
