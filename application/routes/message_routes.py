from flask import Blueprint, request, jsonify, session
from application.models.conversation import Conversation
from application.utilities.helper_functions import request_database_commit
from application.helpers.db_helpers import get_or_make_user
from application.helpers.validation_helpers import message_is_appropriate
from application.ai.ai_teacher import get_ai_response
from application import Configuration, db
from application.routes.admin_routes import adminUsername
from models import User

message_bp = Blueprint('message_bp', __name__)


@message_bp.route('/send_message', methods=['POST'])
def send_message():
    user_ip = request.remote_addr
    session_username = session.get('user', None)  # Get username from the session
    form_message = request.form['message']

    if not session_username:
        return jsonify(success=False, error="No session username found"), 400

    # Handle user creation (using session_username instead of form_username)
    user = get_or_make_user(user_ip, session_username)
    if not user:
        return jsonify(success=False, error="Unknown User"), 500

    # Handle configuration check
    config = Configuration.query.first()
    if not config:
        return jsonify(success=False, error="No Configuration Found"), 500
    if user.username != adminUsername and not config.message_sending_enabled:
        return jsonify(success=False, error="Non-admin messages are disabled"), 500

    # Check for banned words
    if not message_is_appropriate(form_message):
        return jsonify(success=False, error="Inappropriate messages are not allowed"), 500

    # Save message to the database
    if not save_message_to_db(user.id, form_message):
        return jsonify(success=False, error="Database commit failed"), 500

    # Get AI response if Chatbot is enabled
    if config.ai_teacher_enabled:
        ai_response = get_ai_response(form_message, user.username)
        return jsonify(success=True, ai_response=ai_response)

    return jsonify(success=True), 200


# @message_bp.route('/send_message', methods=['POST'])
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
#     # Get AI response if Chatbot is enabled
#     if config.ai_teacher_enabled:
#         ai_response = get_ai_response(form_message, user.username)
#         return jsonify(success=True, ai_response=ai_response)
#
#     return jsonify(success=True), 200


def save_message_to_db(user_id, message):
    conversation = Conversation(message=message, user_id=user_id)
    db.session.add(conversation)
    return request_database_commit()

@message_bp.route('/get_conversation', methods=['GET'])
def get_conversation():
    # conversations = db.session.query(Conversation).join(User).all()
    conversations = db.session.query(Conversation).all()
    conversation_data = [{'username': conv.user.username, 'message': conv.message} for conv in conversations]
    return jsonify(conversation_history=conversation_data)

