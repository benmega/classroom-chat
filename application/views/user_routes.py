from flask import Blueprint, request, jsonify

from application.ai.ai_teacher import ChatBotEnabled, get_ai_response
from application.models.user import User, db

# from server.views.views import conversation_history

user_bp = Blueprint('user_bp', __name__)
conversation_history = []


@user_bp.route('/send_message', methods=['POST'])
def send_message():
    # TODO refactor to part of the user object
    # TODO make user object
    user_ip = request.remote_addr
    formUsername = request.form['username']
    user_message = request.form['message']
    user = get_or_make_user(user_ip, formUsername)
    conversation_history.append((user.username, user_message))

    if not ChatBotEnabled:
        return jsonify(success=True)

    return jsonify(success=True, ai_response=get_ai_response(user_message, user.username))


@user_bp.route('/get_users', methods=['GET'])
def get_users():
    pass
    # Logic to retrieve users


@user_bp.route('/admin/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    pass
    # Logic to update user


@user_bp.route('/get_conversation', methods=['GET'])
def get_conversation():
    return jsonify(conversation_history=conversation_history)


def get_or_make_user(user_ip, formUsername=""):
    # retrieve user info or create a new user with given username and ip
    user = User.query.filter_by(ip_address=user_ip).first()
    print(f'sending message from {user_ip} ({formUsername})')
    if user:
        # return user
        if user.username != formUsername:
            print(f"Updating user from {user.username} to {formUsername}")
            user.username = formUsername
            try:
                db.session.commit()
            except Exception as e:
                print(f"Database error: {e}")
                db.session.rollback()  # Roll back on error
    else:
        print("No user found, creating a new one.")
        user = User(ip_address=user_ip, username=formUsername)
        db.session.add(user)
        db.session.commit()
    return user
