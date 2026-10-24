"""
File: test_quiz_seed.py
Type: py
Summary: The student tests load from quiz_data/*.json, again and again without changing
         the settings an admin made, and `flask seed` runs the loader.
"""

import json
from unittest.mock import patch

import pytest
from application.commands.quiz_seed import QUIZ_DATA_DIR, load_quiz_files, seed_quizzes
from application.commands.seed import seed_command
from application.extensions import db
from application.models.quiz import Quiz, QuizAttempt, QuizQuestion
from sqlalchemy.exc import IntegrityError
from tests.factories import UserFactory


def _question(number, **changes):
    row = {
        "number": number,
        "domain": "Hardware",
        "prompt": f"Prompt {number}",
        "options": {"A": "a", "B": "b"},
        "answer": "A",
        "explanation": f"Because {number}",
        "diagram_html": None,
    }
    return row | changes


def _write(folder, name="one.json", **changes):
    data = {
        "slug": "one",
        "title": "One",
        "description": "First",
        "sort_order": 3,
        "source_url": "https://example.test/one.pdf",
        "questions": [_question(1), _question(2)],
    } | changes
    (folder / name).write_text(json.dumps(data), encoding="utf-8")


def test_the_shipped_files_are_three_tests_of_thirty_questions(init_db):
    quizzes = load_quiz_files()

    assert len(quizzes) == 3
    assert [q["slug"] for q in quizzes] == [
        "cs-olympiad-grades-3-5",
        "cs-olympiad-grades-6-8",
        "cs-olympiad-grades-9-11",
    ]
    for quiz in quizzes:
        numbers = [question["number"] for question in quiz["questions"]]
        assert numbers == list(range(1, 31))
        for question in quiz["questions"]:
            assert question["answer"] in question["options"]
    assert sum(1 for q in quizzes for x in q["questions"] if x["diagram_html"]) == 45
    assert QUIZ_DATA_DIR.is_dir()


def test_seeding_loads_the_shipped_tests(init_db):
    stats = seed_quizzes()

    assert stats == {
        "quizzes_inserted": 3,
        "quizzes_updated": 0,
        "questions_inserted": 90,
        "questions_updated": 0,
    }
    quizzes = Quiz.query.order_by(Quiz.sort_order).all()
    assert [q.sort_order for q in quizzes] == [1, 2, 3]
    for quiz in quizzes:
        assert len(quiz.questions) == 30
        assert (quiz.is_active, quiz.reveal_answers, quiz.allow_retakes) == (True, True, True)
        assert quiz.time_limit_minutes is None


def test_seeding_twice_changes_nothing(init_db):
    seed_quizzes()
    stats = seed_quizzes()

    assert stats["quizzes_inserted"] == stats["questions_inserted"] == 0
    assert (stats["quizzes_updated"], stats["questions_updated"]) == (3, 90)
    assert Quiz.query.count() == 3
    assert QuizQuestion.query.count() == 90


def test_seeding_keeps_the_admin_settings_and_syncs_the_content(init_db, tmp_path):
    _write(tmp_path)
    seed_quizzes(tmp_path)
    quiz = Quiz.query.one()
    quiz.is_active = False
    quiz.reveal_answers = False
    quiz.allow_retakes = False
    quiz.time_limit_minutes = 25
    db.session.commit()

    _write(
        tmp_path,
        title="One, revised",
        description="Second",
        sort_order=9,
        source_url=None,
        questions=[
            _question(1, prompt="Reworded", answer="B", diagram_html="<svg></svg>"),
            _question(2),
            _question(3, domain="Python"),
        ],
    )
    stats = seed_quizzes(tmp_path)

    assert stats == {
        "quizzes_inserted": 0,
        "quizzes_updated": 1,
        "questions_inserted": 1,
        "questions_updated": 2,
    }
    db.session.expire_all()
    quiz = Quiz.query.one()
    assert (quiz.title, quiz.description, quiz.sort_order, quiz.source_url) == (
        "One, revised",
        "Second",
        9,
        None,
    )
    assert (quiz.is_active, quiz.reveal_answers, quiz.allow_retakes) == (False, False, False)
    assert quiz.time_limit_minutes == 25
    first, _second, third = quiz.questions
    assert (first.prompt, first.answer, first.diagram_html) == ("Reworded", "B", "<svg></svg>")
    assert third.domain == "Python"


def test_seeding_keeps_the_attempts_of_a_quiz(init_db, tmp_path):
    _write(tmp_path)
    seed_quizzes(tmp_path)
    student = UserFactory()
    quiz = Quiz.query.one()
    db.session.add(QuizAttempt(quiz_id=quiz.id, user_id=student.id, answers={"1": "A"}))
    db.session.commit()
    question_ids = [q.id for q in quiz.questions]

    seed_quizzes(tmp_path)

    assert QuizAttempt.query.one().answers == {"1": "A"}
    assert [q.id for q in Quiz.query.one().questions] == question_ids


def test_a_missing_question_field_is_left_for_the_database_to_refuse(init_db, tmp_path):
    _write(tmp_path, questions=[{"number": 1}])

    with pytest.raises(IntegrityError):
        seed_quizzes(tmp_path)
    db.session.rollback()


def test_the_seed_command_loads_the_tests_and_reports_them(test_app):
    with test_app.app_context():
        result = test_app.test_cli_runner().invoke(seed_command)
        try:
            assert result.exit_code == 0
            assert "Student tests: quizzes +3/~0, questions +90/~0." in result.output
            assert Quiz.query.count() == 3

            again = test_app.test_cli_runner().invoke(seed_command)
            assert "Student tests: quizzes +0/~3, questions +0/~90." in again.output
            assert Quiz.query.count() == 3
        finally:
            db.session.rollback()
            QuizQuestion.query.delete()
            Quiz.query.delete()
            db.session.commit()


def test_the_seed_command_reports_a_failing_quiz_load_and_goes_on(test_app):
    with test_app.app_context(), patch(
        "application.commands.quiz_seed.seed_quizzes", side_effect=RuntimeError("boom")
    ):
        result = test_app.test_cli_runner().invoke(seed_command)

    assert result.exit_code == 0
    assert "Error seeding student tests: boom" in result.output
