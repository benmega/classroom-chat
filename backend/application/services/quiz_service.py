"""
File: quiz_service.py
Type: py
Summary: Grading, progress validation and serialization for student tests, who a test
         is open to, and building a test from the admin form. The answer key and
         explanations are only ever serialized into a Result.
"""

import re
from datetime import timedelta

from application.extensions import db
from application.models.classroom import user_classrooms
from application.models.quiz import Quiz, QuizAssignment, QuizAttempt, QuizQuestion, QuizReward
from application.utilities.helper_functions import to_utc_iso, utcnow_naive
from sqlalchemy import case, func, select, update
from sqlalchemy.exc import IntegrityError

# A save or submit this long after the deadline still counts: the clock of the
# browser and the request itself take a moment.
GRACE_SECONDS = 30
MAX_TIME_LIMIT_MINUTES = 600
# Bounds that keep every number the API reads small enough to be a real one
MAX_ELAPSED_SECONDS = 86400
MAX_QUESTION_NUMBER = 10000
_MAX_NUMBER_DIGITS = 6


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


# Bounds of a test built in the admin form
MAX_QUESTIONS = 200
MAX_OPTIONS = 8
MIN_OPTIONS = 2
DEFAULT_DOMAIN = "General"
_TEXT_LIMITS = {"title": 150, "description": 255, "slug": 100, "domain": 100, "option": 500}
_LONG_TEXT = 5000


# --- deadline ---------------------------------------------------------------


def deadline_for(quiz, started_at):
    """The deadline of an attempt starting at ``started_at``: the quiz's limit today."""
    if not quiz.time_limit_minutes:
        return None
    return started_at + timedelta(minutes=quiz.time_limit_minutes)


def is_expired(attempt, now=None):
    """True once the attempt is past its stored deadline plus the grace period."""
    deadline = attempt.deadline
    if deadline is None:
        return False
    return (now or utcnow_naive()) > deadline + timedelta(seconds=GRACE_SECONDS)


def time_limit_minutes(attempt):
    """The limit the attempt started with (not the quiz's current one), or None."""
    if attempt.deadline is None:
        return None
    return round((attempt.deadline - attempt.started_at).total_seconds() / 60)


# --- progress ---------------------------------------------------------------


def parse_progress(attempt, payload, questions):
    """Validate ``payload`` ({answers?, flagged?, elapsed_seconds?}) against the attempt.

    Returns the changes to store ({answers?, flagged?, elapsed_seconds?}); it stores
    nothing itself, and returns nothing unless the whole payload is valid. ``answers``
    is merged into the saved ones (a null or empty letter clears an answer);
    ``flagged`` replaces the saved list; an ``elapsed_seconds`` lower than the saved
    one is not an error, the larger stays. Raises QuizValidationError.
    """
    if payload is None:
        return {}
    if not isinstance(payload, dict):
        raise QuizValidationError("Invalid body")
    try:
        return _parse_progress(attempt, payload, questions)
    except QuizValidationError:
        raise
    except (ValueError, OverflowError) as exc:
        raise QuizValidationError("Invalid body") from exc


def _parse_progress(attempt, payload, questions):
    by_number = {question.number: question for question in questions}
    changes = {}

    if payload.get("answers") is not None:
        incoming = payload["answers"]
        if not isinstance(incoming, dict):
            raise QuizValidationError("answers must be an object")
        answers = dict(attempt.answers or {})
        for key, letter in incoming.items():
            number = _question_number(key, by_number)
            if letter is None or letter == "":
                answers.pop(str(number), None)
                continue
            if not isinstance(letter, str) or letter not in (by_number[number].options or {}):
                raise QuizValidationError(f"Invalid answer for question {number}")
            answers[str(number)] = letter
        changes["answers"] = answers

    if payload.get("flagged") is not None:
        incoming = payload["flagged"]
        if not isinstance(incoming, list):
            raise QuizValidationError("flagged must be a list")
        changes["flagged"] = sorted({_question_number(number, by_number) for number in incoming})

    if payload.get("elapsed_seconds") is not None:
        elapsed = payload["elapsed_seconds"]
        if not _is_int(elapsed) or not 0 <= elapsed <= MAX_ELAPSED_SECONDS:
            raise QuizValidationError(
                f"elapsed_seconds must be a whole number from 0 to {MAX_ELAPSED_SECONDS}"
            )
        changes["elapsed_seconds"] = max(elapsed, attempt.elapsed_seconds or 0)

    return changes


