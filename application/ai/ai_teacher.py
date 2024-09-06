# server/ai_teacher.py

from flask import Blueprint, jsonify, request
from openai import OpenAI
from application import db
from application.config import Config
from application.models.ai_settings import get_ai_settings
from application.models.conversation import Conversation
from application.models.user import User


ai_bp = Blueprint('ai_bp', __name__)

# Retrieve AI settings and conversation history from the database
ai_settings = get_ai_settings()

def get_or_create_ai_teacher():
    # Check if the user with ID 0 already exists
    user = User.query.get(0)

    # If not, create the user
    if not user:
        user = User(id=0, username="AI Teacher", ip_address="0.0.0.0")  # Provide a default IP address
        db.session.add(user)
        db.session.commit()

    return user

def get_ai_response(user_message, username):
    ai_teacher = get_or_create_ai_teacher()
    conversation_history = db.session.query(Conversation.message).all()
    # Append new message to conversation history
    conversation_history.append((username, user_message))
    # prompt = " ".join([message for message, _ in conversation_history])

    if not ai_settings['chat_bot_enabled']:
        return ""

    client = OpenAI(
        # This is the default and can be omitted
        api_key=Config.OPENAI_API_KEY,
    )

    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": str(user_message),
            }
        ],
        model="gpt-3.5-turbo",
    )

    response = str(chat_completion.choices[0].message.content)
    print(response)
    try:
        db_message = Conversation(message=response, user_id=0)
        db.session.add(db_message)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error: {e}")

    # Update conversation history in the database
    # set_conversation_history(conversation_history)

    return response

@ai_bp.route('/get_ai_response', methods=['POST'])
def ai_response():
    user_message = request.form['message']
    username = request.form['username']
    return jsonify(success=True, ai_response=get_ai_response(user_message, username))
