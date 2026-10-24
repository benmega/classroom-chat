"""
File: quiz_service.py
Type: py
Summary: Grading, progress validation and serialization for student tests. The answer
         key and explanations are only ever serialized into a Result.
"""

from datetime import timedelta

from application.extensions import db
from application.models.quiz import QuizAttempt, QuizReward
from application.utilities.helper_functions import to_utc_iso, utcnow_naive
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError

# A save or submit this long after the deadline still counts: the clock of the
# browser and the request itself take a moment.
GRACE_SECONDS = 30
MAX_TIME_LIMIT_MINUTES = 600


class QuizValidationError(ValueError):
    """A progress payload that cannot be applied; the message is safe to show."""


def _is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def sorted_options(question):
    """[{letter, text}] for a question, ordered by letter."""
    return [
        {"letter": letter, "text": text}
        for letter, text in sorted((question.options or {}).items())
    ]


def percent(correct, total):
    """Whole-number percentage, halves rounded up; 0 for an empty quiz."""
    if not total:
        return 0
    return (correct * 100 + total // 2) // total


# --- deadline ---------------------------------------------------------------


def is_expired(attempt, now=None):
    """True once the attempt is past its deadline plus the grace period."""
    deadline = attempt.deadline
    if deadline is None:
        return False
    return (now or utcnow_naive()) > deadline + timedelta(seconds=GRACE_SECONDS)


# --- progress ---------------------------------------------------------------


def apply_progress(attempt, payload, questions):
    """Validate ``payload`` ({answers?, flagged?, elapsed_seconds?}) and apply it.

    Nothing is changed unless the whole payload is valid. ``answers`` is merged into
    the saved ones (a null or empty letter clears an answer); ``flagged`` replaces the
    saved list. Raises QuizValidationError.
    """
    if payload is None:
        return
    if not isinstance(payload, dict):
        raise QuizValidationError("Invalid body")
    by_number = {question.number: question for question in questions}

    answers = dict(attempt.answers or {})
    if payload.get("answers") is not None:
        incoming = payload["answers"]
        if not isinstance(incoming, dict):
            raise QuizValidationError("answers must be an object")
        for key, letter in incoming.items():
            number = _question_number(key, by_number)
            if letter is None or letter == "":
                answers.pop(str(number), None)
                continue
            if not isinstance(letter, str) or letter not in (by_number[number].options or {}):
                raise QuizValidationError(f"Invalid answer for question {number}")
            answers[str(number)] = letter

    flagged = None
    if payload.get("flagged") is not None:
        incoming = payload["flagged"]
        if not isinstance(incoming, list):
            raise QuizValidationError("flagged must be a list")
        flagged = sorted({_question_number(number, by_number) for number in incoming})

    elapsed = None
    if payload.get("elapsed_seconds") is not None:
        elapsed = payload["elapsed_seconds"]
        if not _is_int(elapsed) or elapsed < 0:
            raise QuizValidationError("elapsed_seconds must be a non-negative integer")
        if elapsed < (attempt.elapsed_seconds or 0):
            raise QuizValidationError("elapsed_seconds cannot decrease")

    attempt.answers = answers
    if flagged is not None:
        attempt.flagged = flagged
    if elapsed is not None:
        attempt.elapsed_seconds = elapsed


def _question_number(value, by_number):
    """The question number behind a key or list item, or QuizValidationError."""
    if isinstance(value, str) and value.isascii() and value.isdigit():
        number = int(value)
    elif _is_int(value):
        number = value
    else:
        raise QuizValidationError("Invalid question number")
    if number not in by_number:
        raise QuizValidationError(f"Unknown question {number}")
    return number


# --- grading ----------------------------------------------------------------


def grade(attempt, questions):
    """Per-question outcome and totals for the attempt's saved answers."""
    answers = attempt.answers or {}
    correct = skipped = 0
    domains = {}
    review = []
    for question in questions:
        selected = answers.get(str(question.number)) or None
        is_correct = selected == question.answer
        if selected is None:
            skipped += 1
        if is_correct:
            correct += 1
        entry = domains.setdefault(
            question.domain, {"domain": question.domain, "correct": 0, "total": 0}
        )
        entry["total"] += 1
        entry["correct"] += int(is_correct)
        review.append((question, selected, is_correct))
    total = len(questions)
    return {
        "correct": correct,
        "wrong": total - correct - skipped,
        "skipped": skipped,
        "total": total,
        "domains": list(domains.values()),
        "review": review,
    }


def submit(attempt, questions, now=None):
    """Grade and close the attempt. The caller commits."""
    graded = grade(attempt, questions)
    attempt.submitted_at = now or utcnow_naive()
    attempt.correct_count = graded["correct"]
    attempt.total_count = graded["total"]
    attempt.score_percent = percent(graded["correct"], graded["total"])


def close_attempt(attempt, questions):
    """Grade and close an attempt that is still open. The caller commits.

    The attempt is claimed with a conditional UPDATE first, so of two submits racing
    for it only one goes on. Returns False when another request closed it already.
    """
    now = utcnow_naive()
    claimed = db.session.execute(
        update(QuizAttempt)
        .where(QuizAttempt.id == attempt.id, QuizAttempt.submitted_at.is_(None))
        .values(submitted_at=now)
        .execution_options(synchronize_session=False)
    )
    if claimed.rowcount != 1:
        return False
    submit(attempt, questions, now)
    return True


def award_ducks(user, attempt):
    """Pay one duck per correct answer for a student's first submission of a quiz.

    Later submissions, including one after an admin deleted the first attempt, pay
    nothing: the QuizReward row outlives the attempt and is unique per (user, quiz).
    No perk multiplier applies. Admins are not paid. Runs in the caller's
    transaction. Returns the ducks credited, also stored on the attempt.
    """
    attempt.ducks_awarded = 0
    if user.role != "student":
        return 0
    correct = attempt.correct_count or 0
    try:
        with db.session.begin_nested():
            db.session.add(QuizReward(user_id=user.id, quiz_id=attempt.quiz_id, ducks=correct))
    except IntegrityError:
        return 0
    if correct > 0 and user.add_ducks(correct, reason=f"Test: {attempt.quiz.slug}"):
        attempt.ducks_awarded = correct
    return attempt.ducks_awarded


# --- serialization ----------------------------------------------------------


def student_ref(user):
    return {"id": user.id, "username": user.username, "nickname": user.nickname}


def quiz_ref(quiz):
    return {"slug": quiz.slug, "title": quiz.title}


def serialize_question(question):
    """A question as a student sees it while the attempt is open: no key, no explanation."""
    return {
        "number": question.number,
        "domain": question.domain,
        "prompt": question.prompt,
        "options": sorted_options(question),
        "diagram_html": question.diagram_html or None,
    }


def serialize_state(attempt, questions):
    """AttemptState: an attempt in progress, for its owner."""
    quiz = attempt.quiz
    return {
        "id": attempt.id,
        "status": "in_progress",
        "quiz": {
            "slug": quiz.slug,
            "title": quiz.title,
            "time_limit_minutes": quiz.time_limit_minutes,
        },
        "started_at": to_utc_iso(attempt.started_at),
        "deadline": to_utc_iso(attempt.deadline),
        "elapsed_seconds": attempt.elapsed_seconds or 0,
        "answers": dict(attempt.answers or {}),
        "flagged": list(attempt.flagged or []),
        "questions": [serialize_question(question) for question in questions],
    }


def serialize_summary(attempt, question_count=None):
    """AttemptSummary."""
    submitted = attempt.is_submitted
    if submitted:
        total = attempt.total_count or 0
    elif question_count is not None:
        total = question_count
    else:
        total = len(attempt.quiz.questions)
    return {
        "id": attempt.id,
        "status": "submitted" if submitted else "in_progress",
        "quiz": quiz_ref(attempt.quiz),
        "student": student_ref(attempt.user),
        "started_at": to_utc_iso(attempt.started_at),
        "submitted_at": to_utc_iso(attempt.submitted_at),
        "elapsed_seconds": attempt.elapsed_seconds or 0,
        "correct": attempt.correct_count if submitted else None,
        "total": total,
        "score_percent": attempt.score_percent if submitted else None,
        "ducks_awarded": (attempt.ducks_awarded or 0) if submitted else 0,
    }


def serialize_result(attempt, questions, include_review):
    """Result: a submitted attempt, with the review only when ``include_review``."""
    graded = grade(attempt, questions)
    result = serialize_summary(attempt)
    result.update(
        {
            "wrong": graded["wrong"],
            "skipped": graded["skipped"],
            "domains": graded["domains"],
            "review": None,
        }
    )
    if include_review:
        result["review"] = [
            {
                "number": question.number,
                "domain": question.domain,
                "prompt": question.prompt,
                "options": sorted_options(question),
                "diagram_html": question.diagram_html or None,
                "selected": selected,
                "answer": question.answer,
                "is_correct": is_correct,
                "explanation": question.explanation,
            }
            for question, selected, is_correct in graded["review"]
        ]
    return result


def serialize_admin_quiz(quiz, question_count, attempt_count, submitted_count, average_percent):
    return {
        "slug": quiz.slug,
        "title": quiz.title,
        "description": quiz.description,
        "sort_order": quiz.sort_order,
        "is_active": bool(quiz.is_active),
        "reveal_answers": bool(quiz.reveal_answers),
        "allow_retakes": bool(quiz.allow_retakes),
        "time_limit_minutes": quiz.time_limit_minutes,
        "question_count": question_count,
        "attempt_count": attempt_count,
        "submitted_count": submitted_count,
        "average_percent": average_percent,
    }
