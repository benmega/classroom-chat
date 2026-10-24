"""
File: quiz_routes.py
Type: py
Summary: Student tests API: list, start, save and submit attempts; results for the
         student, their linked parents and admins; admin settings and results.
"""

from application.decorators.api_response import api_response
from application.decorators.login_required import require_login
from application.extensions import db, limiter
from application.models.classroom import Classroom
from application.models.quiz import Quiz, QuizAttempt, QuizQuestion
from application.models.user import User
from application.services import quiz_service
from application.services.quiz_service import QuizValidationError
from application.utilities.helper_functions import to_utc_iso, utcnow_naive
from flask import Blueprint, request, session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

quiz_bp = Blueprint("quiz", __name__)

# The most rows the admin results list returns
RESULTS_LIMIT = 500
_SETTING_FLAGS = ("is_active", "reveal_answers", "allow_retakes")


# --- helpers ----------------------------------------------------------------


def _current_user():
    return db.session.get(User, session.get("user"))


def _gone():
    """The session points at a user that no longer exists."""
    return {"error": "Authentication required. Please log in."}, 401


def _questions(quiz_id):
    return (
        QuizQuestion.query.filter_by(quiz_id=quiz_id).order_by(QuizQuestion.number).all()
    )


def _question_counts(quiz_ids=None):
    query = db.session.query(QuizQuestion.quiz_id, func.count(QuizQuestion.id)).group_by(
        QuizQuestion.quiz_id
    )
    if quiz_ids is not None:
        query = query.filter(QuizQuestion.quiz_id.in_(quiz_ids))
    return dict(query.all())


def _can_review(viewer, student):
    """Admins, and parents linked to the student, may read any of their results."""
    if viewer.role == "admin":
        return True
    return viewer.role == "parent" and student in viewer.children


def _payload():
    """The JSON body as given: None when there is none."""
    return request.get_json(silent=True)


def _serialize_attempts(attempts):
    counts = _question_counts({attempt.quiz_id for attempt in attempts})
    return [
        quiz_service.serialize_summary(attempt, counts.get(attempt.quiz_id, 0))
        for attempt in attempts
    ]


# --- students ---------------------------------------------------------------


@quiz_bp.route("", methods=["GET"])
@require_login
@api_response
def list_quizzes():
    user = _current_user()
    if not user:
        return _gone()

    quizzes = (
        Quiz.query.filter_by(is_active=True).order_by(Quiz.sort_order, Quiz.id).all()
    )
    counts = _question_counts()
    attempts = (
        QuizAttempt.query.filter_by(user_id=user.id)
        .order_by(QuizAttempt.id.desc())
        .all()
    )
    by_quiz = {}
    for attempt in attempts:
        by_quiz.setdefault(attempt.quiz_id, []).append(attempt)

    rows = []
    for quiz in quizzes:
        own = by_quiz.get(quiz.id, [])
        in_progress = next((a for a in own if not a.is_submitted), None)
        submitted = sorted(
            (a for a in own if a.is_submitted),
            key=lambda a: (a.submitted_at, a.id),
            reverse=True,
        )
        can_start = in_progress is not None or (
            user.role != "parent" and (quiz.allow_retakes or not submitted)
        )
        rows.append(
            {
                "slug": quiz.slug,
                "title": quiz.title,
                "description": quiz.description,
                "question_count": counts.get(quiz.id, 0),
                "time_limit_minutes": quiz.time_limit_minutes,
                "allow_retakes": bool(quiz.allow_retakes),
                "in_progress_attempt_id": in_progress.id if in_progress else None,
                "can_start": can_start,
                "attempts": [
                    {
                        "id": a.id,
                        "submitted_at": to_utc_iso(a.submitted_at),
                        "correct": a.correct_count,
                        "total": a.total_count,
                        "score_percent": a.score_percent,
                    }
                    for a in submitted
                ],
            }
        )
    return {"quizzes": rows}


