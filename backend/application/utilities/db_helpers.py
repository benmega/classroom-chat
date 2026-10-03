"""
File: db_helpers.py
Type: py
Summary: Database helper functions for users, messages, and conversations.
"""

import logging

from application.models.message import Message
from application.models.user import User, db
from flask import abort
from sqlalchemy import or_, select

logger = logging.getLogger(__name__)

NODE_MAP = {
    # CS
    "cs-1": "560f1a9f22961295f9427742",
    "cs1": "560f1a9f22961295f9427742",
    "cs-2": "5632661322961295f9428638",
    "cs2": "5632661322961295f9428638",
    "cs-3": "56462f935afde0c6fd30fc8c",
    "cs3": "56462f935afde0c6fd30fc8c",
    "cs-4": "56462f935afde0c6fd30fc8d",
    "cs4": "56462f935afde0c6fd30fc8d",
    "cs-5": "569ed916efa72b0ced971447",
    "cs5": "569ed916efa72b0ced971447",
    "cs-6": "5817d673e85d1220db624ca4",
    "cs6": "5817d673e85d1220db624ca4",
    # GD
    "gd-1": "5789587aad86a6efb573701e",
    "gd1": "5789587aad86a6efb573701e",
    "gd-2": "57b621e7ad86a6efb5737e64",
    "gd2": "57b621e7ad86a6efb5737e64",
    "gd-3": "5a0df02b8f2391437740f74f",
    "gd3": "5a0df02b8f2391437740f74f",
    # WD
    "wd-1": "5789587aad86a6efb573701f",
    "wd1": "5789587aad86a6efb573701f",
    "wd-2": "5789587aad86a6efb5737020",
    "wd2": "5789587aad86a6efb5737020",
    # CC Junior
    "cc-junior": "65f32b6c87c07dbeb5ba1936",
    "ccjunior": "65f32b6c87c07dbeb5ba1936",
    # Ozaria
    "oz-1": "5d41d731a8d1836b5aa3cba1",
    "oz1": "5d41d731a8d1836b5aa3cba1",
    "ozaria1": "5d41d731a8d1836b5aa3cba1",
    "ozaria-1": "5d41d731a8d1836b5aa3cba1",
    "oz-2": "5d8a57abe8919b28d5113af1",
    "oz2": "5d8a57abe8919b28d5113af1",
    "ozaria2": "5d8a57abe8919b28d5113af1",
    "ozaria-2": "5d8a57abe8919b28d5113af1",
    "oz-3": "5e27600d1c9d440000ac3ee7",
    "oz3": "5e27600d1c9d440000ac3ee7",
    "ozaria3": "5e27600d1c9d440000ac3ee7",
    "ozaria-3": "5e27600d1c9d440000ac3ee7",
    "oz-4": "5f0cb0b7a2492bba0b3520df",
    "oz4": "5f0cb0b7a2492bba0b3520df",
    "ozaria4": "5f0cb0b7a2492bba0b3520df",
    "ozaria-4": "5f0cb0b7a2492bba0b3520df",
}

CANONICAL_SLUG_MAP = {
    "cs1": "cs-1", "cs2": "cs-2", "cs3": "cs-3", "cs4": "cs-4", "cs5": "cs-5", "cs6": "cs-6",
    "gd1": "gd-1", "gd2": "gd-2", "gd3": "gd-3",
    "wd1": "wd-1", "wd2": "wd-2",
    "ozaria1": "oz-1", "ozaria2": "oz-2", "ozaria3": "oz-3", "ozaria4": "oz-4",
    "oz1": "oz-1", "oz2": "oz-2", "oz3": "oz-3", "oz4": "oz-4",
}

def resolve_course_id(course_identifier):
    if not course_identifier:
        return course_identifier
    return NODE_MAP.get(course_identifier.lower().strip(), course_identifier)

def get_canonical_course_slug(course_identifier):
    if not course_identifier:
        return course_identifier
    c_lower = course_identifier.lower().strip()
    if c_lower in CANONICAL_SLUG_MAP:
        return CANONICAL_SLUG_MAP[c_lower]
    # Reverse lookup from Mongo ID
    mongo_id = NODE_MAP.get(c_lower, c_lower)
    for slug, m_id in NODE_MAP.items():
        if m_id == mongo_id and "-" in slug:
            return slug
    return c_lower


