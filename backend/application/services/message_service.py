from datetime import datetime
from application.constants import GLOBAL_CLASSROOM_ID

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
        "sender_id": msg.user_id,          # alias for WS parity
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
