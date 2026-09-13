"""
File: activity_routes.py
Type: py
Summary: Read-only endpoint that merges a student's challenge completions,
certificate submissions, file submissions, and course-connection requests
into a single chronological activity timeline.
"""

from application.decorators.api_response import api_response
from application.decorators.login_required import require_login
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.course_instance_request import CourseInstanceRequest
from application.models.submission import Submission
from application.models.user_certificate import UserCertificate
from flask import Blueprint, request, session
from sqlalchemy.orm import joinedload

activity_bp = Blueprint("activity", __name__)

# Reasonable per-source bound: this is a small single-classroom app on
# SQLite, not a scale problem, so we don't need cross-table SQL UNION
# machinery -- just pull each source's rows in Python and normalize.
_SOURCE_LIMIT = 200

_DEFAULT_PAGE = 1
_DEFAULT_PER_PAGE = 20
_MAX_PER_PAGE = 100


def _find_challenge(challenge_lookup, challenge_slug):
    """
    Resolve a ChallengeLog.challenge_slug to a Challenge using the same
    case-insensitive matching (with dash/space fallback) as
    challenge_routes._update_user_ducks, so titles resolve consistently
    with how the rest of the app matches slugs.
    """
    if not challenge_slug:
        return None

    lowered = challenge_slug.lower()
    if lowered in challenge_lookup:
        return challenge_lookup[lowered]

    lowered_spaces = challenge_slug.replace("-", " ").lower()
    return challenge_lookup.get(lowered_spaces)


def _get_challenge_activity(user_id):
    logs = (
        ChallengeLog.query.filter_by(user_id=user_id)
        .order_by(ChallengeLog.timestamp.desc())
        .limit(_SOURCE_LIMIT)
        .all()
    )
    if not logs:
        return []

    # Batch-fetch all challenges up front and build a slug -> Challenge
    # lookup dict, rather than querying per-log-row (avoids N+1s).
    challenges = Challenge.query.all()
    challenge_lookup = {c.slug.lower(): c for c in challenges if c.slug}

    items = []
    for log in logs:
        challenge = _find_challenge(challenge_lookup, log.challenge_slug)
        title = challenge.name if challenge else f"Challenge ({log.domain})"
        timestamp = log.timestamp.isoformat() if log.timestamp else None
        # Note: this is the challenge's CURRENT value, not necessarily the
        # historical awarded amount -- a duck multiplier/double-duck perk
        # can change over time and isn't stored per-log.
        reward = challenge.value if challenge else None
        items.append(
            {
                "id": f"challenge-{log.id}",
                "kind": "challenge",
                "title": title,
                "status": "completed",
                "submitted_at": timestamp,
                "resolved_at": timestamp,
                "detail": f"Helped by {log.helper}" if log.helper else None,
                "reward": reward,
            }
        )
    return items


def _get_certificate_activity(user_id):
    # Eager-load the achievement relationship in one query to avoid N+1s.
    certs = (
        UserCertificate.query.filter_by(user_id=user_id)
        .options(joinedload(UserCertificate.achievement))
        .order_by(UserCertificate.submitted_at.desc())
        .limit(_SOURCE_LIMIT)
        .all()
    )

    items = []
    for cert in certs:
        achievement = cert.achievement
        title = achievement.name if achievement else "Certificate"
        reward = (
            achievement.reward
            if cert.status == "approved" and achievement
            else None
        )
        items.append(
            {
                "id": f"certificate-{cert.id}",
                "kind": "certificate",
                "title": title,
                "status": cert.status,
                "submitted_at": (
                    cert.submitted_at.isoformat() if cert.submitted_at else None
                ),
                "resolved_at": (
                    cert.reviewed_at.isoformat() if cert.reviewed_at else None
                ),
                "detail": cert.review_note if cert.review_note else None,
                "reward": reward,
            }
        )
    return items


def _get_file_activity(user_id):
    submissions = (
        Submission.query.filter_by(user_id=user_id)
        .order_by(Submission.timestamp.desc())
        .limit(_SOURCE_LIMIT)
        .all()
    )

    items = []
    for submission in submissions:
        detail = submission.teacher_note if submission.teacher_note else submission.note
        items.append(
            {
                "id": f"file-{submission.id}",
                "kind": "file",
                "title": submission.original_filename,
                "status": submission.status,
                "submitted_at": (
                    submission.timestamp.isoformat() if submission.timestamp else None
                ),
                # No resolved/reviewed timestamp column exists on Submission
                # today -- documented gap, see final report.
                "resolved_at": None,
                "detail": detail if detail else None,
                "reward": None,
            }
        )
    return items


def _get_course_request_activity(user_id):
    requests = (
        CourseInstanceRequest.query.filter_by(student_id=user_id)
        .order_by(CourseInstanceRequest.created_at.desc())
        .limit(_SOURCE_LIMIT)
        .all()
    )

    items = []
    for req in requests:
        title = "Course connection request"
        if req.requested_course_id:
            title = f"Course connection request ({req.requested_course_id})"

        detail = req.url
        if detail and len(detail) > 200:
            detail = detail[:200]

        items.append(
            {
                "id": f"course_request-{req.id}",
                "kind": "course_request",
                "title": title,
                "status": req.status,
                "submitted_at": (
                    req.created_at.isoformat() if req.created_at else None
                ),
                # No resolved-timestamp column exists on CourseInstanceRequest
                # today -- documented gap, see final report.
                "resolved_at": None,
                "detail": detail,
                "reward": None,
            }
        )
    return items


def _parse_pagination_args():
    page_raw = request.args.get("page", _DEFAULT_PAGE)
    per_page_raw = request.args.get("per_page", _DEFAULT_PER_PAGE)

    try:
        page = int(page_raw)
        if page < 1:
            page = _DEFAULT_PAGE
    except (TypeError, ValueError):
        page = _DEFAULT_PAGE

    try:
        per_page = int(per_page_raw)
        if per_page < 1:
            per_page = _DEFAULT_PER_PAGE
    except (TypeError, ValueError):
        per_page = _DEFAULT_PER_PAGE

    per_page = min(per_page, _MAX_PER_PAGE)

    return page, per_page


@activity_bp.route("/activity", methods=["GET"], strict_slashes=False)
@require_login
@api_response
def get_activity():
    user_id = session.get("user")

    merged = (
        _get_challenge_activity(user_id)
        + _get_certificate_activity(user_id)
        + _get_file_activity(user_id)
        + _get_course_request_activity(user_id)
    )

    # Sort by submitted_at descending; treat None as oldest (shouldn't occur
    # since every source always has a submitted-at-equivalent timestamp).
    merged.sort(key=lambda item: item["submitted_at"] or "", reverse=True)

    page, per_page = _parse_pagination_args()
    total = len(merged)
    start = (page - 1) * per_page
    end = start + per_page
    page_items = merged[start:end]

    return {
        "items": page_items,
        "page": page,
        "per_page": per_page,
        "total": total,
        "has_more": (page * per_page) < total,
    }
