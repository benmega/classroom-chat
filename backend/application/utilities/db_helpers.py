"""
File: db_helpers.py
Type: py
Summary: Database helper functions for users, messages, and conversations.
"""

import uuid

from flask import abort

from application.models.message import Message
from application.models.user import User, db


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
        abort(500, description=f"An error occurred: {str(e)}")


def save_message_to_db(user_id, message, is_global=False, target_live=False, target_classrooms=None, target_user_ids=None, message_type="text"):
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
        user = db.session.get(User, user_id)
        if not user:
            return {"success": False, "error": "User not found"}
        
        new_message = Message(
            user_id=user_id,
            content=message,
            message_type=message_type,
            is_global=is_global,
            target_live=target_live,
            has_animated_border=user.has_animated_border,
            animated_border_speed=user.animated_border_speed,
            chat_font_color=user.chat_font_color
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

        print(
            f"Message saved with ID: {new_message.id} for user {user_id}"
        )
        return {
            "success": True,
            "message_id": new_message.id,
        }

    except Exception as e:
        print(f"Error saving message to database: {e}")
        db.session.rollback()
        return {"success": False, "error": str(e)}


def generate_unique_username():
    return f"user_{uuid.uuid4()}"
