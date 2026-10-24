"""
File: quiz_seed.py
Type: py
Summary: Loads the student tests from quiz_data/*.json into quizzes and quiz_questions.
"""

import json
from pathlib import Path

QUIZ_DATA_DIR = Path(__file__).resolve().parent / "quiz_data"

_QUIZ_FIELDS = ("title", "description", "source_url", "sort_order")
_QUESTION_FIELDS = ("domain", "prompt", "options", "answer", "explanation", "diagram_html")
# The API takes question numbers up to this (see quiz_service.MAX_QUESTION_NUMBER)
_MAX_NUMBER = 10000


class QuizDataError(ValueError):
    """A quiz file that cannot be loaded; the message names the file and the problem."""


def _text(value):
    return isinstance(value, str) and bool(value.strip())


def _optional_text(value):
    return value is None or isinstance(value, str)


def _is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def validate_quiz_data(data, name="quiz"):
    """Raise QuizDataError unless ``data`` (one parsed quiz file) is complete and consistent."""

    def fail(problem):
        raise QuizDataError(f"{name}: {problem}")

    if not isinstance(data, dict):
        fail("must be an object")
    for field in ("slug", "title"):
        if not _text(data.get(field)):
            fail(f"{field} is required")
    for field in ("description", "source_url"):
        if not _optional_text(data.get(field)):
            fail(f"{field} must be text")
    if "sort_order" in data and not _is_int(data["sort_order"]):
        fail("sort_order must be a whole number")

    questions = data.get("questions")
    if not isinstance(questions, list) or not questions:
        fail("questions must be a non-empty list")
    seen = set()
    for index, row in enumerate(questions, start=1):
        if not isinstance(row, dict):
            fail(f"question {index} must be an object")
        number = row.get("number")
        if not _is_int(number) or not 1 <= number <= _MAX_NUMBER:
            fail(f"question {index}: number must be a whole number from 1 to {_MAX_NUMBER}")
        if number in seen:
            fail(f"question {number} appears twice")
        seen.add(number)
        for field in ("domain", "prompt"):
            if not _text(row.get(field)):
                fail(f"question {number}: {field} is required")
        options = row.get("options")
        if not isinstance(options, dict) or not options:
            fail(f"question {number}: options must be a non-empty object")
        for letter, text in options.items():
            if not (isinstance(letter, str) and len(letter) == 1):
                fail(f"question {number}: option letters must be a single character")
            if not _text(text):
                fail(f"question {number}: option {letter} needs text")
        if row.get("answer") not in options:
            fail(f"question {number}: answer must be one of the options")
        for field in ("explanation", "diagram_html"):
            if not _optional_text(row.get(field)):
                fail(f"question {number}: {field} must be text")


def load_quiz_files(data_dir=None):
    """The parsed quiz files in ``data_dir`` (default quiz_data/), ordered by file name.

    Every file is validated; raises QuizDataError naming the first bad one.
    """
    folder = Path(data_dir) if data_dir else QUIZ_DATA_DIR
    quizzes = []
    slugs = {}
    for path in sorted(folder.glob("*.json")):
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
        except ValueError as exc:
            raise QuizDataError(f"{path.name}: not valid JSON ({exc})") from exc
        validate_quiz_data(data, path.name)
        if data["slug"] in slugs:
            raise QuizDataError(f"{path.name}: slug {data['slug']} is also in {slugs[data['slug']]}")
        slugs[data["slug"]] = path.name
        quizzes.append(data)
    return quizzes


def seed_quizzes(data_dir=None):
    """Upsert the quizzes in the data files by slug, and their questions by number.

    Title, description, source URL, sort order and every question field follow the
    files, and a question whose number is no longer in its file is deleted (attempts
    already submitted keep what they were graded on). The admin settings of a quiz
    that already exists (is_active, reveal_answers, allow_retakes, time_limit_minutes)
    are never touched; a new quiz gets the model defaults. All files are checked
    before anything is written: a bad file raises QuizDataError and nothing is loaded.
    Commits; returns the number of quizzes and questions added, updated and deleted.
    """
    from application.extensions import db
    from application.models.quiz import Quiz, QuizQuestion

    stats = {
        "quizzes_inserted": 0,
        "quizzes_updated": 0,
        "questions_inserted": 0,
        "questions_updated": 0,
        "questions_deleted": 0,
    }
    for data in load_quiz_files(data_dir):
        quiz = Quiz.query.filter_by(slug=data["slug"]).first()
        if quiz is None:
            quiz = Quiz(slug=data["slug"])
            db.session.add(quiz)
            stats["quizzes_inserted"] += 1
        else:
            stats["quizzes_updated"] += 1
        for field in _QUIZ_FIELDS:
            if field in data:
                setattr(quiz, field, data[field])
        if quiz.sort_order is None:
            quiz.sort_order = 0

        existing = {question.number: question for question in quiz.questions}
        wanted = {row["number"] for row in data["questions"]}
        for number, question in existing.items():
            if number not in wanted:
                quiz.questions.remove(question)
                stats["questions_deleted"] += 1
        for row in data["questions"]:
            question = existing.get(row["number"])
            if question is None:
                question = QuizQuestion(number=row["number"])
                quiz.questions.append(question)
                stats["questions_inserted"] += 1
            else:
                stats["questions_updated"] += 1
            for field in _QUESTION_FIELDS:
                setattr(question, field, row.get(field))

    db.session.commit()
    return stats
