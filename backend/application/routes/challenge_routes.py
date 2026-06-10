"""
File: challenge_routes.py
Type: py
Summary: Flask routes for challenge routes functionality (Merged Version).
"""

import re
from datetime import datetime

import os
from urllib.parse import parse_qs
from flask import Blueprint, request, session, redirect, url_for, flash, jsonify
from flask_cors import cross_origin

from application import Configuration
from application.extensions import db, csrf
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.course_instance import CourseInstance
from application.models.user import User
from application.utilities.db_helpers import get_user

challenge = Blueprint("challenge", __name__, url_prefix="/challenge")

# Robust pattern from the working version
# Robust base pattern for CodeCombat and Ozaria URLs
BASE_PATTERN = (
    r"https://(?P<domain>[\w\.-]+)"
    r"(?:"
    r"/play/(?:ozaria/)?level/(?P<challenge_slug>[\w-]+)"
    r"|/s/(?P<slug>[\w-]+)/lessons/(?P<lesson_id>\d+)/levels/(?P<level_id>\d+)"
    r")"
)
# Pattern that also captures potential query parameters
URL_PATTERN = BASE_PATTERN + r"(?P<params>\?[^ \n\r\t]*)?"


FRONTEND_ORIGINS = (
    os.getenv("CORS_ORIGINS", "").split(",")
    if os.getenv("CORS_ORIGINS")
    else [
        "https://blossom.benmega.com",
        "https://d2pa3ix3n5behv.cloudfront.net",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:8000",
    ]
)

CHALLENGE_ORIGINS = FRONTEND_ORIGINS + [
    "https://codecombat.com",
    "https://www.codecombat.com",
    "https://ozaria.com",
    "https://www.ozaria.com",
]

