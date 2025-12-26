"""
File: message_routes.py
Type: py
Summary: Flask routes for message routes functionality.
"""

from flask import (
    Blueprint,
    request,
    jsonify,
    session,
    flash,
    redirect,
    url_for,
    render_template,
)

from application.ai.ai_teacher import get_ai_response
from application.extensions import db, limiter
from application.models.banned_words import BannedWords
from application.models.configuration import Configuration
from application.models.conversation import Conversation, conversation_users
from application.models.user import User
from application.routes.admin_routes import adminUsername
from application.utilities.db_helpers import get_user, save_message_to_db

message = Blueprint("message", __name__)


@message.route("/send_message", methods=["POST"])
@limiter.limit("20 per minute; 100 per day")
def send_message():
    session_userid = session.get("user")
    form_message = request.form["message"]

    if not session_userid:
        return jsonify(success=False, error="No session username found"), 400

    user = get_user(session_userid)
    if not user:
        return jsonify(success=False, error="Unknown User"), 403

    config = Configuration.query.first()
    if not config:
        return jsonify(success=False, error="No Configuration Found"), 500
    if user.username != adminUsername and not config.message_sending_enabled:
        return jsonify(success=False, error="Non-admin messages are disabled"), 403

    if not message_is_appropriate(form_message):
        return (
            jsonify(success=False, error="Inappropriate messages are not allowed"),
            403,
        )

    if not save_message_to_db(user.id, form_message):
        return jsonify(success=False, error="Database commit failed"), 500

    if config.ai_teacher_enabled:
        ai_response = get_ai_response(form_message, user.username)
        return jsonify(success=True, ai_response=ai_response)

    return jsonify(success=True), 200


@message.route("/start_conversation", methods=["POST"])
def start_conversation():
    # prefer the model's default title when no explicit title is provided
    title = request.form.get("title")

    if title and title.strip():
        new_conversation = Conversation(title=title)
    else:
        new_conversation = Conversation()
    db.session.add(new_conversation)
    db.session.commit()

    session["conversation_id"] = new_conversation.id

    return (
        jsonify(
            {"conversation_id": new_conversation.id, "title": new_conversation.title}
        ),
        201,
    )


@message.route("/set_active_conversation", methods=["POST"])
def set_active_conversation():
    conversation_id = request.json.get("conversation_id")

    conversation = Conversation.query.get(conversation_id)
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404

    session["conversation_id"] = conversation_id
    return (
        jsonify(
            {"message": "Conversation updated", "conversation_id": conversation_id}
        ),
        200,
    )


@message.route("/get_current_conversation", methods=["GET"])
@limiter.limit("60 per minute")
def get_current_conversation():
    conversation = Conversation.query.order_by(Conversation.created_at.desc()).first()

    if not conversation:
        return jsonify({"error": "No active conversation available"}), 400

    session["conversation_id"] = conversation.id

    conversation_data = {
        "conversation_id": conversation.id,
        "title": conversation.title,
        "messages": [serialize_message(msg) for msg in conversation.messages],
    }
    return jsonify(conversation=conversation_data)


@message.route("/get_historical_conversation", methods=["GET"])
def get_historical_conversation():
    conversation_id = session.get("conversation_id")

    if not conversation_id:
        return jsonify({"error": "No historical conversation in session"}), 400

    conversation = Conversation.query.get(conversation_id)
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404

    conversation_data = {
        "conversation_id": conversation.id,
        "title": conversation.title,
        "messages": [serialize_message(msg) for msg in conversation.messages],
    }
    return jsonify(conversation=conversation_data)


@message.route("/end_conversation", methods=["POST"])
def end_conversation():
    if "conversation_id" in session:
        session.pop("conversation_id")
        return jsonify({"message": "Conversation ended"}), 200
    return jsonify({"error": "No active conversation to end"}), 400


@message.route("/get_conversation", methods=["GET"])
def get_conversation():
    conversation_id = session.get("conversation_id")

    if not conversation_id:
        return jsonify({"error": "No active conversation"}), 400

    conversation = Conversation.query.get(conversation_id)

    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404

    conversation_data = {
        "conversation_id": conversation.id,
        "title": conversation.title,
        "messages": [serialize_message(msg) for msg in conversation.messages],
    }
    return jsonify(conversation=conversation_data)


@message.route("/conversation_history", methods=["GET"])
def conversation_history():
    if "user" not in session:
        flash("You must be logged in to view your conversation history.", "error")
        return redirect(url_for("user.login"))

    user_id = session["user"]
    user = User.query.filter_by(id=user_id).first()

    if not user:
        flash("User not found.", "error")
        return redirect(url_for("user.login"))

    conversations = (
        Conversation.query.join(conversation_users)
        .filter(conversation_users.c.user_id == user.id)
        .order_by(Conversation.created_at.desc())
        .all()
    )

    return render_template(
        "chat/conversation_history.html", conversations=conversations
    )


@message.route("/api/conversations/<int:user_id>", methods=["GET"])
def get_conversation_history(user_id):
    conversations = Conversation.query.filter(Conversation.users.any(id=user_id)).all()
    return jsonify(
        [
            {
                "conversation_id": conv.id,
                "title": conv.title,
                "messages": [
                    serialize_message(msg) for msg in conv.messages if not msg.is_struck
                ],
            }
            for conv in conversations
        ]
    )


@message.route("/view_conversation/<int:conversation_id>", methods=["GET"])
def view_conversation(conversation_id):
    conversation = Conversation.query.get_or_404(conversation_id)

    conversation_data = {
        "conversation_id": conversation.id,
        "title": conversation.title,
        "messages": [serialize_message(msg) for msg in conversation.messages],
    }

    return render_template(
        "chat/view_conversation.html", conversation=conversation_data
    )


# ============================================================================
# MESSAGE VALIDATION
# ============================================================================


def message_is_appropriate(message):
    banned_words = [word.word for word in BannedWords.query.all()]
    return is_appropriate(message=message, banned_words=banned_words)


def is_appropriate(message, banned_words=None):
    if banned_words is None:
        banned_words = []
    message_lower = message.lower()
    banned_words = [word.lower() for word in banned_words]
    return not any(word in message_lower for word in banned_words)


# Helper to safely serialize a Message for JSON/templates
def serialize_message(msg):
    user = getattr(msg, "user", None)
    if user:
        username = getattr(user, "username", None)
        nickname = getattr(user, "nickname", None)
        profile_pic = getattr(user, "profile_picture", None)
    else:
        username = None
        nickname = "Deleted User"
        profile_pic = None

    timestamp = getattr(msg, "created_at", None)
    if timestamp is not None:
        timestamp = str(timestamp)

    return {
        "user_id": msg.user_id,
        "username": username,  # handle
        "nickname": nickname,  # display name
        "user_profile_pic": profile_pic,
        "content": msg.content,
        "timestamp": timestamp,
        "message_type": getattr(msg, "message_type", "text"),
    }