def _question_number(value, by_number):
    """The question number behind a key or list item, or QuizValidationError."""
    if isinstance(value, str):
        if not (value.isascii() and value.isdigit()) or len(value) > _MAX_NUMBER_DIGITS:
            raise QuizValidationError("Invalid question number")
        number = int(value)
    elif _is_int(value):
        number = value
    else:
        raise QuizValidationError("Invalid question number")
    if not 1 <= number <= MAX_QUESTION_NUMBER:
        raise QuizValidationError("Invalid question number")
    if number not in by_number:
        raise QuizValidationError(f"Unknown question {number}")
    return number


def _column_values(changes):
    """``changes`` as UPDATE values; elapsed_seconds can only grow, even against a
    save from another tab that landed after this one was read."""
    values = {key: value for key, value in changes.items() if key != "elapsed_seconds"}
    if "elapsed_seconds" in changes:
        elapsed = changes["elapsed_seconds"]
        values["elapsed_seconds"] = case(
            (QuizAttempt.elapsed_seconds < elapsed, elapsed),
            else_=QuizAttempt.elapsed_seconds,
        )
    return values


def save_progress(attempt, changes):
    """Store ``changes`` from parse_progress on a still-open attempt.

    A conditional UPDATE (submitted_at IS NULL), so a save racing a submit cannot
    change the answers after they were graded. Returns False, having stored nothing,
    when the attempt was submitted meanwhile. The caller commits.
    """
    if not changes:
        return True
    saved = db.session.execute(
        update(QuizAttempt)
        .where(QuizAttempt.id == attempt.id, QuizAttempt.submitted_at.is_(None))
        .values(**_column_values(changes))
        .execution_options(synchronize_session=False)
    )
    if saved.rowcount != 1:
        return False
    db.session.expire(attempt)
    return True


# --- grading ----------------------------------------------------------------


def snapshot(answers, questions):
    """What gets graded: {"<number>": {answer, selected, domain}} per question."""
    answers = answers or {}
    return {
        str(question.number): {
            "answer": question.answer,
            "selected": answers.get(str(question.number)) or None,
            "domain": question.domain,
        }
        for question in questions
    }


def grade(attempt, questions):
    """Per-question outcome and totals of an attempt.

    A submitted attempt is read from the snapshot taken at submit, so these figures
    stay those of the stored score whatever happens to the questions afterwards; the
    live ``questions`` only supply the text. Without a snapshot the saved answers are
    graded against ``questions``.
    """
    rows = attempt.graded or snapshot(attempt.answers, questions)
    by_number = {question.number: question for question in questions}
    correct = skipped = 0
    domains = {}
    review = []
    for key in sorted(rows, key=int):
        row = rows[key]
        number = int(key)
        question = by_number.get(number)
        selected = row.get("selected") or None
        is_correct = selected is not None and selected == row.get("answer")
        if selected is None:
            skipped += 1
        if is_correct:
            correct += 1
        name = row.get("domain") or (question.domain if question else "")
        entry = domains.setdefault(name, {"domain": name, "correct": 0, "total": 0})
        entry["total"] += 1
        entry["correct"] += int(is_correct)
        review.append(
            {
                "number": number,
                "question": question,
                "domain": name,
                "answer": row.get("answer"),
                "selected": selected,
                "is_correct": is_correct,
            }
        )
    total = len(rows)
    return {
        "correct": correct,
        "wrong": total - correct - skipped,
        "skipped": skipped,
        "total": total,
        "domains": list(domains.values()),
        "review": review,
    }


