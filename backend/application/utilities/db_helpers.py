"""
File: db_helpers.py
Type: py
Summary: Database helper functions for users, messages, and conversations.
"""

import logging
import uuid

from application.models.message import Message
from application.models.user import User, db
from flask import abort

logger = logging.getLogger(__name__)

NODE_MAP = {
    "cc-junior": "65f32b6c87c07dbeb5ba1936",
    "cs-1": "560f1a9f22961295f9427742",
    "oz-1": "5d41d731a8d1836b5aa3cba1",
    "gd-1": "5789587aad86a6efb573701e",
    "cs-2": "5632661322961295f9428638",
    "oz-2": "5d8a57abe8919b28d5113af1",
    "wd-1": "5789587aad86a6efb573701f",
    "cs-3": "56462f935afde0c6fd30fc8c",
    "oz-3": "5e27600d1c9d440000ac3ee7",
    "gd-2": "57b621e7ad86a6efb5737e64",
    "wd-2": "5789587aad86a6efb5737020",
    "cs-4": "56462f935afde0c6fd30fc8d",
    "oz-4": "5f0cb0b7a2492bba0b3520df",
    "gd-3": "5a0df02b8f2391437740f74f",
    "cs-5": "569ed916efa72b0ced971447",
    "cs-6": "5817d673e85d1220db624ca4",
}

def resolve_course_id(course_identifier):
    return NODE_MAP.get(course_identifier, course_identifier)


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
            user = db.session.get(User, identifier)
        else:
            user = User.query.filter_by(username=identifier).first()

        if not user:
            abort(404, description="User not found.")

        return user
    except Exception as e:
        abort(500, description=f"An error occurred: {e!s}")


def save_message_to_db(
    user_id,
    message,
    is_global=False,
    target_live=False,
    target_classrooms=None,
    target_user_ids=None,
    message_type="text",
):
    """
    Saves a feed post (message) to the database with visibility targeting.

    Args:
        user_id (int): The ID of the user sending the message.
        message (str): The content of the message.
        is_global (bool): If true, visible to everyone.
        target_live (bool): If true, targets currently online users.
        target_classrooms (list): List of classroom IDs to target.
        target_user_ids (list): List of specific user IDs to target.
        message_type (str): The type of message (default is "text").

    Returns:
        dict: A dictionary containing success status, message ID,
              or error details if applicable.
    """
    try:
        from application.models.classroom import Classroom
        from application.services.moderation_service import message_is_appropriate

        user = db.session.get(User, user_id)
        if not user:
            return {"success": False, "error": "User not found"}

        # Screen every non-admin message (students, parents, and AI output)
        # against the banned-words list before it is stored or broadcast.
        if not user.is_admin and not message_is_appropriate(message):
            return {
                "success": False,
                "error": "Your message contains language that isn't allowed here.",
            }

        new_message = Message(
            user_id=user_id,
            content=message,
            message_type=message_type,
            is_global=is_global,
            target_live=target_live,
            has_animated_border=user.has_animated_border,
            animated_border_speed=user.animated_border_speed,
            chat_font_color=user.chat_font_color,
        )

        if target_live:
            # Get currently online users
            online_users = User.query.filter_by(is_online=True).all()
            new_message.target_users.extend(online_users)

        if target_user_ids:
            for uid in target_user_ids:
                u = db.session.get(User, uid)
                if u and u not in new_message.target_users:
                    new_message.target_users.append(u)

        if target_classrooms:
            for cid in target_classrooms:
                classroom = db.session.get(Classroom, cid)
                if classroom:
                    new_message.target_classrooms.append(classroom)

        db.session.add(new_message)
        db.session.commit()

        logger.info(f"Message saved with ID: {new_message.id} for user {user_id}")
        return {
            "success": True,
            "message_id": new_message.id,
        }

    except Exception:
        logger.exception("Error saving message to database")
        db.session.rollback()
        return {"success": False, "error": "Failed to save message"}


def generate_unique_username():
    return f"user_{uuid.uuid4()}"
