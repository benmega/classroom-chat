# server/ai_teacher.py
from datetime import datetime

from flask import Blueprint, jsonify, request
from openai import OpenAI
from application import db
from application.config import Config
from application.helpers.db_helpers import save_message_to_db
from application.models.ai_settings import get_ai_settings
from application.models.conversation import Conversation
from application.models.message import Message
from application.models.user import User


ai_bp = Blueprint('ai_bp', __name__)

def get_or_create_ai_teacher():
    # Check if the user with ID 0 already exists
    user = User.query.get(0)

    # If not, create the user
    if not user:
        user = User(id=0, username="AI Teacher", ip_address="0.0.0.0", password_hash="temp")  # Provide a default IP address
        db.session.add(user)
        db.session.commit()

    return user


def get_ai_response(user_message, username, conversation_id=None):
    # Retrieve AI settings and conversation history from the database
    ai_settings = get_ai_settings()

    # Retrieve or create the current conversation
    if conversation_id:
        conversation = db.session.query(Conversation).filter_by(id=conversation_id).first()
        if not conversation:
            return "Error: Conversation not found."
    else:
        conversation = Conversation(
            title=f"Conversation started by {username} at {datetime.utcnow()}",
        )
        db.session.add(conversation)
        db.session.commit()  # Commit to generate an ID for the new conversation

    # Save the user message using the helper function
    user_message_result = save_message_to_db(user_id=1, message=user_message, conversation_id=conversation.id)
    if isinstance(user_message_result, str):  # Indicates an error
        return user_message_result

    # Retrieve conversation history
    conversation_history = [
        {"role": "user" if message.user_id != 0 else "assistant", "content": message.content}
        for message in conversation.messages
    ]

    # Check AI settings before proceeding
    if not ai_settings['chat_bot_enabled']:
        return "The AI chatbot is currently disabled."

    # Generate AI response
    try:
        client = OpenAI(api_key=Config.OPENAI_API_KEY)
        chat_completion = client.chat.completions.create(
            messages=conversation_history + [{"role": "user", "content": user_message}],
            model="gpt-3.5-turbo",
        )
        ai_response = chat_completion.choices[0].message.content

        # Save the AI response using the helper function
        ai_message_result = save_message_to_db(user_id=0, message=ai_response, conversation_id=conversation.id)
        if isinstance(ai_message_result, str):  # Indicates an error
            return ai_message_result

        return ai_response

    except Exception as e:
        print(f"Error generating AI response: {e}")
        return "Error: Could not process the AI response."

@ai_bp.route('/get_ai_response', methods=['POST'])
def ai_response():
    user_message = request.form['message']
    username = request.form['username']
    return jsonify(success=True, ai_response=get_ai_response(user_message, username))
