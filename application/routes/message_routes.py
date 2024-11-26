from datetime import datetime

from flask import Blueprint, request, jsonify, session
from application.models.conversation import Conversation
from application.models.message import Message
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
    conversation_id = session.get('conversation_id')

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


def save_message_to_db(user_id, message, message_type="text"):
    try:
        # Retrieve the conversation ID from the session
        conversation_id = session.get('conversation_id')

        # If no active conversation, create a new one
        if not conversation_id:
            conversation = Conversation(
                title=f"Conversation started by User {user_id} at {datetime.utcnow()}",
    ***REMOVED***
            db.session.add(conversation)
            db.session.commit()  # Generate an ID for the new conversation

            # Store the new conversation ID in the session
            session['conversation_id'] = conversation.id
        else:
            # Fetch the existing conversation from the database
            conversation = Conversation.query.get(conversation_id)
            if not conversation:
                return {"success": False, "error": "Active conversation not found in the database."}

        # Save the new message
        new_message = Message(
            user_id=user_id,
            conversation_id=conversation.id,
            content=message,
            message_type=message_type,
***REMOVED***
        db.session.add(new_message)
        db.session.commit()

        return {"success": True, "message_id": new_message.id, "conversation_id": conversation.id}

    except Exception as e:
        print(f"Error saving message to db: {e}")
        db.session.rollback()
        return {"success": False, "error": str(e)}



@message_bp.route('/start_conversation', methods=['POST'])
def start_conversation():
    # Create a new conversation
    title = request.json.get('title', 'New Conversation')
    new_conversation = Conversation(title=title)
    db.session.add(new_conversation)
    db.session.commit()

    # Store the new conversation's ID in the session
    session['conversation_id'] = new_conversation.id

    return jsonify({"conversation_id": new_conversation.id, "title": new_conversation.title}), 201


@message_bp.route('/set_active_conversation', methods=['POST'])
def set_active_conversation():
    conversation_id = request.json.get('conversation_id')

    # Verify the conversation exists
    conversation = Conversation.query.get(conversation_id)
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404

    # Update the session with the active conversation
    session['conversation_id'] = conversation_id
    return jsonify({"message": "Conversation updated", "conversation_id": conversation_id}), 200

@message_bp.route('/get_current_conversation', methods=['GET'])
def get_current_conversation():
    conversation_id = session.get('conversation_id')

    if not conversation_id:
        return jsonify({"error": "No active conversation"}), 400

    # Fetch the conversation
    print(f'getting conversation number {conversation_id}')
    conversation = Conversation.query.get(conversation_id)
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404

    # Prepare the response
    conversation_data = {
        "conversation_id": conversation.id,
        "title": conversation.title,
        "messages": [
            {
                "user_id": msg.user_id,
                "user_name": msg.user.username,  # Assuming msg.user.name provides the user name
                "content": msg.content,
                "timestamp": msg.created_at,
            }
            for msg in conversation.messages
        ],
    }
    return jsonify(conversation=conversation_data)

@message_bp.route('/end_conversation', methods=['POST'])
def end_conversation():
    if 'conversation_id' in session:
        session.pop('conversation_id')
        return jsonify({"message": "Conversation ended"}), 200
    return jsonify({"error": "No active conversation to end"}), 400



@message_bp.route('/get_conversation', methods=['GET'])
def get_conversation():
    conversation_id = session.get('conversation_id')

    if not conversation_id:
        return jsonify({"error": "No active conversation"}), 400

    # Fetch the specific conversation
    conversation = Conversation.query.filter_by(id=conversation_id).first()

    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404

    # Prepare conversation data
    conversation_data = {
        "conversation_id": conversation.id,
        "title": conversation.title,
        "messages": [
            {"user_id": msg.user_id, "content": msg.content, "timestamp": msg.created_at}
            for msg in conversation.messages
        ],
    }
    return jsonify(conversation=conversation_data)




@message_bp.route('/conversation/<int:user_id>', methods=['GET'])
def get_conversation_history(user_id):
    conversations = Conversation.query.filter(
        Conversation.users.any(id=user_id)  # Check if the user is part of the conversation
    ).all()
    return jsonify([
        {
            "conversation_id": conv.id,
            "title": conv.title,
            "messages": [
                {
                    "user_id": msg.user_id,
                    "content": msg.content,
                    "message_type": msg.message_type,
                    "timestamp": msg.timestamp,
                }
                for msg in conv.messages if not msg.is_struck
            ],
        }
        for conv in conversations
    ])


# def save_message_to_db(user_id, message, message_type="text"):
#     try:
#         new_message = Conversation(user_id=user_id, message=message, message_type=message_type)
#         db.session.add(new_message)
#         db.session.commit()
#         return True
#     except Exception as e:
#         print(f"Error saving message to db: {e}")
#         db.session.rollback()
#         return False
#
# @message_bp.route('/get_conversation', methods=['GET'])
# def get_conversation():
#     # conversations = db.session.query(Conversation).join(User).all()
#     conversations = db.session.query(Conversation).all()
#     conversation_data = [{'username': conv.user.username, 'message': conv.message} for conv in conversations]
#     return jsonify(conversation_history=conversation_data)
#
# @message_bp.route('/conversation/<int:user_id>', methods=['GET'])
# def get_conversation_history(user_id):
#     messages = Conversation.query.filter_by(user_id=user_id, is_struck=False).order_by(Conversation.timestamp).all()
#     return jsonify([
#         {
#             "sender": msg.sender,
#             "message_type": msg.message_type,
#             "content": msg.content,
#             "timestamp": msg.timestamp
#         }
#         for msg in messages
#     ])
