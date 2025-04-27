from flask import Blueprint, request, jsonify, session, flash, redirect, url_for, render_template
from application.models.conversation import Conversation, conversation_users
from application.utilities.db_helpers import get_user, save_message_to_db
from application.utilities.validation_helpers import message_is_appropriate, detect_and_handle_challenge_url
from application.ai.ai_teacher import get_ai_response
from application.models.configuration import Configuration
from application.extensions import db, limiter
from application.routes.admin_routes import adminUsername  # Only if used
from application.models.user import User  # Assuming User model is in application.models.user



message_bp = Blueprint('message_bp', __name__)


@message_bp.route('/send_message', methods=['POST'])
@limiter.limit("4 per minute; 100 per day")  # Customize the rate
def send_message():
    session_username = session.get('user', None)  # Get username from the session
    form_message = request.form['message']

    if not session_username:
        return jsonify(success=False, error="No session username found"), 400

    user = get_user(session_username)
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

    # Check for and process CodeCombat URL
    duck_multiplier = config.duck_multiplier
    challenge_check = detect_and_handle_challenge_url(form_message, user.username, duck_multiplier)
    if challenge_check.get("handled"):
        # Send a congratulatory system message
        if challenge_check.get("details").get("success"):
            system_message = f"Congrats {user.username}, on completing a challenge!"
            return jsonify(success=True, system_message=system_message, play_sound=True), 200
        else:
            system_message = f"Error claiming challenge. Please refresh the page and try again. If the issue persists, ask Mr. Mega"
            return jsonify(success=True, system_message=system_message), 200

    # Save message to the database
    if not save_message_to_db(user.id, form_message):
        return jsonify(success=False, error="Database commit failed"), 500

    # Get AI response if Chatbot is enabled
    if config.ai_teacher_enabled:
        ai_response = get_ai_response(form_message, user.username)
        return jsonify(success=True, ai_response=ai_response)

    return jsonify(success=True), 200


@message_bp.route('/start_conversation', methods=['POST'])
def start_conversation():
    # Get the title from the form (or use a default)
    title = request.form.get('title', 'New Conversation')

    # Create and save the new conversation
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
@limiter.limit("60 per minute")
def get_current_conversation():
    # Fetch the most recent conversation
    conversation = Conversation.query.order_by(Conversation.created_at.desc()).first()

    if not conversation:
        return jsonify({"error": "No active conversation available"}), 400

    # Store the new conversation ID in the session
    session['conversation_id'] = conversation.id

    # Prepare the response
    conversation_data = {
        "conversation_id": conversation.id,
        "title": conversation.title,
        "messages": [
            {
                "user_id": msg.user_id,
                "user_name": msg.user.username,
                "content": msg.content,
                "timestamp": msg.created_at,
            }
            for msg in conversation.messages
        ],
    }
    return jsonify(conversation=conversation_data)


@message_bp.route('/get_historical_conversation', methods=['GET'])
def get_historical_conversation():
    conversation_id = session.get('conversation_id')

    if not conversation_id:
        return jsonify({"error": "No historical conversation in session"}), 400

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
                "user_name": msg.user.username,
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


@message_bp.route('/conversation_history', methods=['GET'])
def conversation_history():
    # Ensure the user is logged in
    if 'user' not in session:
        flash('You must be logged in to view your conversation history.', 'error')
        return redirect(url_for('user_bp.login'))

    # Fetch the current logged-in user
    username = session['user']
    user = User.query.filter_by(username=username).first()

    if not user:
        flash('User not found.', 'error')
        return redirect(url_for('user_bp.login'))

    # Get all conversations the user participated in
    conversations = (
        Conversation.query
        .join(conversation_users)
        .filter(conversation_users.c.user_id == user.id)
        .order_by(Conversation.created_at.desc())
        .all()
    )

    return render_template('conversation_history.html', conversations=conversations)


@message_bp.route('/api/conversations/<int:user_id>', methods=['GET'])
def get_conversation_history(user_id):
    conversations = Conversation.query.filter(
        Conversation.users.any(id=user_id)  # Check if the user is part of the conversation
    ).all()
    return jsonify([  # Return conversations as JSON data
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


@message_bp.route('/view_conversation/<int:conversation_id>', methods=['GET'])
def view_conversation(conversation_id):
    conversation = Conversation.query.get_or_404(conversation_id)

    # Prepare the response (same as get_current_conversation, but here it's full)
    conversation_data = {
        "conversation_id": conversation.id,
        "title": conversation.title,
        "messages": [
            {
                "user_id": msg.user_id,
                "user_name": msg.user.username,
                "content": msg.content,
                "timestamp": msg.created_at,
            }
            for msg in conversation.messages
        ],
    }

    return render_template('view_conversation.html', conversation=conversation_data)
