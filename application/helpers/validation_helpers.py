
import re
from datetime import datetime

from flask import current_app
from sqlalchemy.exc import IntegrityError

from application.extensions import db
from application.models.banned_words import BannedWords
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.user import User


def message_is_appropriate(message):
    banned_words = [word.word for word in BannedWords.query.all()]
    return is_appropriate(message=message, banned_words=banned_words)

def is_appropriate(message, banned_words=None):
    if banned_words is None:
        banned_words = []
    message_lower = message.lower()
    banned_words = [word.lower() for word in banned_words]
    return not any(word in message_lower for word in banned_words)

def detect_and_handle_challenge_url(message, username):
    # Generalized URL pattern for multiple domains
    url_pattern = (
        r"https://(?P<domain>[\w\.-]+)/play/level/(?P<challenge_name>[\w-]+)"
        r"(?:\?.*?&course=(?P<course_id>\w+))?"
        r"(?:&course-instance=(?P<course_instance>\w+))?"
    )
    match = re.search(url_pattern, message)

    if match:
        # Extract details from the URL
        domain = match.group('domain')
        challenge_name = match.group('challenge_name')
        course_id = match.group('course_id') or None  # Handle optional groups
        course_instance = match.group('course_instance') or None

        # Log to database
        log_challenge(
            username=username,
            domain=domain,
            challenge_name=challenge_name,
            course_id=course_id,
            course_instance=course_instance,
            timestamp=datetime.utcnow()
        )

        return True  # Indicate special message was handled

    return False  # No special content found

# def log_challenge(username, domain, challenge_name, course_id, course_instance, timestamp):
#     # Add entry to ChallengeLog model
#     db.session.add(ChallengeLog(
#         username=username,
#         domain=domain,
#         challenge_name=challenge_name,
#         course_id=course_id,
#         course_instance=course_instance,
#         timestamp=timestamp
#     ))
#     db.session.commit()


def log_challenge(username, domain, challenge_name, course_id, course_instance, timestamp):
    """Log a challenge and update the user's ducks."""

    try:
        # Ensure the app context is active
        if not current_app or not current_app.app_context():
            raise RuntimeError("No active Flask application context")
        # Query the user by username
        user = User.query.filter_by(username=username).first()
        if not user:
            raise ValueError(f"User with username '{username}' not found")


        # Fetch the challenge by name
        challenge = Challenge.query.filter(Challenge.name.ilike(challenge_name)).first()
        if not challenge:
            raise ValueError(f"Challenge '{challenge_name}' not found in the database")
        # Add a new challenge log entry
        challenge_log = ChallengeLog(
            username=username,
            domain=domain,
            challenge_name=challenge_name,
            course_id=course_id,
            course_instance=course_instance,
            timestamp=timestamp
        )
        db.session.add(challenge_log)

        user.ducks += challenge.value
        db.session.commit()

        return {"success": True, "message": "Challenge logged successfully"}

    except IntegrityError as e:
        db.session.rollback()
        return {"success": False, "message": f"Database error: {str(e)}"}

    except Exception as e:
        db.session.rollback()
        return {"success": False, "message": f"Error: {str(e)}"}