@challenge.route("/submit", methods=["GET", "POST"])
@csrf.exempt
@cross_origin(
    origins=CHALLENGE_ORIGINS,
    supports_credentials=True,
)
def submit_challenge():
    """Handle challenge submission form."""
    session_userid = session.get("user", None)
    if not session_userid:
        if request.is_json or request.accept_mimetypes.accept_json:
            return {
                "success": False,
                "message": "Please log in to the Classroom Chat app first.",
            }, 401
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
        if request.is_json or request.accept_mimetypes.accept_json:
            return jsonify({"status": "ready"})
        return redirect("/challenges/submit")

    # Handle both Form and JSON data
    if request.is_json:
        data = request.get_json()
        url = data.get("url")
        helper = data.get("helpers", "").strip()
        notes = data.get("notes", "").strip()
    else:
        url = request.form.get("url")
        helper = request.form.get("helpers", "").strip()
        notes = request.form.get("notes", "").strip()

    if not url:
        msg = "Challenge URL is required"
        return jsonify({"success": False, "message": msg}), 400

    duck_multiplier = config.duck_multiplier

    # Process the URL
    challenge_check = detect_and_handle_challenge_url(
        url, user, duck_multiplier, helper
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
        duck_word = "duck" if duck_reward == 1 else "ducks"
        message = f"Congrats {user.username}, you earned {duck_reward} {duck_word}!"

        # ---- Classroom enrollment trigger ----------------------------------
        # If the challenge log was successful, we check if it provided a
        # classroom_id to enroll the user in.
        classroom_id = details.get("classroom_id")
        if classroom_id:
            _enroll_user_in_classroom(user, classroom_id)

        return jsonify(
            {
                "success": True,
                "message": message,
                "duck_reward": duck_reward,
                "quack_count": duck_reward,
            }
        )

    # Failure path
    msg = details.get(
        "message",
        "Mr. Mega does not recognize this challenge. Are you sure this is the right link?",
    )

    return jsonify({"success": False, "message": msg}), 400


def detect_and_handle_challenge_url(message, user, duck_multiplier=1, helper=None):
    """
    Detect and handle a challenge URL in a message.
    """
    match = _extract_challenge_details(message)
    if not match:
        return {"handled": False, "details": None}

    log_result = _log_challenge(match, user, helper)

    if not log_result.get("success"):
        return {"handled": True, "details": log_result}

    try:
        # Calculate rewards
        duck_reward = _update_user_ducks(
            user, match["challenge_slug"], duck_multiplier
        )
        log_result["duck_reward"] = duck_reward
        return {"handled": True, "details": log_result}
    except ValueError as e:
        return {"handled": True, "details": {"success": False, "message": str(e)}}


def _extract_challenge_details(message):
    """
    Extract challenge details from a message using regex and URL parsing.
    """
    match = re.search(URL_PATTERN, message)
    if not match:
        return None

    domain = match.group("domain")
    challenge_slug = match.group("challenge_slug") or match.group("slug")
    params_str = match.group("params") or ""

    course_id = None
    course_instance = None

    if params_str:
        # parse_qs returns a dict mapping keys to lists of values
        qs = parse_qs(params_str.lstrip("?"))
        course_id = qs.get("course", [None])[0]
        course_instance = qs.get("course-instance", [None])[0]

    return {
        "domain": domain,
        "challenge_slug": challenge_slug,
        "course_id": course_id,
        "course_instance": course_instance,
    }


def _log_challenge(details, user, helper=None):
    """
    Log challenge completion to the database using challenge_slug.
    """
    if user and helper == user.username:
        helper = ""

    try:
        # 1. Grab the ID from the URL. (CodeCombat often puts the instance ID in the 'course' param)
        provided_id = details.get("course_instance") or details.get("course_id")

        if not provided_id:
            return {
                "success": False,
                "message": "No course instance provided in the URL.",
            }

        # 2. Verify the CourseInstance exists.
        course_instance = CourseInstance.query.filter_by(id=provided_id).first()
        if not course_instance:
            return {
                "success": False,
                "message": "This level doesn't seem to be part of a valid course instance.",
            }

        # Get the parent course ID mapped to this instance
        actual_course_id = course_instance.course_id

        # 3. Verify the Challenge exists AND belongs to the parent course
        challenge_slug = details["challenge_slug"]

        # Match the slug (handling potential space/dash mismatches)
        challenge = Challenge.query.filter(
            (Challenge.slug.ilike(challenge_slug))
            | (Challenge.slug.ilike(challenge_slug.replace("-", " ")))
        ).first()

        if not challenge:
            return {
                "success": False,
                "message": f"Couldn't identify challenge '{challenge_slug}'. Check the link and try again.",
            }

        # The ultimate validation: Does this challenge actually belong to this course?
        if challenge.course_id != actual_course_id:
            return {
                "success": False,
                "message": "This challenge does not belong to the specified course.",
            }

        # 4. Tighten uniqueness check: SAME user, SAME challenge, SAME course instance
        filters = {
            "user_id": user.id,
            "challenge_slug": challenge.slug,  # Using the canonical slug from the DB
            "course_instance": course_instance.id,  # Strictly checking the instance, not the course
        }

        existing_log = ChallengeLog.query.filter_by(**filters).first()

        if existing_log:
            return {
                "success": False,
                "message": "You already claimed this level for this specific course instance!",
                "timestamp": existing_log.timestamp,
            }

        # 5. Create new log with the strictly validated data
        challenge_log = ChallengeLog(
            user_id=user.id,
            domain=details["domain"],
            challenge_slug=challenge.slug,
            course_id=actual_course_id,  # Verified parent course ID
            course_instance=course_instance.id,  # Verified instance ID
            timestamp=datetime.utcnow(),
            helper=helper,
        )
        db.session.add(challenge_log)
        db.session.commit()

        return {
            "success": True,
            "message": "Challenge logged successfully",
            "timestamp": challenge_log.timestamp,
            "classroom_id": challenge.classroom_id or course_instance.classroom_id,
        }

    except Exception as e:
        db.session.rollback()
        return {"success": False, "message": f"Error logging challenge: {str(e)}"}


def _update_user_ducks(user, challenge_slug, duck_multiplier=1):
    """
    Update the user's duck count.
    """
    try:
        if not user:
            raise ValueError(f"User not found")

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

        user.add_ducks(duck_reward, reason=f"Challenge: {challenge.slug}")
        print(f"{user.username} was granted {duck_reward} duck(s).")

        return duck_reward

    except ValueError:
        raise
    except Exception as e:
        db.session.rollback()
        raise RuntimeError(f"Error updating user ducks: {e}")


# ============================================================================
# ENROLLMENT HELPERS
# ============================================================================


def _enroll_user_in_classroom(user, classroom_id: str):
    """
    Insert a user_classrooms row for (user.id, classroom_id) if one does not
    already exist.  Emits a 'classroom_enrolled' WebSocket event to inform the
    frontend sidebar to update without a page reload.

    This is the ONLY student enrollment path — called exclusively from the
    challenge submission success route.
    """
    from application.models.classroom import Classroom, user_classrooms
    from datetime import datetime
    from sqlalchemy import select, insert

    try:
        # Check for existing enrollment
        already = db.session.execute(
            select(user_classrooms.c.classroom_id).where(
                user_classrooms.c.user_id == user.id,
                user_classrooms.c.classroom_id == classroom_id,
            )
        ).first()

        if already:
            return  # Idempotent — already enrolled

        classroom = db.session.get(Classroom, classroom_id)
        if not classroom:
            print(
                f"[Enrollment] Classroom '{classroom_id}' not found — skipping enrollment."
            )
            return

        db.session.execute(
            insert(user_classrooms).values(
                user_id=user.id,
                classroom_id=classroom_id,
                enrolled_at=datetime.utcnow(),
            )
        )
        db.session.commit()
        print(f"[Enrollment] User {user.id} enrolled in classroom '{classroom_id}'.")

        # Emit enrollment event via centralised helper so the sidebar updates live
        from application.socket_events import emit_classroom_enrolled

        emit_classroom_enrolled(user.id, classroom.to_dict())

    except Exception as exc:
        db.session.rollback()
        print(f"[Enrollment] Failed for user {user.id} → '{classroom_id}': {exc}")
