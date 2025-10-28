# challenge_routes.py
# Blueprint: Handles challenge submissions separate from chat
import re
from datetime import datetime

from flask import Blueprint, request, session, render_template, redirect, url_for, flash

from application import Configuration
from application.extensions import db
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.utilities.db_helpers import get_user
from application.models.user import User
# from application.utilities.validation_helpers import detect_and_handle_challenge_url

challenge = Blueprint("challenge", __name__, url_prefix="/challenge")


@challenge.route("/submit", methods=["GET", "POST"])
def submit_challenge():
    """Handle challenge submission form."""
    # Validate session
    session_userid = session.get("user", None)
    if not session_userid:
        flash("No session user found", "error")
        return redirect(url_for("user.login"))

    user = get_user(session_userid)
    if not user:
        flash("Unknown user", "error")
        return redirect(url_for("user.login"))

    config = Configuration.query.first()
    if not config:
        flash("Configuration missing", "error")
        return redirect(url_for("general.index"))

    # Handle GET request
    if request.method != "POST":
        return render_template("submit_challenge.html")

    # Handle POST request
    url = request.form.get("url")
    helper = request.form.get("helpers", "").strip()
    notes = request.form.get("notes", "").strip()

    if not url:
        return render_template("submit_challenge.html",
                               success=False,
                               message="Challenge URL is required")

    # Process challenge URL
    duck_multiplier = config.duck_multiplier
    challenge_check = detect_and_handle_challenge_url(
        url, user.username, duck_multiplier, helper
    )

    # Process notes if provided
    if notes:
        print(f"{user.nickname} said: {notes}")

    # Handle successful challenge submission
    if challenge_check.get("handled") and challenge_check["details"].get("success"):
        db.session.commit()
        duck_reward = challenge_check["details"].get("duck_reward", 0)

        return render_template(
            "submit_challenge.html",
            success=True,
            message=f"Congrats {user.username}, you earned {duck_reward} ducks!",
        )

    # Handle failed challenge submission
    msg = challenge_check.get("details", {}).get(
        "message", "Challenge could not be validated"
    )
    return render_template("submit_challenge.html", success=False, message=msg)


# ============================================================================
# CHALLENGE URL HANDLING
# ============================================================================

URL_PATTERN = (
    r"https://(?P<domain>[\w\.-]+)"
    r"(?:/play/level/(?P<challenge_name>[\w-]+)"
    r"(?:\?(?:.*&)?course=(?P<course_id>[\w-]+))?"
    r"(?:(?:\?|&)(?:.*&)?course-instance=(?P<course_instance>[\w-]+))?"
    r"|/s/(?P<slug>[\w-]+)/lessons/(?P<lesson_id>\d+)/levels/(?P<level_id>\d+))"
)

# URL_PATTERN = (
#     r"https://(?P[\w\.-]+)"
#     r"(?:/play/level/(?P[\w-]+)"
#     r"(?:\?(?:.*&)?course=(?P[\w-]+))?"
#     r"(?:(?:\?|&)(?:.*&)?course-instance=(?P[\w-]+))?"
#     r"|/s/(?P[\w-]+)/lessons/(?P\d+)/levels/(?P\d+))"
# )

# URL_PATTERN = (
#     r"https://(?P<domain>[\w\.-]+)"
#     r"(?:/play/level/(?P<challenge_name>[\w-]+)"
#     r"(?:\?.*?&course=(?P<course_id>\w+))?"
#     r"(?:&course-instance=(?P<course_instance>\w+))?"
#     r"|/s/(?P<course_slug>[\w-]+)/lessons/(?P<lesson_id>\d+)/levels/(?P<level_id>\d+))"
# )


def detect_and_handle_challenge_url(message, username, duck_multiplier=1, helper=None):
    """
    Detect and handle a challenge URL in a message.

    Args:
        message: The message containing the URL
        username: Username of the person submitting
        duck_multiplier: Multiplier for duck rewards
        helper: Optional helper information

    Returns:
        dict: Response with 'handled' status and 'details' containing result info
    """
    match = _extract_challenge_details(message)
    if not match:
        return {"handled": False, "details": None}

    # Log the challenge attempt
    log_result = _log_challenge(match, username, helper)
    print(log_result)

    if not log_result.get("success"):
        return {"handled": True, "details": log_result}

    # Update user ducks if logging was successful
    try:
        duck_reward = _update_user_ducks(username, match["challenge_name"], duck_multiplier)
        log_result["duck_reward"] = duck_reward
        return {"handled": True, "details": log_result}
    except ValueError as e:
        return {
            "handled": True,
            "details": {
                "success": False,
                "message": str(e)
            }
        }


def _extract_challenge_details(message):
    """
    Extract challenge details from a message using regex.

    Returns:
        dict: Challenge details or None if no match found
    """
    match = re.search(URL_PATTERN, message)
    if not match:
        return None

    return {
        "domain": match.group("domain"),
        "challenge_name": match.group("challenge_name"),
        "course_id": match.group("course_id") or None,
        "course_instance": match.group("course_instance") or None,
    }


def _log_challenge(details, username, helper=None):
    """
    Log challenge completion to the database.

    Args:
        details: Dictionary with challenge details
        username: Username of the person completing the challenge
        helper: Optional helper information

    Returns:
        dict: Result with success status and message
    """
    # Patch to catch students attempting to help themselves
    if helper == username:
        helper = ""

    try:
        # Check if challenge was already claimed
        existing_log = ChallengeLog.query.filter_by(
            username=username,
            domain=details["domain"],
            challenge_name=details["challenge_name"],
            course_id=details["course_id"],
        ).first()

        if existing_log:
            return {
                "success": False,
                "message": "You already claimed this level!",
                "timestamp": existing_log.timestamp
            }

        # Create new challenge log
        challenge_log = ChallengeLog(
            username=username,
            domain=details["domain"],
            challenge_name=details["challenge_name"],
            course_id=details["course_id"],
            course_instance=details["course_instance"],
            timestamp=datetime.utcnow(),
            helper=helper
        )
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


def _update_user_ducks(username, challenge_name, duck_multiplier=1):
    """
    Update the user's duck count based on challenge completion.

    Args:
        username: Username of the user
        challenge_name: Name/slug of the challenge
        duck_multiplier: Multiplier for the duck reward

    Returns:
        int: The duck reward amount

    Raises:
        ValueError: If user or challenge not found
        RuntimeError: If database update fails
    """
    try:
        user = User.query.filter_by(username=username).first()
        if not user:
            raise ValueError(f"User with username '{username}' not found")

        challenge = Challenge.query.filter(Challenge.slug.ilike(challenge_name)).first()
        if not challenge:
            raise ValueError(f"Challenge '{challenge_name}' not found in the database")

        # Calculate duck reward
        duck_reward = challenge.value * duck_multiplier

        if duck_multiplier > 1:
            print(f'Duck multiplier of {duck_multiplier} in effect.')

        user.add_ducks(duck_reward)
        print(f'{username} was granted {duck_reward} duck(s).')

        return duck_reward

    except ValueError:
        raise  # Re-raise specific errors for higher-level handling
    except Exception as e:
        db.session.rollback()
        raise RuntimeError(f"Error updating user ducks: {e}")
