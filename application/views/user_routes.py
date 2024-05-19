from flask import Blueprint, request, jsonify
from application.models.user import User, db
from application.models.conversation import Conversation
from application.ai.ai_teacher import ChatBotEnabled, get_ai_response

user_bp = Blueprint('user_bp', __name__)

@user_bp.route('/send_message', methods=['POST'])
def send_message():
    user_ip = request.remote_addr
    formUsername = request.form['username']
    user_message = request.form['message']

    # Ensure user exists or create new one
    user = get_or_make_user(user_ip, formUsername)

    # Save the message to the database
    conversation = Conversation(message=user_message, user_id=user.id)
    db.session.add(conversation)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify(success=False, error=str(e)), 500

    # If the ChatBot is enabled, get a response
    if ChatBotEnabled:
        ai_response = get_ai_response(user_message, user.username)
        return jsonify(success=True, ai_response=ai_response)

    return jsonify(success=True)


@user_bp.route('/get_users', methods=['GET'])
def get_users():
    # Query the database for all users
    users = User.query.all()
    # Convert the list of User objects to a list of dictionaries
    users_data = [{'id': user.id, 'username': user.username, 'email': user.email} for user in users]
    # Return the data in JSON format
    return jsonify(users_data)



@user_bp.route('/get_conversation', methods=['GET'])
def get_conversation():
    # Fetch all conversations from the database
    conversations = Conversation.query.join(User).all()
    # Prepare data for JSON response
    conversation_data = [{'username': conv.user.username, 'message': conv.message} for conv in conversations]
    return jsonify(conversation_history=conversation_data)


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
