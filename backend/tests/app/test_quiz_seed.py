"""
File: test_quiz_seed.py
Type: py
Summary: The student tests load from quiz_data/*.json, again and again without changing
         the settings an admin made, and `flask seed` runs the loader.
"""

import json
from unittest.mock import patch

import pytest
from application.commands.quiz_seed import (
    QUIZ_DATA_DIR,
    QuizDataError,
    load_quiz_files,
    seed_quizzes,
)
from application.commands.seed import seed_command
from application.extensions import db
from application.models.quiz import Quiz, QuizAttempt, QuizQuestion
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
        "questions_deleted": 0,
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
    assert stats["questions_deleted"] == 0
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
        "questions_deleted": 0,
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


def test_seeding_deletes_questions_no_longer_in_the_file(init_db, tmp_path):
    _write(tmp_path, questions=[_question(1), _question(2), _question(3)])
    seed_quizzes(tmp_path)
    _write(tmp_path, questions=[_question(2), _question(4)])

    stats = seed_quizzes(tmp_path)

    assert (stats["questions_inserted"], stats["questions_updated"], stats["questions_deleted"]) == (1, 1, 2)
    assert [q.number for q in Quiz.query.one().questions] == [2, 4]
    assert QuizQuestion.query.count() == 2


def test_deleting_a_question_leaves_the_graded_result_alone(init_db, tmp_path):
    from application.services import quiz_service

    _write(tmp_path, questions=[_question(1), _question(2), _question(3)])
    seed_quizzes(tmp_path)
    quiz = Quiz.query.one()
    student = UserFactory()
    attempt = QuizAttempt(
        quiz_id=quiz.id, user_id=student.id, answers={"1": "A", "2": "B", "3": "A"}, flagged=[]
    )
    db.session.add(attempt)
    db.session.commit()
    assert quiz_service.close_attempt(attempt, list(quiz.questions))
    db.session.commit()

    _write(tmp_path, questions=[_question(1)])
    seed_quizzes(tmp_path)

    db.session.expire_all()
    attempt = QuizAttempt.query.one()
    graded = quiz_service.grade(attempt, list(Quiz.query.one().questions))
    assert (graded["correct"], graded["wrong"], graded["skipped"], graded["total"]) == (2, 1, 0, 3)
    assert (attempt.correct_count, attempt.total_count) == (2, 3)


def test_deleting_questions_keeps_the_admin_settings(init_db, tmp_path):
    _write(tmp_path)
    seed_quizzes(tmp_path)
    quiz = Quiz.query.one()
    quiz.time_limit_minutes = 25
    quiz.is_active = False
    db.session.commit()

    _write(tmp_path, questions=[_question(1)])
    seed_quizzes(tmp_path)

    quiz = Quiz.query.one()
    assert (quiz.time_limit_minutes, quiz.is_active) == (25, False)
    assert len(quiz.questions) == 1


def _bad(questions=None, **changes):
    return changes | ({"questions": questions} if questions is not None else {})


@pytest.mark.parametrize(
    ("changes", "message"),
    [
        (_bad(slug=""), "slug"),
        (_bad(title=None), "title"),
        (_bad(description=5), "description"),
        (_bad(sort_order="3"), "sort_order"),
        (_bad(questions=[]), "questions"),
        (_bad(questions=[_question(1), _question(1)]), "appears twice"),
        (_bad(questions=[_question(0)]), "number"),
        (_bad(questions=[_question(10**9)]), "number"),
        (_bad(questions=[_question(True)]), "number"),
        (_bad(questions=[_question(1, answer="C")]), "answer"),
        (_bad(questions=[_question(1, answer=None)]), "answer"),
        (_bad(questions=[_question(1, options={})]), "options"),
        (_bad(questions=[_question(1, options={"AB": "a", "B": "b"}, answer="B")]), "letters"),
        (_bad(questions=[_question(1, options={"A": "", "B": "b"})]), "option A"),
        (_bad(questions=[_question(1, domain="")]), "domain"),
        (_bad(questions=[_question(1, prompt=None)]), "prompt"),
        (_bad(questions=[_question(1, explanation=3)]), "explanation"),
        (_bad(questions=[{"number": 1}]), "domain"),
        (_bad(questions=["x"]), "object"),
    ],
)
def test_an_invalid_file_is_refused_and_nothing_is_written(init_db, tmp_path, changes, message):
    _write(tmp_path, "a_good.json", slug="good", title="Good")
    _write(tmp_path, "b_bad.json", **changes)

    with pytest.raises(QuizDataError, match=message) as error:
        seed_quizzes(tmp_path)

    assert "b_bad.json" in str(error.value)
    assert Quiz.query.count() == 0
    assert QuizQuestion.query.count() == 0


def test_a_bad_file_leaves_an_existing_quiz_as_it_was(init_db, tmp_path):
    _write(tmp_path)
    seed_quizzes(tmp_path)
    _write(tmp_path, title="Changed", questions=[_question(1, answer="Z")])

    with pytest.raises(QuizDataError):
        seed_quizzes(tmp_path)

    db.session.rollback()
    quiz = Quiz.query.one()
    assert quiz.title == "One"
    assert [q.number for q in quiz.questions] == [1, 2]


def test_a_file_that_is_not_json_is_refused(init_db, tmp_path):
    (tmp_path / "broken.json").write_text("{not json", encoding="utf-8")

    with pytest.raises(QuizDataError, match=r"broken.json"):
        seed_quizzes(tmp_path)


def test_two_files_with_one_slug_are_refused(init_db, tmp_path):
    _write(tmp_path, "a.json")
    _write(tmp_path, "b.json")

    with pytest.raises(QuizDataError, match=r"also in a.json"):
        seed_quizzes(tmp_path)
    assert Quiz.query.count() == 0


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


def test_the_seed_command_reports_deleted_questions_and_a_bad_file(test_app, tmp_path):
    _write(tmp_path, questions=[_question(1), _question(2)])
    with test_app.app_context():
        try:
            with patch("application.commands.quiz_seed.QUIZ_DATA_DIR", tmp_path):
                test_app.test_cli_runner().invoke(seed_command)
                _write(tmp_path, questions=[_question(1)])
                result = test_app.test_cli_runner().invoke(seed_command)
                assert "Student tests: quizzes +0/~1, questions +0/~1/-1." in result.output

                _write(tmp_path, questions=[_question(1, answer="Z")])
                result = test_app.test_cli_runner().invoke(seed_command)
                assert result.exit_code == 0
                assert "Error seeding student tests: one.json: question 1: answer" in result.output
        finally:
            db.session.rollback()
            QuizQuestion.query.delete()
            Quiz.query.delete()
            db.session.commit()
