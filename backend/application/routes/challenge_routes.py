"""
File: challenge_routes.py
Type: py
Summary: Flask routes for challenge routes functionality (Merged Version).
"""

import logging
import os
import re
from datetime import datetime
from urllib.parse import parse_qs

from application import Configuration
from application.config import (
    BOOKMARKLET_ORIGINS,
    DEFAULT_DEV_CORS_ORIGINS,
    DEFAULT_PROD_CORS_ORIGINS,
    cors_origins_from_env,
)
from application.extensions import csrf, db, socketio
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.course_instance import CourseInstance
from application.models.user import User
from flask import Blueprint, flash, jsonify, redirect, request, session, url_for
from flask_cors import cross_origin
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)

challenge = Blueprint("challenge", __name__, url_prefix="/challenge")

# ChallengeLog.helper is String(100)
_MAX_HELPER_LENGTH = 100
_ALREADY_CLAIMED_MESSAGE = (
    "You already claimed this level for this specific course instance!"
)
_CLAIM_FAILED_MESSAGE = "Could not log your challenge right now. Please try again."

# Base pattern for CodeCombat and Ozaria URLs
BASE_PATTERN = (
    r"https://(?P<domain>[\w\.-]+)"
    r"(?:"
    r"/play/(?:(?:ozaria|junior)/)?level/(?P<challenge_slug>[\w-]+)"
    r"|/s/(?P<slug>[\w-]+)/lessons/(?P<lesson_id>\d+)/levels/(?P<level_id>\d+)"
    r")"
)
# Pattern that also captures potential query parameters
URL_PATTERN = BASE_PATTERN + r"(?P<params>\?[^ \n\r\t]*)?"


def _frontend_origins():
    """The app-wide CORS allow-list: CORS_ORIGINS if set, else the defaults for
    this environment (localhost origins only outside production)."""
    is_production = os.getenv("FLASK_ENV", "development").lower() == "production"
    return cors_origins_from_env(
        DEFAULT_PROD_CORS_ORIGINS if is_production else DEFAULT_DEV_CORS_ORIGINS
    )


FRONTEND_ORIGINS = _frontend_origins()

CHALLENGE_ORIGINS = [*FRONTEND_ORIGINS, *BOOKMARKLET_ORIGINS]


