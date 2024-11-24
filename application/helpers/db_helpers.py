from datetime import datetime

from application.models.conversation import Conversation
from application.models.message import Message
from application.models.user import User, db
from application.utilities.helper_functions import request_database_commit
import uuid

def get_or_make_user(user_ip, form_username="", admin_override=False):
    user = User.query.filter_by(ip_address=user_ip).first()
    if user:
        if admin_override and user.username != form_username:
            user.username = form_username
    else:
        user = User(ip_address=user_ip, username=form_username or generate_unique_username())
        db.session.add(user)
    success = request_database_commit()
    return user if success else None


def save_message_to_db(user_id, message, conversation_id=None):
    # Retrieve the active conversation or create a new one if none is provided
    if conversation_id:
        conversation = db.session.query(Conversation).filter_by(id=conversation_id).first()
        if not conversation:
            return "Error: Conversation not found."
    else:
        # Create a new conversation if no ID is provided
        conversation = Conversation(
            title=f"Conversation started by User {user_id} at {datetime.utcnow()}",
        )
        db.session.add(conversation)
        db.session.commit()  # Commit to generate an ID for the new conversation

    # Add the message to the database
    try:
        new_message = Message(
            conversation_id=conversation.id,
            user_id=user_id,
            content=message,
            message_type="text",  # Defaulting to "text"; adjust as needed
        )
        db.session.add(new_message)
        db.session.commit()  # Commit both the conversation and message changes
        return {"conversation_id": conversation.id, "message_id": new_message.id}
    except Exception as e:
        db.session.rollback()
        print(f"Error saving message to database: {e}")
        return "Error: Could not save the message."


# def save_message_to_db(user_id, message):
#     conversation = Conversation(message=message, user_id=user_id)
#     db.session.add(conversation)
#     return request_database_commit()

def generate_unique_username():
    return f"user_{uuid.uuid4()}"