@quiz_bp.route("/<slug>/attempts", methods=["POST"])
@require_login
@limiter.limit("30 per minute")
@api_response
def start_attempt(slug):
    user = _current_user()
    if not user:
        return _gone()
    quiz = Quiz.query.filter_by(slug=slug, is_active=True).first()
    if not quiz:
        return {"error": "Test not found"}, 404
    if user.role == "parent":
        return {"error": "Parents cannot take tests"}, 403

    questions = _questions(quiz.id)
    attempt = QuizAttempt.query.filter_by(
        user_id=user.id, quiz_id=quiz.id, submitted_at=None
    ).first()
    if attempt:
        return {"attempt": quiz_service.serialize_state(attempt, questions)}

    if not quiz.allow_retakes and QuizAttempt.query.filter(
        QuizAttempt.user_id == user.id,
        QuizAttempt.quiz_id == quiz.id,
        QuizAttempt.submitted_at.isnot(None),
    ).first():
        return {"error": "Retakes are off for this test"}, 403

    started_at = utcnow_naive()
    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=user.id,
        answers={},
        flagged=[],
        started_at=started_at,
        # Fixed now: a later change of the time limit does not reach this attempt
        deadline=quiz_service.deadline_for(quiz, started_at),
    )
    db.session.add(attempt)
    try:
        db.session.commit()
    except IntegrityError:
        # A second request started the same attempt first: resume that one
        db.session.rollback()
        attempt = QuizAttempt.query.filter_by(
            user_id=user.id, quiz_id=quiz.id, submitted_at=None
        ).first()
        if not attempt:
            raise
        return {"attempt": quiz_service.serialize_state(attempt, questions)}
    return {"attempt": quiz_service.serialize_state(attempt, questions)}, 201


@quiz_bp.route("/attempts/<int:attempt_id>", methods=["GET"])
@require_login
@api_response
def get_attempt(attempt_id):
    user = _current_user()
    if not user:
        return _gone()
    attempt = db.session.get(QuizAttempt, attempt_id)
    if not attempt:
        return {"error": "Attempt not found"}, 404

    owner = attempt.user_id == user.id
    reviewer = _can_review(user, attempt.user)
    if not owner and not reviewer:
        return {"error": "Access denied"}, 403

    questions = _questions(attempt.quiz_id)
    if not attempt.is_submitted:
        if owner:
            return {"attempt": quiz_service.serialize_state(attempt, questions)}
        return {"attempt": quiz_service.serialize_summary(attempt, len(questions))}

    include_review = reviewer or bool(attempt.quiz.reveal_answers)
    return {"attempt": quiz_service.serialize_result(attempt, questions, include_review)}


def _own_open_attempt(attempt_id, user):
    """(attempt, None) when ``user`` owns the attempt and it is still open, else (None, error)."""
    attempt = db.session.get(QuizAttempt, attempt_id)
    if not attempt:
        return None, ({"error": "Attempt not found"}, 404)
    if attempt.user_id != user.id:
        return None, ({"error": "Access denied"}, 403)
    if attempt.is_submitted:
        return None, ({"error": "This attempt is already submitted"}, 409)
    return attempt, None


@quiz_bp.route("/attempts/<int:attempt_id>", methods=["PATCH"])
@require_login
@limiter.limit("240 per minute")
@api_response
def save_attempt(attempt_id):
    user = _current_user()
    if not user:
        return _gone()
    attempt, error = _own_open_attempt(attempt_id, user)
    if error:
        return error
    if quiz_service.is_expired(attempt):
        return {"error": "Time is up", "expired": True}, 409

    try:
        changes = quiz_service.parse_progress(attempt, _payload() or {}, _questions(attempt.quiz_id))
    except QuizValidationError as exc:
        return {"error": str(exc)}, 400
    if not quiz_service.save_progress(attempt, changes):
        # Submitted while this save was on its way: the graded answers stay as they are
        db.session.rollback()
        return {"error": "This attempt is already submitted"}, 409
    db.session.commit()
    return {
        "attempt": {
            "id": attempt.id,
            "answers": dict(attempt.answers or {}),
            "flagged": list(attempt.flagged or []),
            "elapsed_seconds": attempt.elapsed_seconds or 0,
        }
    }


@quiz_bp.route("/attempts/<int:attempt_id>/submit", methods=["POST"])
@require_login
@limiter.limit("30 per minute")
@api_response
def submit_attempt(attempt_id):
    user = _current_user()
    if not user:
        return _gone()
    attempt, error = _own_open_attempt(attempt_id, user)
    if error:
        return error

    questions = _questions(attempt.quiz_id)
    # Past the deadline the saved answers are graded as they are
    changes = {}
    if not quiz_service.is_expired(attempt):
        try:
            changes = quiz_service.parse_progress(attempt, _payload(), questions)
        except QuizValidationError as exc:
            return {"error": str(exc)}, 400
    if not quiz_service.close_attempt(attempt, questions, changes):
        db.session.rollback()
        return {"error": "This attempt is already submitted"}, 409
    quiz_service.award_ducks(user, attempt)
    db.session.commit()

    include_review = user.role == "admin" or bool(attempt.quiz.reveal_answers)
    return {"attempt": quiz_service.serialize_result(attempt, questions, include_review)}