def _wants_json():
    """True when the caller is an API client rather than a browser form."""
    return request.is_json or request.accept_mimetypes.accept_json


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
        if request.method == "GET" and request.args.get("url"):
            return (
                "<html><body><script>alert('Please log in to the Classroom Chat app first.'); window.close();</script>Please log in.</body></html>",
                401,
            )
        if _wants_json():
            return {
                "success": False,
                "message": "Please log in to the Classroom Chat app first.",
            }, 401
        flash("No session user found", "error")
        return redirect(url_for("user.login"))

    user = db.session.get(User, session_userid)
    if not user:
        if _wants_json():
            return jsonify({"success": False, "message": "Unknown user"}), 401
        flash("Unknown user", "error")
        return redirect(url_for("user.login"))

    config = Configuration.query.first()
    if not config:
        if _wants_json():
            return jsonify({"success": False, "message": "Configuration missing"}), 503
        flash("Configuration missing", "error")
        return redirect(url_for("general.index"))

    is_get_submission = False
    if request.method == "GET":
        url = request.args.get("url")
        if url:
            is_get_submission = True
            helper = request.args.get("helpers", "") or ""
            notes = request.args.get("notes", "") or ""
            helper = helper.strip()
            notes = notes.strip()
        else:
            if request.is_json or request.accept_mimetypes.accept_json:
                return jsonify({"status": "ready"})
            return redirect("/challenges/submit")
    else:
        # Handle both Form and JSON data
        if request.is_json:
            data = request.get_json(silent=True)
            if not isinstance(data, dict):
                return jsonify({"success": False, "message": "Invalid JSON body"}), 400
            url = data.get("url")
            helper = data.get("helpers") or ""
            notes = data.get("notes") or ""
            if not isinstance(helper, str) or not isinstance(notes, str):
                msg = "helpers and notes must be text"
                return jsonify({"success": False, "message": msg}), 400
            helper = helper.strip()
            notes = notes.strip()
        else:
            url = request.form.get("url")
            helper = (request.form.get("helpers") or "").strip()
            notes = (request.form.get("notes") or "").strip()

    if not url or not isinstance(url, str):
        msg = "Challenge URL is required"
        return jsonify({"success": False, "message": msg}), 400

    duck_multiplier = config.duck_multiplier
    if user.has_double_duck:
        duck_multiplier *= 2

    # Process the URL (logs the claim and awards the ducks in one commit)
    challenge_check = detect_and_handle_challenge_url(
        url, user, duck_multiplier, helper
    )

    if not isinstance(challenge_check, dict):
        challenge_check = {}

    details = challenge_check.get("details") or {}

    # Success path
    if challenge_check.get("handled") and details.get("success"):
        duck_reward = details.get("duck_reward", 0)
        duck_word = "duck" if duck_reward == 1 else "ducks"

        reward_issued = details.get("reward_issued", True)
        warning = details.get("warning")

        challenge_name = details.get("challenge_name")
        if challenge_name:
            message = f"Congratulations on completing {challenge_name}! You earned {duck_reward} {duck_word}!"
        else:
            message = f"Congrats {user.username}, you earned {duck_reward} {duck_word}!"

        # ---- Classroom enrollment trigger ----------------------------------
        # If the challenge log was successful, we check if it provided a
        # classroom_id to enroll the user in.
        classroom_id = details.get("classroom_id")
        if classroom_id:
            _enroll_user_in_classroom(user, classroom_id)

        # Evaluate achievements on claiming ducks
        from application.services.achievement_engine import evaluate_user

        new_awards = evaluate_user(user)
        awards_payload = []
        if new_awards:
            awards_payload = [
                {
                    "id": a.id,
                    "name": a.name,
                    "slug": a.slug,
                    "badge": f"/static/images/achievement_badges/{a.slug}.png",
                }
                for a in new_awards
            ]
            socketio.emit(
                "achievement_unlocked",
                {"new_awards": awards_payload},
                room=f"user:{user.id}",
            )

        if is_get_submission:
            return f"<html><body><script>alert('{message}'); window.close();</script>{message}</body></html>"

        return jsonify(
            {
                "success": True,
                "message": message,
                "duck_reward": duck_reward,
                "quack_count": duck_reward,
                "reward_issued": reward_issued,
                "warning": warning,
                "new_awards": awards_payload,
            }
        )

    # Failure path
    msg = details.get(
        "message",
        "Mr. Mega does not recognize this challenge. Are you sure this is the right link?",
    )

    if details.get("course_instance_not_found"):
        from application.models.course_instance_request import CourseInstanceRequest

        course_instance_id = details.get("course_instance_id")
        requested_course_id = details.get("requested_course_id")

        if course_instance_id:
            existing_request = CourseInstanceRequest.query.filter_by(
                course_instance_id=course_instance_id
            ).first()

            if not existing_request:
                new_request = CourseInstanceRequest(
                    student_id=user.id,
                    course_instance_id=course_instance_id,
                    requested_course_id=requested_course_id,
                    url=url,
                    status="pending",
                )
                db.session.add(new_request)
                db.session.commit()
                msg = "This course wasn't connected yet, but we've automatically requested your teacher to add it!"
            else:
                msg = "This course wasn't connected yet. A request to add it has already been submitted."

    if is_get_submission:
        # Escape single quotes in the message for JS alert
        safe_msg = msg.replace("'", "\\'")
        return (
            f"<html><body><script>alert('Failed: {safe_msg}'); window.close();</script>Failed: {msg}</body></html>",
            400,
        )

    return jsonify(
        {
            "success": False,
            "message": msg,
            "course_instance_not_found": details.get("course_instance_not_found"),
            "course_instance_id": details.get("course_instance_id"),
            "requested_course_id": details.get("requested_course_id"),
        }
    ), 400


def get_track_for_course_id(course_id):
    if not course_id:
        return None
    from application.models.course import Course

    course = Course.query.get(course_id)
    if not course:
        return None
    name_upper = course.name.upper()
    if "CHAPTER" in name_upper:
        return "ozaria"
    elif "GD" in name_upper:
        return "gd"
    elif "WD" in name_upper:
        return "wd"
    elif "CS" in name_upper or "JUNIOR" in name_upper:
        return "cs"

    if "ozaria" in course.domain:
        return "ozaria"
    return "cs"


def detect_and_handle_challenge_url(message, user, duck_multiplier=1, helper=None):
    """
    Detect and handle a challenge URL in a message.

    The challenge log, the user's track/activity and the duck reward are
    written in a single transaction: either all of them are committed or
    none are, so a failed reward can never leave a logged-but-unrewarded claim.
    """
    match = _extract_challenge_details(message)
    if not match:
        return {"handled": False, "details": None}

    log_result = _log_challenge(match, user, helper)

    if not log_result.get("success"):
        return {"handled": True, "details": log_result}

    # Captured up front: after a rollback the instances are expired and
    # reading them again would hit the database.
    user_id = user.id
    challenge = log_result.pop("challenge")
    challenge_slug = challenge.slug

    try:
        # Update user's active track if they completed a challenge on a new track
        challenge_track = get_track_for_course_id(challenge.course_id)
        if challenge_track and challenge_track != user.active_track:
            user.active_track = challenge_track
            db.session.add(user)

        # Always save progress and grant the duck reward
        duck_reward = _update_user_ducks(user, challenge, duck_multiplier)

        # One commit for the log row, the activity/track fields and the ducks
        db.session.commit()
    except IntegrityError:
        # Lost a double-submit race: the other request already logged this claim
        logger.warning(
            "Challenge claim rejected by the database for user %s slug %s",
            user_id,
            challenge_slug,
            exc_info=True,
        )
        db.session.rollback()
        return {
            "handled": True,
            "details": {"success": False, "message": _ALREADY_CLAIMED_MESSAGE},
        }
    except Exception:
        db.session.rollback()
        logger.exception(
            "Challenge reward failed for user %s slug %s", user_id, challenge_slug
        )
        return {
            "handled": True,
            "details": {"success": False, "message": _CLAIM_FAILED_MESSAGE},
        }

    log_result["duck_reward"] = duck_reward
    log_result["reward_issued"] = True
    log_result["warning"] = None

    return {"handled": True, "details": log_result}


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


