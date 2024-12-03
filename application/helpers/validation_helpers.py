
import re
from datetime import datetime
from application import db
from application.models.banned_words import BannedWords
from application.models.code_combat_log import CodeCombatLog


def message_is_appropriate(message):
    banned_words = [word.word for word in BannedWords.query.all()]
    return is_appropriate(message=message, banned_words=banned_words)

def is_appropriate(message, banned_words=None):
    if banned_words is None:
        banned_words = []
    message_lower = message.lower()
    banned_words = [word.lower() for word in banned_words]
    return not any(word in message_lower for word in banned_words)

def detect_and_handle_codecombat_url(message, username):
    # Define the URL pattern for CodeCombat levels
    url_pattern = r"https://codecombat\.com/play/level/(?P<level_name>[\w-]+)\?&course=(?P<course_id>\w+)&course-instance=(?P<course_instance>\w+)"
    match = re.search(url_pattern, message)

    if match:
        # Extract details from the URL
        level_name = match.group('level_name')
        course_id = match.group('course_id')
        course_instance = match.group('course_instance')

        # Log to database (implement logging function separately)
        log_codecombat_level(
            username=username,
            level_name=level_name,
            course_id=course_id,
            course_instance=course_instance,
            timestamp=datetime.utcnow()
        )
        return True  # Indicate special message was handled

    return False  # No special content

def log_codecombat_level(username, level_name, course_id, course_instance, timestamp):
    # Example logging function, adjust for your DB
    db.session.add(CodeCombatLog(
        username=username,
        level_name=level_name,
        course_id=course_id,
        course_instance=course_instance,
        timestamp=timestamp
    ))
    db.session.commit()
