
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

# def detect_and_handle_challenge_url(message, username):
#     # Generalized URL pattern for multiple domains
#     url_pattern = (
#         r"https://(?P<domain>[\w\.-]+)/play/level/(?P<challenge_name>[\w-]+)"
#         r"(?:\?.*?&course=(?P<course_id>\w+))?"
#         r"(?:&course-instance=(?P<course_instance>\w+))?"
#     )
#     match = re.search(url_pattern, message)
#
#     if match:
#         # Extract details from the URL
#         domain = match.group('domain')
#         challenge_name = match.group('challenge_name')
#         course_id = match.group('course_id') or None  # Handle optional groups
#         course_instance = match.group('course_instance') or None
#
#         # Log to database
#         log_challenge(
#             username=username,
#             domain=domain,
#             challenge_name=challenge_name,
#             course_id=course_id,
#             course_instance=course_instance,
#             timestamp=datetime.utcnow()
# ***REMOVED***
#
#         return True  # Indicate special message was handled
#
#     return False  # No special content found
#
#
# def log_challenge(username, domain, challenge_name, course_id, course_instance, timestamp):
#     """Log a challenge and update the user's ducks."""
#
#     try:
#         # Ensure the app context is active
#         if not current_app or not current_app.app_context():
#             raise RuntimeError("No active Flask application context")
#         # Query the user by username
#         user = User.query.filter_by(username=username).first()
#         if not user:
#             raise ValueError(f"User with username '{username}' not found")
#
#
#         # Fetch the challenge by name
#         challenge = Challenge.query.filter(Challenge.name.ilike(challenge_name)).first()
#         if not challenge:
#             raise ValueError(f"Challenge '{challenge_name}' not found in the database")
#         # Add a new challenge log entry
#         challenge_log = ChallengeLog(
#             username=username,
#             domain=domain,
#             challenge_name=challenge_name,
#             course_id=course_id,
#             course_instance=course_instance,
#             timestamp=timestamp
# ***REMOVED***
#         db.session.add(challenge_log)
#
#         user.ducks += challenge.value
#         db.session.commit()
#
#         return {"success": True, "message": "Challenge logged successfully"}
#
#     except IntegrityError as e:
#         db.session.rollback()
#         return {"success": False, "message": f"Database error: {str(e)}"}
#
#     except Exception as e:
#         db.session.rollback()
#         return {"success": False, "message": f"Error: {str(e)}"}

# URL pattern for detecting challenge URLs
URL_PATTERN = (
    r"https://(?P<domain>[\w\.-]+)/play/level/(?P<challenge_name>[\w-]+)"
    r"(?:\?.*?&course=(?P<course_id>\w+))?"
    r"(?:&course-instance=(?P<course_instance>\w+))?"
)

def detect_and_handle_challenge_url(message, username):
    """Detect and handle a challenge URL in a message."""
    match = _extract_challenge_details(message)
    if match:
        log_result = _log_challenge(match, username)
        print(log_result)
        if log_result.get("success"):
            try:
                _update_user_ducks(username, match["challenge_name"])
            except ValueError as e:
                return {
                    "handled": True,
                    "details": {
                        "success": False,
                        "message": str(e)
                    }
                }
        return {
            "handled": True,
            "details": log_result
        }
    return {
        "handled": False,
        "details": None
    }

def _extract_challenge_details(message):
    """Extract challenge details from a message using a regex."""
    match = re.search(URL_PATTERN, message)
    if match:
        return {
            "domain": match.group("domain"),
            "challenge_name": match.group("challenge_name"),
            "course_id": match.group("course_id") or None,
            "course_instance": match.group("course_instance") or None,
        }
    return None

def _log_challenge(details, username):
    """Log the challenge details to the database."""
    try:
        existing_log = ChallengeLog.query.filter_by(
            username=username,
            domain=details["domain"],
            challenge_name=details["challenge_name"],
            course_id=details["course_id"],
            course_instance=details["course_instance"]
***REMOVED***.first()

        if existing_log:
            return {
                "success": False,
                "message": "Challenge log already exists",
                "timestamp": existing_log.timestamp
            }

        challenge_log = ChallengeLog(
            username=username,
            domain=details["domain"],
            challenge_name=details["challenge_name"],
            course_id=details["course_id"],
            course_instance=details["course_instance"],
            timestamp=datetime.utcnow()
***REMOVED***
        db.session.add(challenge_log)
        db.session.commit()

        return {
            "success": True,
            "message": "Challenge logged successfully",
            "timestamp": challenge_log.timestamp
        }

    except Exception as e:
        db.session.rollback()
        return {
            "success": False,
            "message": f"Error logging challenge: {str(e)}"
        }

def _update_user_ducks(username, challenge_name):
    """Update the user's duck count."""
    try:
        user = User.query.filter_by(username=username).first()
        if not user:
            raise ValueError(f"User with username '{username}' not found")
        challenge = Challenge.query.filter(Challenge.slug.ilike(challenge_name)).first()
        if not challenge:
            raise ValueError(f"Challenge '{challenge_name}' not found in the database")
        user.ducks += challenge.value
        db.session.commit()

    except ValueError:
        raise  # Re-raise specific errors for higher-level handling
    except Exception as e:
        db.session.rollback()
        raise RuntimeError(f"Error updating user ducks: {e}")