def _resolve_challenge(slug):
    """
    Look a challenge up by URL slug: case-insensitive exact match, tolerating
    dashes where the stored slug has spaces. Deliberately not a LIKE match, so
    '_' in the URL cannot act as a wildcard. An exact-case match wins if
    several rows differ only by case; otherwise the lowest id is used.
    """
    if not slug:
        return None

    lowered = slug.lower()
    candidates = sorted({lowered, lowered.replace("-", " ")})
    matches = (
        Challenge.query.filter(func.lower(Challenge.slug).in_(candidates))
        .order_by(Challenge.id)
        .all()
    )
    for match in matches:
        if match.slug == slug:
            return match
    return matches[0] if matches else None


def _log_challenge(details, user, helper=None):
    """
    Validate a challenge claim and stage its ChallengeLog row.

    Nothing is committed here: the caller owns the transaction so the log can
    be committed together with the duck reward. On success the resolved
    Challenge is returned under the "challenge" key.
    """
    user_id = getattr(user, "id", None)
    challenge_slug = details.get("challenge_slug")

    # The helper may not be the user themselves (compare case-insensitively)
    helper = helper.strip() if isinstance(helper, str) else ""
    helper = helper[:_MAX_HELPER_LENGTH]
    if user and helper.casefold() == (user.username or "").casefold():
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
                "course_instance_not_found": True,
                "course_instance_id": provided_id,
                "requested_course_id": details.get("course_id"),
            }

        # Get the parent course ID mapped to this instance
        actual_course_id = course_instance.course_id

        # 3. Verify the Challenge exists AND belongs to the parent course
        # Match the slug (handling potential space/dash mismatches). This is the
        # only lookup: the track and the reward use this same row.
        challenge = _resolve_challenge(challenge_slug)

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
                "message": _ALREADY_CLAIMED_MESSAGE,
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
        user.current_activity = f"Working on {challenge.name}"
        user.last_activity_time = datetime.utcnow()
        # Flush (not commit) so a constraint violation surfaces here, while the
        # caller still owns the transaction.
        db.session.flush()

        return {
            "success": True,
            "message": "Challenge logged successfully",
            "timestamp": challenge_log.timestamp,
            "classroom_id": challenge.classroom_id or course_instance.classroom_id,
            "challenge_name": challenge.name,
            "challenge": challenge,
        }

    except IntegrityError:
        # Another request logged the same claim between our check and insert
        logger.warning(
            "Challenge claim rejected by the database for user %s slug %s",
            user_id,
            challenge_slug,
            exc_info=True,
        )
        db.session.rollback()
        return {"success": False, "message": _ALREADY_CLAIMED_MESSAGE}
    except Exception:
        # Log the real error server-side; never echo DB/driver text to the client
        logger.exception(
            "Challenge log failed for user %s slug %s", user_id, challenge_slug
        )
        db.session.rollback()
        return {"success": False, "message": _CLAIM_FAILED_MESSAGE}


def _update_user_ducks(user, challenge, duck_multiplier=1):
    """
    Stage the duck reward for a challenge on the user and return its size.

    ``challenge`` is the already-resolved Challenge (a slug string is also
    accepted and resolved with the same exact, case-insensitive lookup).
    Nothing is committed or rolled back here: the caller owns the transaction.
    """
    if not user:
        raise ValueError("User not found")

    challenge_slug = challenge if isinstance(challenge, str) else None
    if challenge_slug is not None:
        challenge = _resolve_challenge(challenge_slug)
    if not challenge:
        raise ValueError(f"Challenge '{challenge_slug}' not found in the database")

    duck_reward = challenge.value * duck_multiplier

    user.add_ducks(duck_reward, reason=f"Challenge: {challenge.slug}")

    return duck_reward


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
    from datetime import datetime

    from application.models.classroom import Classroom, user_classrooms
    from sqlalchemy import insert, select

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
            logger.warning(
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
        logger.info(
            f"[Enrollment] User {user.id} enrolled in classroom '{classroom_id}'."
        )

        # Emit enrollment event via centralised helper so the sidebar updates live
        from application.socket_events import emit_classroom_enrolled

        emit_classroom_enrolled(user.id, classroom.to_dict())

    except Exception as exc:
        db.session.rollback()
        logger.exception(
            f"[Enrollment] Failed for user {user.id} → '{classroom_id}': {exc}"
        )
