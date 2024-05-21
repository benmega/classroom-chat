from flask import Blueprint, request, jsonify
from application.models.user import User, db
from application.models.conversation import Conversation
from application.ai.ai_teacher import ChatBotEnabled, get_ai_response
from application.utilities.helper_functions import request_database_commit
import uuid

user_bp = Blueprint('user_bp', __name__)


@user_bp.route('/send_message', methods=['POST'])
def send_message():
    user_ip = request.remote_addr
    form_username = request.form['username']
    form_message = request.form['message']

    # Ensure user exists or create new one
    user = get_or_make_user(user_ip, form_username)
    if not user:
        return jsonify(success=False, error="Unknown User"), 500
    # Save the message to the database
    conversation = Conversation(message=form_message, user_id=user.id)
    db.session.add(conversation)

    if not request_database_commit():
        return jsonify(success=False, error="Database commit failed"), 500

    # If the ChatBot is enabled, get a response
    if not ChatBotEnabled:
        return jsonify(success=True), 200

    ai_response = get_ai_response(form_message, user.username)
    return jsonify(success=True, ai_response=ai_response)


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
    # get_or_make_user()
    conversations = Conversation.query.join(User).all()
    # Prepare data for JSON response
    conversation_data = [{'username': conv.user.username, 'message': conv.message} for conv in conversations]
    return jsonify(conversation_history=conversation_data)


def generate_unique_username():
    return f"user_{uuid.uuid4()}"
def get_or_make_user(user_ip, form_username="", admin_override=False):
    """
    Retrieves an existing user by IP or creates a new one with the given username and IP.
    Updates username only if admin override is true or the user does not exist.

    Args:
    user_ip (str): IP address of the user.
    form_username (str): Proposed new username.
    admin_override (bool): Whether the change is approved by an admin.

    Returns:
    User: The retrieved or newly created user object.
    """
    user = User.query.filter_by(ip_address=user_ip).first()
    print(f'Sending message from {user_ip} ({form_username})')

    if user:
        # Only update if admin has overridden, or consider other conditions
        if admin_override and user.username != form_username:
            print(f"Admin updating user from {user.username} to {form_username}")
            user.username = form_username
        else:
            print(f"No changes made to the username for user {user.username}")
    else:
        print("No user found, creating a new one.")
        user = User(ip_address=user_ip, username=form_username or generate_unique_username)
        db.session.add(user)

    success = request_database_commit()
    return user if success else None

@user_bp.route('/get_user_id')
def get_user_id():
    user_ip = request.remote_addr
    user = User.query.filter_by(ip_address=user_ip).first()
    if user:
        return jsonify({'user_id': user.id})
    return jsonify({'user_id': None}), 404
