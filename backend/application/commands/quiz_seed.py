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


def load_quiz_files(data_dir=None):
    """The parsed quiz files in ``data_dir`` (default quiz_data/), ordered by file name."""
    folder = Path(data_dir) if data_dir else QUIZ_DATA_DIR
    quizzes = []
    for path in sorted(folder.glob("*.json")):
        with open(path, encoding="utf-8") as f:
            quizzes.append(json.load(f))
    return quizzes


def seed_quizzes(data_dir=None):
    """Upsert the quizzes in the data files by slug, and their questions by number.

    Title, description, source URL, sort order and every question field follow the
    files. The admin settings of a quiz that already exists (is_active,
    reveal_answers, allow_retakes, time_limit_minutes) are never touched; a new quiz
    gets the model defaults. Commits; returns the number of quizzes and questions
    added and updated.
    """
    from application.extensions import db
    from application.models.quiz import Quiz, QuizQuestion

    stats = {
        "quizzes_inserted": 0,
        "quizzes_updated": 0,
        "questions_inserted": 0,
        "questions_updated": 0,
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
        for row in data.get("questions", []):
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
