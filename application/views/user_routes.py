import base64

from flask import Blueprint, request, jsonify

from application import Configuration
from application.models.user import User, db
from application.models.conversation import Conversation
from application.models.banned_words import BannedWords
from application.ai.ai_teacher import get_ai_response
from application.utilities.helper_functions import request_database_commit
import uuid
from application.views.admin_routes import adminUsername
from flask import request, jsonify
import base64
from io import BytesIO
from PIL import Image
from datetime import datetime

user_bp = Blueprint('user_bp', __name__)



@user_bp.route('/send_message', methods=['POST'])
def send_message():
    user_ip = request.remote_addr
    form_username = request.form['username']
    form_message = request.form['message']

    # Ensure user exists or create new one # TODO reconsider if unknown users should be able to send messages or not
    user = get_or_make_user(user_ip, form_username)
    if not user:
        return jsonify(success=False, error="Unknown User"), 500

    # Confirm messaging is enabled
    config = Configuration.query.first()
    if not config:
        return jsonify(success=False, error="No Configuration Found"), 500
    messages_sending_enabled = config.message_sending_enabled
    if user.username != adminUsername and not messages_sending_enabled:
        return jsonify(success=False, error="Non-admin messages are disabled"), 500

    # Confirm message is appropriate
    banned_words = [word.word for word in BannedWords.query.all()]
    if not is_appropriate(message=form_message, banned_words=banned_words):
        return jsonify(success=False, error="Inappropriate message are not allowed"), 500

    # Save the message to the database
    conversation = Conversation(message=form_message, user_id=user.id)
    db.session.add(conversation)
    if not request_database_commit():
        return jsonify(success=False, error="Database commit failed"), 500

    # To get a configuration value for 'ai_teacher_enabled'
    config = Configuration.query.first()  # Assuming there's only one config row
    if config:
        chatBotEnabled = config.ai_teacher_enabled
    else:
        chatBotEnabled = False  # Default value if no configuration is found

    # If the ChatBot is enabled, get a response
    if not chatBotEnabled:
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
    conversations = db.session.query(Conversation).join(User).all()
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
        user = User(ip_address=user_ip, username=form_username or generate_unique_username())
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


@user_bp.route('/upload_screenshot', methods=['POST'])
def upload_screenshot():
    # print(request.headers)  # Log headers to ensure Content-Type is correct
    # print(request.data)  # Log raw data to see what's being sent

    # Attempt to parse JSON
    json_data = request.get_json()
    # print("JSON Data:", json_data)  # This should not be None

    if not json_data:
        return jsonify({"error": "Invalid JSON data"}), 400

    data_url = json_data.get('image')  # Safely get the image data from the JSON request
    # print("Data URL:", data_url)  # This should not be None

    if not data_url:
        return jsonify({"error": "No image data provided"}), 400

    header, encoded = data_url.split(",", 1)
    data = base64.b64decode(encoded)
    image = Image.open(BytesIO(data))


    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    file_path = f'screenshots/screenshot_{timestamp}.png'

    # Save the image
    image.save(file_path)
    return jsonify({"message": "Screenshot uploaded successfully"})


def is_appropriate(message, banned_words=None):

    # Normalize message and banned words to lower case to ensure case insensitivity
    if banned_words is None:
        banned_words = []
    message_lower = message.lower()
    banned_words = [word.lower() for word in banned_words]

    # Check if the message contains any banned words
    if any(word in message_lower for word in banned_words):
        return False
    else:
        return True
