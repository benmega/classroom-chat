from datetime import datetime

from application.models.conversation import Conversation
from application.models.message import Message
from application.models.user import User, db
from application.utilities.helper_functions import request_database_commit
import uuid
from flask import abort, session


def get_user(identifier):
    """
    Retrieve a user by username or ID.

    Args:
        identifier (str or int): The username (str) or user ID (int).

    Returns:
        User: The User object if found, otherwise raises a 404.

    Raises:
        404: If the user is not found.
    """
    try:
        if isinstance(identifier, int):
            user = User.query.get(identifier)
        else:
            user = User.query.filter_by(username=identifier).first()

        if not user:
            abort(404, description="User not found.")

        return user
    except Exception as e:
        # Log the error if necessary
        abort(500, description=f"An error occurred: {str(e)}")


# def get_or_make_user(user_ip, form_username="", admin_override=False):
#     user = User.query.filter_by(ip_address=user_ip).first()
#     if user:
#         if admin_override and user.username != form_username:
#             user.username = form_username
#     else:
#         user = User(ip_address=user_ip, username=form_username or generate_unique_username())
#         db.session.add(user)
#     success = request_database_commit()
#     return user if success else None


def save_message_to_db(user_id, message, message_type="text"):
    """
    Saves a message to the database, creating a new conversation if needed.

    Args:
        user_id (int): The ID of the user sending the message.
        message (str): The content of the message.
        message_type (str): The type of message (default is "text").

    Returns:
        dict: A dictionary containing success status, message ID, conversation ID,
              or error details if applicable.
    """
    try:
        # Retrieve the conversation ID from the session
        conversation_id = session.get('conversation_id')

        # If no active conversation exists, create a new one
        if not conversation_id:
            print("No active conversation found. Creating a new one.")
            conversation = Conversation(
                title=f"Conversation started by User {user_id} at {datetime.utcnow()}",
    ***REMOVED***
            db.session.add(conversation)
            db.session.commit()  # Generate an ID for the new conversation

            # Store the new conversation ID in the session
            session['conversation_id'] = conversation.id
            print(f"New conversation created with ID: {conversation.id}")
        else:
            # Fetch the existing conversation from the database
            conversation = Conversation.query.get(conversation_id)
            if not conversation:
                print("Error: Active conversation not found in the database.")
                return {"success": False, "error": "Active conversation not found."}

        # Save the new message
        new_message = Message(
            user_id=user_id,
            conversation_id=conversation.id,
            content=message,
            message_type=message_type,
***REMOVED***
        db.session.add(new_message)
        db.session.commit()

        print(f"Message saved with ID: {new_message.id} in conversation ID: {conversation.id}")
        return {"success": True, "message_id": new_message.id, "conversation_id": conversation.id}

    except Exception as e:
        print(f"Error saving message to database: {e}")
        db.session.rollback()
        return {"success": False, "error": str(e)}

# def save_message_to_db(user_id, message, conversation_id=None):
#     # Retrieve the active conversation or create a new one if none is provided
#     if conversation_id:
#         conversation = db.session.query(Conversation).filter_by(id=conversation_id).first()
#         if not conversation:
#             return "Error: Conversation not found."
#     else:
#         # Create a new conversation if no ID is provided
#         conversation = Conversation(
#             title=f"Conversation started by User {user_id} at {datetime.utcnow()}",
# ***REMOVED***
#         db.session.add(conversation)
#         db.session.commit()  # Commit to generate an ID for the new conversation
#
#     # Add the message to the database
#     try:
#         new_message = Message(
#             conversation_id=conversation.id,
#             user_id=user_id,
#             content=message,
#             message_type="text",  # Defaulting to "text"; adjust as needed
# ***REMOVED***
#         db.session.add(new_message)
#         db.session.commit()  # Commit both the conversation and message changes
#         return {"conversation_id": conversation.id, "message_id": new_message.id}
#     except Exception as e:
#         db.session.rollback()
#         print(f"Error saving message to database: {e}")
#         return "Error: Could not save the message."

def generate_unique_username():
    return f"user_{uuid.uuid4()}"
