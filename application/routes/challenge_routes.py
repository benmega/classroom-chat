"""
File: challenge_routes.py
Type: py
Summary: Flask routes for challenge routes functionality (Merged Version).
"""

import re
from datetime import datetime

from flask import Blueprint, request, session, render_template, redirect, url_for, flash
from flask_cors import cross_origin

from application import Configuration
from application.extensions import db
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.user import User
from application.utilities.db_helpers import get_user

challenge = Blueprint("challenge", __name__, url_prefix="/challenge")

# Robust pattern from the working version
URL_PATTERN = (
    r"https://(?P<domain>[\w\.-]+)"
    r"(?:/play/(?:ozaria/)?level/(?P<challenge_slug>[\w-]+)"  # Changed group name to challenge_slug
    r"(?:\?(?:.*&)?course=(?P<course_id>[\w-]+))?"
    r"(?:(?:\?|&)(?:.*&)?course-instance=(?P<course_instance>[\w-]+))?"
    r"|/s/(?P<slug>[\w-]+)/lessons/(?P<lesson_id>\d+)/levels/(?P<level_id>\d+))"
)


@challenge.route("/submit", methods=["GET", "POST"])
@cross_origin(
    origins=["https://codecombat.com", "https://www.ozaria.com"],
    supports_credentials=True,
)
def submit_challenge():
    """Handle challenge submission form."""
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

    if request.method != "POST":
        return render_template("submit_challenge.html")

    url = request.form.get("url")
    helper = request.form.get("helpers", "").strip()
    notes = request.form.get("notes", "").strip()

    if not url:
        return render_template(
            "submit_challenge.html", success=False, message="Challenge URL is required"
        )

    duck_multiplier = config.duck_multiplier

    # Process the URL
    challenge_check = detect_and_handle_challenge_url(
        url, user.username, duck_multiplier, helper
    )

    if not isinstance(challenge_check, dict):
        challenge_check = {}

    if notes:
        print(f"{user.nickname} said: {notes}")

    details = challenge_check.get("details") or {}

    # Success path
    if challenge_check.get("handled") and details.get("success"):
        # Explicit commit to ensure log and user duck updates are saved
        db.session.commit()
        duck_reward = details.get("duck_reward", 0)
        return render_template(
            "submit_challenge.html",
            success=True,
            message=f"Congrats {user.username}, you earned {duck_reward} ducks!",
        )

    # Failure path
    msg = details.get(
        "message",
        "Mr. Mega does not recognize this challenge. Are you sure this is the right link?",
    )
    return render_template("submit_challenge.html", success=False, message=msg)


def detect_and_handle_challenge_url(message, username, duck_multiplier=1, helper=None):
    """
    Detect and handle a challenge URL in a message.
    """
    match = _extract_challenge_details(message)
    if not match:
        return {"handled": False, "details": None}

    # Log the challenge attempt (Using new schema)
    log_result = _log_challenge(match, username, helper)

    if not log_result.get("success"):
        return {"handled": True, "details": log_result}

    try:
        # Calculate rewards
        duck_reward = _update_user_ducks(
            username, match["challenge_slug"], duck_multiplier
        )
        log_result["duck_reward"] = duck_reward
        return {"handled": True, "details": log_result}
    except ValueError as e:
        return {"handled": True, "details": {"success": False, "message": str(e)}}


def _extract_challenge_details(message):
    """
    Extract challenge details from a message using regex.
    """
    match = re.search(URL_PATTERN, message)
    if not match:
        return None

    # Handle the two different regex groups (standard level vs slug URL)
    extracted_slug = match.group("challenge_slug") or match.group("slug")

    return {
        "domain": match.group("domain"),
        "challenge_slug": extracted_slug,  # Key updated to match DB schema
        "course_id": match.group("course_id") or None,
        "course_instance": match.group("course_instance") or None,
    }


def _log_challenge(details, username, helper=None):
    """
    Log challenge completion to the database using challenge_slug.
    """
    if helper == username:
        helper = ""

    try:
        # UPDATED: Query using challenge_slug instead of challenge_name
        existing_log = ChallengeLog.query.filter_by(
            username=username,
            domain=details["domain"],
            challenge_slug=details["challenge_slug"],
            course_id=details["course_id"],
        ).first()

        if existing_log:
            return {
                "success": False,
                "message": "You already claimed this level!",
                "timestamp": existing_log.timestamp,
            }

        # UPDATED: Instantiate using challenge_slug
        challenge_log = ChallengeLog(
            username=username,
            domain=details["domain"],
            challenge_slug=details["challenge_slug"],
            course_id=details["course_id"],
            course_instance=details["course_instance"],
            timestamp=datetime.utcnow(),
            helper=helper,
        )
        db.session.add(challenge_log)
        db.session.commit()

        return {
            "success": True,
            "message": "Challenge logged successfully",
            "timestamp": challenge_log.timestamp,
        }

    except Exception as e:
        db.session.rollback()
        return {"success": False, "message": f"Error logging challenge: {str(e)}"}


def _update_user_ducks(username, challenge_slug, duck_multiplier=1):
    """
    Update the user's duck count.
    """
    try:
        user = User.query.filter_by(username=username).first()
        if not user:
            raise ValueError(f"User with username '{username}' not found")

        # UPDATED: Try finding by slug, then try relaxed matching (spaces vs dashes)
        challenge = Challenge.query.filter(Challenge.slug.ilike(challenge_slug)).first()

        if not challenge:
            # Fallback: sometimes URLs have dashes where DB has spaces
            slug_with_spaces = challenge_slug.replace("-", " ")
            challenge = Challenge.query.filter(
                Challenge.slug.ilike(slug_with_spaces)
            ).first()

        if not challenge:
            raise ValueError(f"Challenge '{challenge_slug}' not found in the database")

        duck_reward = challenge.value * duck_multiplier

        if duck_multiplier > 1:
            print(f"Duck multiplier of {duck_multiplier} in effect.")

        user.add_ducks(duck_reward)
        print(f"{username} was granted {duck_reward} duck(s).")

        return duck_reward

    except ValueError:
        raise
    except Exception as e:
        db.session.rollback()
        raise RuntimeError(f"Error updating user ducks: {e}")