def close_attempt(attempt, questions, changes=None):
    """Store ``changes``, grade and close an attempt that is still open. The caller commits.

    One conditional UPDATE (submitted_at IS NULL) writes the final answers, the
    snapshot that was graded and the score together: of two submits racing for the
    attempt only one goes on, and a save cannot slip in between. Returns False when
    another request closed the attempt already.
    """
    changes = changes or {}
    taken = snapshot(changes.get("answers", attempt.answers), questions)
    correct = sum(1 for row in taken.values() if row["selected"] == row["answer"])
    claimed = db.session.execute(
        update(QuizAttempt)
        .where(QuizAttempt.id == attempt.id, QuizAttempt.submitted_at.is_(None))
        .values(
            **_column_values(changes),
            submitted_at=utcnow_naive(),
            graded=taken,
            correct_count=correct,
            total_count=len(taken),
            score_percent=percent(correct, len(taken)),
        )
        .execution_options(synchronize_session=False)
    )
    if claimed.rowcount != 1:
        return False
    db.session.expire(attempt)
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


# --- assignments ------------------------------------------------------------


def open_check(users):
    """A function quiz_id -> bool: whether the quiz is open to any of ``users``.

    A quiz without assignments is open to everyone; one with assignments only to the
    students it names and to those enrolled in the classrooms it names.
    """
    user_ids = {user.id for user in users}
    classroom_ids = set()
    if user_ids:
        classroom_ids = set(
            db.session.scalars(
                select(user_classrooms.c.classroom_id).where(
                    user_classrooms.c.user_id.in_(user_ids)
                )
            )
        )
    open_to = {}
    rows = db.session.execute(
        select(QuizAssignment.quiz_id, QuizAssignment.user_id, QuizAssignment.classroom_id)
    )
    for quiz_id, user_id, classroom_id in rows:
        hit = user_id in user_ids or classroom_id in classroom_ids
        open_to[quiz_id] = open_to.get(quiz_id, False) or hit
    return lambda quiz_id: open_to.get(quiz_id, True)


def serialize_assignments(assignments):
    """{classrooms: [{id, name}], students: [StudentRef]}, each sorted by name."""
    classrooms = sorted(
        (a.classroom for a in assignments if a.classroom is not None),
        key=lambda c: (c.name or "").lower(),
    )
    students = sorted(
        (a.user for a in assignments if a.user is not None),
        key=lambda u: (u.nickname or u.username or "").lower(),
    )
    return {
        "classrooms": [{"id": c.id, "name": c.name} for c in classrooms],
        "students": [student_ref(u) for u in students],
    }


# --- building a test --------------------------------------------------------


def _clean_text(value, label, limit, required=False):
    """``value`` stripped, None when empty and optional; QuizValidationError otherwise."""
    if value is None:
        value = ""
    if not isinstance(value, str):
        raise QuizValidationError(f"{label} must be text")
    value = value.strip()
    if not value:
        if required:
            raise QuizValidationError(f"{label} is required")
        return None
    if len(value) > limit:
        raise QuizValidationError(f"{label} is longer than {limit} characters")
    return value


def slug_for(title):
    """A free slug made from ``title``: -2, -3... appended when it is taken."""
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[: _TEXT_LIMITS["slug"] - 4]
    base = base.strip("-") or "test"
    taken = set(
        db.session.scalars(
            select(Quiz.slug).where((Quiz.slug == base) | Quiz.slug.like(f"{base}-%"))
        )
    )
    slug, n = base, 1
    while slug in taken:
        n += 1
        slug = f"{base}-{n}"
    return slug