@quiz_bp.route("/students/<int:student_id>/attempts", methods=["GET"])
@require_login
@api_response
def list_student_attempts(student_id):
    user = _current_user()
    if not user:
        return _gone()
    linked_parent = user.role == "parent" and student_id in {c.id for c in user.children}
    if user.role != "admin" and not linked_parent:
        return {"error": "Access denied"}, 403
    student = db.session.get(User, student_id)
    if not student:
        return {"error": "Student not found"}, 404

    attempts = (
        QuizAttempt.query.options(joinedload(QuizAttempt.quiz))
        .filter_by(user_id=student.id)
        .order_by(QuizAttempt.started_at.desc(), QuizAttempt.id.desc())
        .all()
    )
    return {
        "student": quiz_service.student_ref(student),
        "attempts": _serialize_attempts(attempts),
    }


# --- admin ------------------------------------------------------------------


def _not_admin():
    """An error response unless the caller is an admin."""
    user = _current_user()
    if not user:
        return _gone()
    if user.role != "admin":
        return {"error": "Admin access required"}, 403
    return None


def _admin_quiz_row(quiz):
    attempt_count, submitted_count, average = (
        db.session.query(
            func.count(QuizAttempt.id),
            func.count(QuizAttempt.submitted_at),
            func.avg(QuizAttempt.score_percent),
        )
        .filter(QuizAttempt.quiz_id == quiz.id)
        .one()
    )
    question_count = (
        db.session.query(func.count(QuizQuestion.id)).filter_by(quiz_id=quiz.id).scalar()
    )
    return quiz_service.serialize_admin_quiz(
        quiz,
        question_count,
        attempt_count,
        submitted_count,
        int(average + 0.5) if average is not None else None,
    )


@quiz_bp.route("/admin", methods=["GET"])
@require_login
@api_response
def admin_list_quizzes():
    refusal = _not_admin()
    if refusal:
        return refusal
    quizzes = Quiz.query.order_by(Quiz.sort_order, Quiz.id).all()
    return {"quizzes": [_admin_quiz_row(quiz) for quiz in quizzes]}


@quiz_bp.route("/admin/results", methods=["GET"])
@require_login
@api_response
def admin_results():
    refusal = _not_admin()
    if refusal:
        return refusal

    query = QuizAttempt.query.options(
        joinedload(QuizAttempt.quiz), joinedload(QuizAttempt.user)
    )
    slug = request.args.get("quiz")
    if slug:
        query = query.join(Quiz, QuizAttempt.quiz_id == Quiz.id).filter(Quiz.slug == slug)
    status = request.args.get("status")
    if status == "submitted":
        query = query.filter(QuizAttempt.submitted_at.isnot(None))
    elif status == "in_progress":
        query = query.filter(QuizAttempt.submitted_at.is_(None))
    elif status:
        return {"error": "status must be submitted or in_progress"}, 400
    classroom_id = request.args.get("classroom_id")
    if classroom_id:
        query = query.filter(
            QuizAttempt.user.has(User.classrooms.any(Classroom.id == classroom_id))
        )

    attempts = (
        query.order_by(QuizAttempt.started_at.desc(), QuizAttempt.id.desc())
        .limit(RESULTS_LIMIT)
        .all()
    )
    return {"results": _serialize_attempts(attempts)}


@quiz_bp.route("/admin/<slug>", methods=["PATCH"])
@require_login
@api_response
def admin_update_quiz(slug):
    refusal = _not_admin()
    if refusal:
        return refusal
    quiz = Quiz.query.filter_by(slug=slug).first()
    if not quiz:
        return {"error": "Test not found"}, 404

    body = _payload()
    if not isinstance(body, dict):
        return {"error": "Invalid body"}, 400
    changes = {}
    for flag in _SETTING_FLAGS:
        if flag in body:
            if not isinstance(body[flag], bool):
                return {"error": f"{flag} must be true or false"}, 400
            changes[flag] = body[flag]
    if "time_limit_minutes" in body:
        minutes = body["time_limit_minutes"]
        if minutes is not None and (
            not isinstance(minutes, int)
            or isinstance(minutes, bool)
            or not 1 <= minutes <= quiz_service.MAX_TIME_LIMIT_MINUTES
        ):
            return {
                "error": f"time_limit_minutes must be empty or 1 to {quiz_service.MAX_TIME_LIMIT_MINUTES}"
            }, 400
        changes["time_limit_minutes"] = minutes

    for field, value in changes.items():
        setattr(quiz, field, value)
    db.session.commit()
    return {"quiz": _admin_quiz_row(quiz)}


@quiz_bp.route("/admin/attempts/<int:attempt_id>", methods=["DELETE"])
@require_login
@api_response
def admin_delete_attempt(attempt_id):
    refusal = _not_admin()
    if refusal:
        return refusal
    attempt = db.session.get(QuizAttempt, attempt_id)
    if not attempt:
        return {"error": "Attempt not found"}, 404
    db.session.delete(attempt)
    db.session.commit()
    return {"deleted": attempt_id}
