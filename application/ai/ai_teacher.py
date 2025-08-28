# application/ai/ai_teacher.py
"""
AI Teacher Blueprint for handling AI chat interactions using local LLM via Ollama.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Union

import requests
from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from application import db, limiter
from application.config import Config
from application.utilities.db_helpers import save_message_to_db
from application.models.ai_settings import get_ai_settings
from application.models.conversation import Conversation
from application.models.user import User

# Configure logging
logger = logging.getLogger(__name__)

# Blueprint configuration
ai_bp = Blueprint('ai_bp', __name__)

# Constants
AI_TEACHER_USER_ID = 0
AI_TEACHER_USERNAME = "AI Teacher"
AI_TEACHER_IP = "0.0.0.0"
OLLAMA_API_URL = "http://localhost:11434/api/generate"
DEFAULT_MODEL = "mistral"
DEFAULT_MAX_WORDS = 100
REQUEST_TIMEOUT = 30  # seconds


class AITeacherError(Exception):
    """Custom exception for AI Teacher operations."""
    pass


def get_or_create_ai_teacher() -> User:
    """
    Get or create the AI Teacher user account.

    Returns:
        User: The AI Teacher user instance

    Raises:
        AITeacherError: If user creation fails
    """
    try:
        user = User.query.get(AI_TEACHER_USER_ID)

        if not user:
            user = User(
                id=AI_TEACHER_USER_ID,
                username=AI_TEACHER_USERNAME,
                ip_address=AI_TEACHER_IP,
                password_hash="temp"  # AI user doesn't need real auth
            )
            db.session.add(user)
            db.session.commit()
            logger.info("Created AI Teacher user account")

        return user

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error creating AI Teacher user: {e}")
        raise AITeacherError("Failed to create AI Teacher user") from e


def get_or_create_conversation(conversation_id: Optional[int], username: str) -> Conversation:
    """
    Get existing conversation or create a new one.

    Args:
        conversation_id: Optional existing conversation ID
        username: Username of the person starting the conversation

    Returns:
        Conversation: The conversation instance

    Raises:
        AITeacherError: If conversation operations fail
    """
    try:
        if conversation_id:
            conversation = db.session.query(Conversation).filter_by(id=conversation_id).first()
            if not conversation:
                raise AITeacherError("Conversation not found")
            return conversation

        # Create new conversation
        conversation = Conversation(
            title=f"Conversation with {username} - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
        )
        db.session.add(conversation)
        db.session.commit()
        logger.info(f"Created new conversation {conversation.id} for user {username}")

        return conversation

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error with conversation: {e}")
        raise AITeacherError("Failed to handle conversation") from e


def build_conversation_history(conversation: Conversation) -> List[Dict[str, str]]:
    """
    Build conversation history from database messages.

    Args:
        conversation: The conversation instance

    Returns:
        List of message dictionaries with 'role' and 'content' keys
    """
    return [
        {
            "role": "assistant" if message.user_id == AI_TEACHER_USER_ID else "user",
            "content": message.content
        }
        for message in conversation.messages
    ]


def format_prompt(user_message: str, conversation_history: List[Dict[str, str]], max_words: int) -> str:
    """
    Format the prompt for the local LLM.

    Args:
        user_message: The current user message
        conversation_history: Previous conversation messages
        max_words: Maximum words allowed in response

    Returns:
        Formatted prompt string
    """
    prompt_parts = [f"system: You are an AI teacher. Keep all responses under {max_words} words.\n"]

    # Add conversation history
    for msg in conversation_history:
        prompt_parts.append(f"{msg['role']}: {msg['content']}\n")

    # Add current user message
    prompt_parts.append(f"user: {user_message}\n")
    prompt_parts.append("assistant:")

    return "".join(prompt_parts)


def call_ollama_api(prompt: str, model: str) -> str:
    """
    Call the Ollama API to generate a response.

    Args:
        prompt: The formatted prompt
        model: The model name to use

    Returns:
        The AI response text

    Raises:
        AITeacherError: If API call fails
    """
    try:
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False
        }

        response = requests.post(
            OLLAMA_API_URL,
            json=payload,
            timeout=REQUEST_TIMEOUT
        )

        if not response.ok:
            logger.error(f"Ollama API error: status {response.status_code}, response: {response.text}")
            raise AITeacherError(f"Ollama API returned status code {response.status_code}")

        data = response.json()
        ai_response = data.get("response", "").strip()

        if not ai_response:
            raise AITeacherError("Empty response from Ollama API")

        return ai_response

    except requests.exceptions.RequestException as e:
        logger.error(f"Network error calling Ollama API: {e}")
        raise AITeacherError("Failed to connect to AI service") from e
    except ValueError as e:
        logger.error(f"Invalid JSON response from Ollama API: {e}")
        raise AITeacherError("Invalid response from AI service") from e


def trim_response_to_word_limit(response: str, max_words: int) -> str:
    """
    Trim response to word limit if necessary.

    Args:
        response: The AI response text
        max_words: Maximum number of words allowed

    Returns:
        Trimmed response text
    """
    words = response.split()
    if len(words) > max_words:
        return ' '.join(words[:max_words]) + "..."
    return response


def get_local_llm_response(
        user_message: str,
        conversation_history: List[Dict[str, str]],
        model: str = DEFAULT_MODEL,
        max_words: int = DEFAULT_MAX_WORDS
) -> str:
    """
    Generate a response from the local LLM and save it to the database.

    Args:
        user_message: The user's input message
        conversation_history: List of previous messages
        model: The local model name to use
        max_words: Maximum number of words in response

    Returns:
        The AI's response

    Raises:
        AITeacherError: If response generation fails
    """
    try:
        # Format the prompt
        prompt = format_prompt(user_message, conversation_history, max_words)

        # Call Ollama API
        ai_response = call_ollama_api(prompt, model)

        # Trim to word limit
        ai_response = trim_response_to_word_limit(ai_response, max_words)

        # Save AI response to database
        save_result = save_message_to_db(user_id=AI_TEACHER_USER_ID, message=ai_response)
        if isinstance(save_result, str):  # Error occurred
            raise AITeacherError(f"Failed to save AI response: {save_result}")

        logger.info(f"Generated AI response ({len(ai_response.split())} words)")
        return ai_response

    except AITeacherError:
        raise
    except Exception as e:
        logger.error(f"Unexpected error generating AI response: {e}")
        raise AITeacherError("Failed to generate AI response") from e


@limiter.limit("1 per minute; 10 per day")
def get_ai_response(user_message: str, username: str, conversation_id: Optional[int] = None) -> str:
    """
    Main function to get AI response for a user message.

    Args:
        user_message: The user's message
        username: Username of the person sending the message
        conversation_id: Optional existing conversation ID

    Returns:
        The AI response or error message
    """
    try:
        # Check AI settings
        ai_settings = get_ai_settings()
        if not ai_settings.get('chat_bot_enabled', False):
            return "The AI chatbot is currently disabled."

        # Ensure AI teacher user exists
        get_or_create_ai_teacher()

        # Get or create conversation
        conversation = get_or_create_conversation(conversation_id, username)

        # Save user message
        save_result = save_message_to_db(user_id=None, message=user_message)  # Assuming None for regular users
        if isinstance(save_result, str):  # Error occurred
            return f"Error saving message: {save_result}"

        # Build conversation history
        conversation_history = build_conversation_history(conversation)

        # Generate AI response
        return get_local_llm_response(user_message, conversation_history)

    except AITeacherError as e:
        logger.error(f"AI Teacher error: {e}")
        return f"Error: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error in get_ai_response: {e}")
        return "Error: Could not process the AI response."


@ai_bp.route('/get_ai_response', methods=['POST'])
def ai_response():
    """
    Flask route to handle AI response requests.

    Returns:
        JSON response with success status and AI response
    """
    try:
        # Validate request data
        if not request.form.get('message'):
            return jsonify(success=False, error="Message is required"), 400

        if not request.form.get('username'):
            return jsonify(success=False, error="Username is required"), 400

        user_message = request.form['message'].strip()
        username = request.form['username'].strip()
        conversation_id = request.form.get('conversation_id')

        # Convert conversation_id to int if provided
        if conversation_id:
            try:
                conversation_id = int(conversation_id)
            except ValueError:
                return jsonify(success=False, error="Invalid conversation ID"), 400

        # Get AI response
        ai_response = get_ai_response(user_message, username, conversation_id)

        return jsonify(success=True, ai_response=ai_response)

    except Exception as e:
        logger.error(f"Error in ai_response route: {e}")
        return jsonify(success=False, error="Internal server error"), 500