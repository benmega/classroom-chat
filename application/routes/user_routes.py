# import base64
#
# from flask import Blueprint, request, jsonify
#
# from application import Configuration
# from application.models.user import User, db
# from application.models.conversation import Conversation
# from application.models.banned_words import BannedWords
# from application.ai.ai_teacher import get_ai_response
# from application.utilities.helper_functions import request_database_commit
# import uuid
# from application.routes.admin_routes import adminUsername
# import base64
# from io import BytesIO
# from PIL import Image
# from datetime import datetime
# import mimetypes
#
# user_bp = Blueprint('user_bp', __name__)
#
#
#
# @user_bp.route('/send_message', methods=['POST'])
# def send_message():
#     user_ip = request.remote_addr
#     form_username = request.form['username']
#     form_message = request.form['message']
#
#     # Handle user creation
#     user = get_or_make_user(user_ip, form_username)
#     if not user:
#         return jsonify(success=False, error="Unknown User"), 500
#
#     # Handle configuration check
#     config = Configuration.query.first()
#     if not config:
#         return jsonify(success=False, error="No Configuration Found"), 500
#     if user.username != adminUsername and not config.message_sending_enabled:
#         return jsonify(success=False, error="Non-admin messages are disabled"), 500
#
#     # Check for banned words
#     if not message_is_appropriate(form_message):
#         return jsonify(success=False, error="Inappropriate messages are not allowed"), 500
#
#     # Save message to the database
#     if not save_message_to_db(user.id, form_message):
#         return jsonify(success=False, error="Database commit failed"), 500
#
#     # Check if AI Chatbot is enabled
#     if not config.ai_teacher_enabled:
#         return jsonify(success=True), 200
#
#     # Get AI response if Chatbot is enabled
#     ai_response = get_ai_response(form_message, user.username)
#     return jsonify(success=True, ai_response=ai_response)
#
# # Helper functions
#
# def message_is_appropriate(message):
#     banned_words = [word.word for word in BannedWords.query.all()]
#     return is_appropriate(message=message, banned_words=banned_words)
#
# def save_message_to_db(user_id, message):
#     conversation = Conversation(message=message, user_id=user_id)
#     db.session.add(conversation)
#     return request_database_commit()
#
#
# @user_bp.route('/get_users', methods=['GET'])
# def get_users():
#     # Query the database for all users
#     users = User.query.all()
#     # Convert the list of User objects to a list of dictionaries
#     users_data = [{'id': user.id, 'username': user.username, 'email': user.email} for user in users]
#     # Return the data in JSON format
#     return jsonify(users_data)
#
#
# @user_bp.route('/get_conversation', methods=['GET'])
# def get_conversation():
#     # Fetch all conversations from the database
#     # get_or_make_user()
#     conversations = db.session.query(Conversation).join(User).all()
#     # Prepare data for JSON response
#     conversation_data = [{'username': conv.user.username, 'message': conv.message} for conv in conversations]
#     return jsonify(conversation_history=conversation_data)
#
#
# def generate_unique_username():
#     return f"user_{uuid.uuid4()}"
#
#
# def get_or_make_user(user_ip, form_username="", admin_override=False):
#     """
#     Retrieves an existing user by IP or creates a new one with the given username and IP.
#     Updates username only if admin override is true or the user does not exist.
#
#     Args:
#     user_ip (str): IP address of the user.
#     form_username (str): Proposed new username.
#     admin_override (bool): Whether the change is approved by an admin.
#
#     Returns:
#     User: The retrieved or newly created user object.
#     """
#     user = User.query.filter_by(ip_address=user_ip).first()
#     print(f'Sending message from {user_ip} ({form_username})')
#
#     if user:
#         # Only update if admin has overridden, or consider other conditions
#         if admin_override and user.username != form_username:
#             print(f"Admin updating user from {user.username} to {form_username}")
#             user.username = form_username
#         else:
#             print(f"No changes made to the username for user {user.username}")
#     else:
#         print("No user found, creating a new one.")
#         user = User(ip_address=user_ip, username=form_username or generate_unique_username())
#         db.session.add(user)
#
#     success = request_database_commit()
#     return user if success else None
#
#
# @user_bp.route('/get_user_id')
# def get_user_id():
#     user_ip = request.remote_addr
#     user = User.query.filter_by(ip_address=user_ip).first()
#     if user:
#         return jsonify({'user_id': user.id})
#     return jsonify({'user_id': None}), 404
#
#
# @user_bp.route('/upload_file', methods=['POST'])
# def upload_file():
#     # Attempt to parse JSON
#     json_data = request.get_json()
#
#     if not json_data:
#         return jsonify({"error": "Invalid JSON data"}), 400
#
#     data_url = json_data.get('file')
#
#     if not data_url:
#         return jsonify({"error": "No file data provided"}), 400
#
#     # Determine file type
#     header, encoded = data_url.split(",", 1)
#     mime_type = header.split(";")[0].split(":")[1]
#     data = base64.b64decode(encoded)
#
#     timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
#     file_path = None
#
#     # Use mimetypes to guess the file extension
#     extension = mimetypes.guess_extension(mime_type) or 'bin'
#
#     if mime_type.startswith('image/'):
#         # Handle image files
#         file_path = f'userData/image/file_{timestamp}{extension}'
#         image = Image.open(BytesIO(data))
#         image.save(file_path)
#     elif mime_type == 'application/pdf':
#         # Handle PDF files
#         file_path = f'userData/pdfs/file_{timestamp}{extension}'
#         with open(file_path, 'wb') as f:
#             f.write(data)
#     else:
#         # Handle other file types
#         file_path = f'userData/other/file_{timestamp}{extension}'
#         with open(file_path, 'wb') as f:
#             f.write(data)
#
#     return jsonify({"message": "File uploaded successfully", "file_path": file_path})
#
#
# def is_appropriate(message, banned_words=None):
#
#     # Normalize message and banned words to lower case to ensure case insensitivity
#     if banned_words is None:
#         banned_words = []
#     message_lower = message.lower()
#     banned_words = [word.lower() for word in banned_words]
#
#     # Check if the message contains any banned words
#     if any(word in message_lower for word in banned_words):
#         return False
#     else:
#         return True