def _build_question(number, row):
    label = f"Question {number}"
    if not isinstance(row, dict):
        raise QuizValidationError(f"{label} must be an object")
    prompt = _clean_text(row.get("prompt"), f"{label}: prompt", _LONG_TEXT, required=True)
    domain = (
        _clean_text(row.get("domain"), f"{label}: topic", _TEXT_LIMITS["domain"])
        or DEFAULT_DOMAIN
    )
    options = row.get("options")
    if not isinstance(options, dict):
        raise QuizValidationError(f"{label}: options must be an object")
    if not MIN_OPTIONS <= len(options) <= MAX_OPTIONS:
        raise QuizValidationError(f"{label}: {MIN_OPTIONS} to {MAX_OPTIONS} options")
    cleaned = {}
    for letter, text in options.items():
        if not (isinstance(letter, str) and len(letter) == 1 and "A" <= letter <= "Z"):
            raise QuizValidationError(f"{label}: option letters must be A to Z")
        cleaned[letter] = _clean_text(
            text, f"{label}: option {letter}", _TEXT_LIMITS["option"], required=True
        )
    answer = row.get("answer")
    if not isinstance(answer, str) or answer not in cleaned:
        raise QuizValidationError(f"{label}: answer must be one of the options")
    return QuizQuestion(
        number=number,
        domain=domain,
        prompt=prompt,
        options=cleaned,
        answer=answer,
        explanation=_clean_text(row.get("explanation"), f"{label}: explanation", _LONG_TEXT),
    )


def build_quiz(payload):
    """A new, inactive Quiz with its questions from the admin form, not yet added.

    ``payload``: {title, description?, questions: [{prompt, options: {letter: text},
    answer, domain?, explanation?}]}. Questions are numbered in the order given and a
    missing topic becomes "General". The slug is made from the title. Raises
    QuizValidationError.
    """
    if not isinstance(payload, dict):
        raise QuizValidationError("Invalid body")
    title = _clean_text(payload.get("title"), "Title", _TEXT_LIMITS["title"], required=True)
    description = _clean_text(
        payload.get("description"), "Description", _TEXT_LIMITS["description"]
    )
    rows = payload.get("questions")
    if not isinstance(rows, list) or not rows:
        raise QuizValidationError("Add at least one question")
    if len(rows) > MAX_QUESTIONS:
        raise QuizValidationError(f"At most {MAX_QUESTIONS} questions")
    questions = [_build_question(number, row) for number, row in enumerate(rows, start=1)]

    last = db.session.scalar(select(func.max(Quiz.sort_order)))
    quiz = Quiz(
        slug=slug_for(title),
        title=title,
        description=description,
        sort_order=(last or 0) + 1,
        # Off until the admin has assigned it and switched it on
        is_active=False,
    )
    quiz.questions.extend(questions)
    return quiz


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
            "time_limit_minutes": time_limit_minutes(attempt),
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
    flagged = set(attempt.flagged or [])
    result = serialize_summary(attempt)
    result.update(
        {
            "wrong": graded["wrong"],
            "skipped": graded["skipped"],
            "domains": graded["domains"],
            "time_limit_minutes": time_limit_minutes(attempt),
            "review": None,
        }
    )
    if include_review:
        result["review"] = [
            {
                "number": row["number"],
                "domain": row["domain"],
                "prompt": row["question"].prompt,
                "options": sorted_options(row["question"]),
                "diagram_html": row["question"].diagram_html or None,
                "selected": row["selected"],
                "answer": row["answer"],
                "is_correct": row["is_correct"],
                "flagged": row["number"] in flagged,
                "explanation": row["question"].explanation,
            }
            # A question deleted since has no text left to show; it still counts above
            for row in graded["review"]
            if row["question"] is not None
        ]
    return result


def serialize_admin_quiz(quiz, question_count, attempt_count, submitted_count, average_percent):
    return {
        "assignments": serialize_assignments(quiz.assignments),
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