def find_user(identifier):
    """
    Look up a user by ID or username without aborting.

    Args:
        identifier (str or int): The user ID (int) or the username (str). Usernames
            are matched case-insensitively because they are stored lower-cased.

    Returns:
        User or None: The User object, or None when there is no such user.
    """
    if identifier is None or isinstance(identifier, bool):
        return None
    if isinstance(identifier, int):
        return db.session.get(User, identifier)
    return User.query.filter_by(username=str(identifier).strip().lower()).first()


def get_user(identifier):
    """
    Retrieve a user by username or ID.

    Args:
        identifier (str or int): The username (str) or user ID (int).

    Returns:
        User: The User object if found, otherwise raises a 404.

    Raises:
        404: If the user is not found. Database errors propagate unchanged, so
            they end up as a normal 500 without exposing the exception text.
    """
    user = find_user(identifier)
    if user is None:
        abort(404, description="User not found.")
    return user


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
              or error details if applicable. On success it also holds
              what a broadcast of the message needs, so the caller does not
              have to load the message again: "message" (the stored column
              values), "target_classrooms" (id and name of each classroom
              targeted) and "target_user_names" (display name of each user
              targeted).
    """
    try:
        from application.models.classroom import Classroom
        from application.models.message import message_users
        from application.services.moderation_service import is_appropriate

        user = db.session.get(User, user_id)
        if not user:
            return {"success": False, "error": "User not found"}

        # Screen every non-admin message (students and parents)
        # against the banned-words list before it is stored or broadcast.
        if user.role != 'admin' and not is_appropriate(message):
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
            animated_border_color=user.animated_border_color,
            chat_font_color=user.chat_font_color,
        )

        # The users to target (the online ones and/or the listed ids) in one query,
        # as columns: a user row is all that is needed, never a loaded User
        user_filters = []
        if target_live:
            user_filters.append(User.is_online.is_(True))
        if target_user_ids:
            user_filters.append(User.id.in_(target_user_ids))
        targeted_users = (
            db.session.execute(
                select(User.id, User.nickname, User._username)
                .where(or_(*user_filters))
                .order_by(User.id)
            ).all()
            if user_filters
            else []
        )

        # Every targeted classroom in one query, in the order they were asked for
        targeted_classrooms = []
        if target_classrooms:
            found = {
                c.id: c
                for c in db.session.scalars(
                    select(Classroom).where(Classroom.id.in_(target_classrooms))
                )
            }
            targeted_classrooms = [
                found[cid] for cid in dict.fromkeys(target_classrooms) if cid in found
            ]
            new_message.target_classrooms.extend(targeted_classrooms)

        db.session.add(new_message)
        # The flush assigns the id and column defaults, and writes the message row
        # the user links below refer to
        db.session.flush()
        if targeted_users:
            db.session.execute(
                message_users.insert(),
                [{"message_id": new_message.id, "user_id": row[0]} for row in targeted_users],
            )

        # Read everything the caller needs before the commit: it expires every
        # loaded row, and reading an expired row is a query each
        result = {
            "success": True,
            "message_id": new_message.id,
            "message": {
                "id": new_message.id,
                "content": new_message.content,
                "message_type": new_message.message_type,
                "created_at": new_message.created_at,
                "is_global": new_message.is_global,
                "target_live": new_message.target_live,
                "is_struck": new_message.is_struck,
                "has_animated_border": new_message.has_animated_border,
                "animated_border_speed": new_message.animated_border_speed,
                "animated_border_color": new_message.animated_border_color,
                "chat_font_color": new_message.chat_font_color,
            },
            "target_classrooms": [
                {"id": c.id, "name": c.name} for c in targeted_classrooms
            ],
            "target_user_names": [row[1] or row[2] for row in targeted_users],
        }
        db.session.commit()

        logger.info(f"Message saved with ID: {result['message_id']} for user {user_id}")
        return result

    except Exception:
        logger.exception("Error saving message to database")
        db.session.rollback()
        return {"success": False, "error": "Failed to save message"}