from flask import Blueprint, jsonify
from flask import render_template, request, redirect, url_for, session, flash

from application import db
from application.models.user import User

from application.helpers.db_helpers import get_or_make_user

user_bp = Blueprint('user_bp', __name__)

@user_bp.route('/get_users', methods=['GET'])
def get_users():
    users = User.query.all()
    users_data = [{'id': user.id, 'username': user.username, 'email': user.email} for user in users]
    return jsonify(users_data)

# @user_bp.route('/get_user_id', methods=['GET'])
# def get_user_id():
#     user_ip = request.remote_addr
#     user = User.query.filter_by(ip_address=user_ip).first()
#     if user:
#         return jsonify({'user_id': user.id})
#     return jsonify({'user_id': None}), 404


@user_bp.route('/get_user_id', methods=['GET'])
def get_user_id():
    user_username = session.get('user')
    if user_username:
        user = User.query.filter_by(username=user_username).first()
        if user:
            return jsonify({'user_id': user.id})
    return jsonify({'user_id': None}), 404


@user_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        # Find the user by username
        user = User.query.filter_by(username=username).first()

        # Validate credentials
        if user and user.check_password(password):
            session['user'] = user.username
            user.set_online(user.id)  # Mark the user as online
            flash('Login successful!', 'success')
            return redirect(url_for('general_bp.index'))
        else:
            flash('Invalid username or password.', 'error')
            return render_template('login.html')

    return render_template('login.html')


@user_bp.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        # Check if the username already exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash('Username already taken, please choose another.', 'error')
            return render_template('signup.html')

        # Create a new user with the hashed password
        new_user = User(username=username, ip_address=request.remote_addr)
        new_user.set_password(password)

        # Save the new user to the database
        db.session.add(new_user)
        db.session.commit()

        flash('Signup successful! Please log in.', 'success')
        return redirect(url_for('user_bp.login'))

    # Render the signup page on GET request
    return render_template('signup.html')
