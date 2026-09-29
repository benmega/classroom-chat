import time
from collections import defaultdict, deque
from datetime import datetime

from application.constants import GLOBAL_CLASSROOM_ID
from application.extensions import db

MAX_MESSAGE_LENGTH = 2000
RATE_LIMIT_MAX = 20  # messages per user per window (mirrors the old HTTP "20 per minute")
RATE_LIMIT_WINDOW = 60  # seconds

# In-process sliding window of send timestamps per user id.
_recent_sends = defaultdict(deque)


def reset_rate_limits():
    """Clear the in-memory send rate limiter (used by tests)."""
    _recent_sends.clear()


def _rate_limited(user_id):
    now = time.monotonic()
    window = _recent_sends[user_id]
    while window and now - window[0] > RATE_LIMIT_WINDOW:
        window.popleft()
    if len(window) >= RATE_LIMIT_MAX:
        return True
    window.append(now)
    return False


class MessageRejected(Exception):
    """Raised when a message fails a validation rule; .reason is user-facing."""

    def __init__(self, reason, status=403):
        super().__init__(reason)
        self.reason = reason
        self.status = status


def validate_and_save_message(user, conversation_id, content):
    """
    Single message-sending path (used by the Socket.IO ``send_message`` handler).

    Enforces: payload sanity, global message_sending_enabled flag (non-admins),
    conversation existence, global-announcement and enrollment rules, conversation
    lock, slow mode, banned-word moderation and a per-user rate limit.

    Returns a dict with the saved ``message`` (Message), ``conversation`` and
    ``classroom_id``. Raises MessageRejected with a human-readable reason otherwise.
    """
    from application.models.configuration import Configuration
    from application.models.conversation import Conversation
    from application.models.message import Message
    from application.services.classroom_service import user_enrolled_in
    from application.services.moderation_service import message_is_appropriate
    from application.utilities.db_helpers import save_message_to_db

    if user is None:
        raise MessageRejected("Unknown user", 403)
    if not isinstance(content, str) or not content.strip():
        raise MessageRejected("Message cannot be empty", 400)
    if len(content) > MAX_MESSAGE_LENGTH:
        raise MessageRejected(
            f"Message is too long (max {MAX_MESSAGE_LENGTH} characters)", 400
        )
    if not conversation_id:
        raise MessageRejected("conversation_id is required", 400)

    # A missing Configuration row behaves like the column default (enabled).
    config = Configuration.query.first()
    if not user.is_admin and config and not config.message_sending_enabled:
        raise MessageRejected("Non-admin messages are disabled", 403)

    conv = db.session.get(Conversation, conversation_id)
    if not conv:
        raise MessageRejected("Conversation not found", 404)

    if conv.classroom_id == GLOBAL_CLASSROOM_ID:
        if not user.is_admin:
            raise MessageRejected(
                "Only instructors may post to the Global Announcements feed.", 403
            )
    elif not user.is_admin and not user_enrolled_in(user.id, conv.classroom_id):
        raise MessageRejected("You are not enrolled in this classroom.", 403)

    if not user.is_admin:
        if conv.is_locked:
            raise MessageRejected("This conversation is locked by admin", 403)

        if conv.slow_mode_delay and conv.slow_mode_delay > 0:
            last_msg = (
                Message.query.filter_by(conversation_id=conv.id, user_id=user.id)
                .order_by(Message.created_at.desc())
                .first()
            )
            if last_msg:
                time_passed = (datetime.utcnow() - last_msg.created_at).total_seconds()
                if time_passed < conv.slow_mode_delay:
                    wait_time = int(conv.slow_mode_delay - time_passed)
                    raise MessageRejected(
                        f"Slow mode active. Please wait {wait_time} more seconds.",
                        429,
                    )

    if not message_is_appropriate(content):
        raise MessageRejected("Inappropriate messages are not allowed", 403)

    if _rate_limited(user.id):
        raise MessageRejected(
            "You are sending messages too quickly. Please slow down.", 429
        )

    save_result = save_message_to_db(user.id, content, conversation_id=conv.id)
    if not save_result.get("success"):
        raise MessageRejected("Database commit failed", 500)

    message = db.session.get(Message, save_result["message_id"])
    return {"message": message, "conversation": conv, "classroom_id": conv.classroom_id}


def serialize_message(msg):
    """
    Serializes a Message model object into a dictionary.
    """
    user = getattr(msg, "user", None)
    if user:
        username = getattr(user, "username", None)
        nickname = getattr(user, "nickname", None)
        profile_pic = getattr(user, "profile_picture", None)
        slug = getattr(user, "slug", None)
    else:
        username = None
        nickname = "Deleted User"
        profile_pic = None
        slug = None

    timestamp = getattr(msg, "created_at", None)
    if timestamp is not None:
        from application.utilities.helper_functions import safe_parse_datetime

        parsed_ts = safe_parse_datetime(timestamp)
        timestamp = parsed_ts.isoformat() if parsed_ts else None

    conv = getattr(msg, "conversation", None)
    classroom_id = getattr(conv, "classroom_id", None) if conv else None

    return {
        "id": msg.id,
        "user_id": msg.user_id,
        "sender_id": msg.user_id,  # alias for WS parity
        "username": username,
        "nickname": nickname,
        "user_profile_pic": profile_pic,
        "slug": slug,
        "content": msg.content,
        "timestamp": timestamp,
        "message_type": getattr(msg, "message_type", "text"),
        "classroom_id": classroom_id,
        "is_global": classroom_id == GLOBAL_CLASSROOM_ID,
        "conversation_id": msg.conversation_id,
    }
