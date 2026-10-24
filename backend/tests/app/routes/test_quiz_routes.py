"""
File: test_quiz_routes.py
Type: py
Summary: Student tests API: list, start and resume, save, submit and grade, who may read
         a result, admin settings and results, and that no test data reaches the public
         profile or the course progress.
"""

from datetime import timedelta

import pytest
from application.extensions import db
from application.models.duck_transaction import DuckTransaction
from application.models.quiz import Quiz, QuizAttempt, QuizQuestion, QuizReward
from application.utilities.helper_functions import utcnow_naive
from tests.factories import AdminFactory, ClassroomFactory, ParentFactory, UserFactory

# slug, answer key (letter per question), domain per question
KEY = ["A", "B", "C", "A"]
DOMAINS = ["Hardware", "Hardware", "Python", "Python"]


def make_quiz(slug="quiz-one", **settings):
    quiz = Quiz(slug=slug, title=f"Title {slug}", description="d", sort_order=1, **settings)
    for number, (answer, domain) in enumerate(zip(KEY, DOMAINS, strict=True), start=1):
        quiz.questions.append(
            QuizQuestion(
                number=number,
                domain=domain,
                prompt=f"Prompt {number}",
                options={"A": "a", "B": "b", "C": "c", "D": "d"},
                answer=answer,
                explanation=f"Because {number}",
                diagram_html="<svg></svg>" if number == 1 else None,
            )
        )
    db.session.add(quiz)
    db.session.commit()
    return quiz


def login(client, user):
    with client.session_transaction() as sess:
        sess["user"] = user.id
        sess["_user_id"] = str(user.id)
        sess["_fresh"] = True


def data(response):
    return response.get_json()["data"]


def start(client, slug="quiz-one"):
    return client.post(f"/api/quizzes/{slug}/attempts")


@pytest.fixture
def quiz(init_db):
    return make_quiz()


@pytest.fixture
def student(init_db):
    return UserFactory()


@pytest.fixture
def admin(init_db):
    return AdminFactory()


@pytest.fixture
def parent_of(init_db):
    """A parent linked to the student the test passes in."""

    def _link(student):
        parent = ParentFactory()
        parent.children.append(student)
        db.session.commit()
        return parent

    return _link


def submitted_attempt(client, student, answers):
    """Log the student in, start the test and submit the given answers."""
    login(client, student)
    attempt_id = data(start(client))["attempt"]["id"]
    response = client.post(f"/api/quizzes/attempts/{attempt_id}/submit", json={"answers": answers})
    assert response.status_code == 200
    return attempt_id


# --- authentication ----------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/quizzes"),
        ("post", "/api/quizzes/quiz-one/attempts"),
        ("get", "/api/quizzes/attempts/1"),
        ("patch", "/api/quizzes/attempts/1"),
        ("post", "/api/quizzes/attempts/1/submit"),
        ("get", "/api/quizzes/students/1/attempts"),
        ("get", "/api/quizzes/admin"),
        ("patch", "/api/quizzes/admin/quiz-one"),
        ("get", "/api/quizzes/admin/results"),
        ("delete", "/api/quizzes/admin/attempts/1"),
    ],
)
def test_every_endpoint_needs_a_login(client, method, path):
    assert getattr(client, method)(path).status_code == 401


# --- list --------------------------------------------------------------------


def test_list_shows_active_quizzes_in_order(client, student):
    make_quiz("second", time_limit_minutes=20).sort_order = 2
    make_quiz("inactive", is_active=False)
    first = make_quiz("first")
    first.sort_order = 1
    db.session.commit()
    login(client, student)

    response = client.get("/api/quizzes")

    assert response.status_code == 200
    rows = data(response)["quizzes"]
    assert [row["slug"] for row in rows] == ["first", "second"]
    assert rows[1] == {
        "slug": "second",
        "title": "Title second",
        "description": "d",
        "question_count": 4,
        "time_limit_minutes": 20,
        "allow_retakes": True,
        "in_progress_attempt_id": None,
        "can_start": True,
        "attempts": [],
    }


def test_list_reports_own_attempts_newest_first(client, student, quiz):
    other = UserFactory()
    first_id = submitted_attempt(client, student, {"1": "A"})
    second_id = submitted_attempt(client, student, {"1": "A", "2": "B"})
    submitted_attempt(client, other, {"1": "A"})
    login(client, student)
    open_id = data(start(client))["attempt"]["id"]

    [row] = data(client.get("/api/quizzes"))["quizzes"]

    assert row["in_progress_attempt_id"] == open_id
    assert [a["id"] for a in row["attempts"]] == [second_id, first_id]
    assert row["attempts"][0]["correct"] == 2
    assert row["attempts"][0]["total"] == 4
    assert row["attempts"][0]["score_percent"] == 50
    assert set(row["attempts"][0]) == {"id", "submitted_at", "correct", "total", "score_percent"}


def test_list_cannot_start_a_test_whose_retakes_are_off_once_taken(client, student):
    make_quiz(allow_retakes=False)
    submitted_attempt(client, student, {})

    [row] = data(client.get("/api/quizzes"))["quizzes"]

    assert row["allow_retakes"] is False
    assert row["can_start"] is False


def test_list_tells_a_parent_they_cannot_start(client, parent_of, student, quiz):
    login(client, parent_of(student))

    [row] = data(client.get("/api/quizzes"))["quizzes"]

    assert row["can_start"] is False
    assert row["attempts"] == []


# --- start and resume --------------------------------------------------------


def test_start_creates_an_attempt_without_the_key(client, student, quiz):
    login(client, student)

    response = start(client)

    assert response.status_code == 201
    attempt = data(response)["attempt"]
    assert attempt["status"] == "in_progress"
    assert attempt["quiz"] == {"slug": "quiz-one", "title": "Title quiz-one", "time_limit_minutes": None}
    assert attempt["deadline"] is None
    assert attempt["started_at"].endswith("Z")
    assert attempt["elapsed_seconds"] == 0
    assert attempt["answers"] == {}
    assert attempt["flagged"] == []
    assert [q["number"] for q in attempt["questions"]] == [1, 2, 3, 4]
    first = attempt["questions"][0]
    assert first == {
        "number": 1,
        "domain": "Hardware",
        "prompt": "Prompt 1",
        "options": [
            {"letter": "A", "text": "a"},
            {"letter": "B", "text": "b"},
            {"letter": "C", "text": "c"},
            {"letter": "D", "text": "d"},
        ],
        "diagram_html": "<svg></svg>",
    }
    assert attempt["questions"][1]["diagram_html"] is None
    text = response.get_data(as_text=True)
    assert "Because" not in text
    assert '"answer"' not in text
    assert "explanation" not in text


def test_start_resumes_the_attempt_in_progress(client, student, quiz):
    login(client, student)
    first = data(start(client))["attempt"]
    client.patch(f"/api/quizzes/attempts/{first['id']}", json={"answers": {"1": "B"}, "flagged": [2]})

    response = start(client)

    assert response.status_code == 200
    again = data(response)["attempt"]
    assert again["id"] == first["id"]
    assert again["answers"] == {"1": "B"}
    assert again["flagged"] == [2]
    assert QuizAttempt.query.count() == 1


def test_start_sets_a_deadline_with_a_time_limit(client, student):
    make_quiz(time_limit_minutes=10)
    login(client, student)

    attempt = data(start(client))["attempt"]

    assert attempt["quiz"]["time_limit_minutes"] == 10
    row = db.session.get(QuizAttempt, attempt["id"])
    assert attempt["deadline"] == (row.started_at + timedelta(minutes=10)).isoformat() + "Z"


def test_start_stores_the_deadline_on_the_attempt(client, student):
    make_quiz(time_limit_minutes=10)
    login(client, student)

    attempt_id = data(start(client))["attempt"]["id"]

    row = db.session.get(QuizAttempt, attempt_id)
    assert row.deadline == row.started_at + timedelta(minutes=10)


def test_adding_a_time_limit_later_does_not_reach_an_attempt_in_progress(client, student, admin, quiz):
    login(client, student)
    attempt_id = data(start(client))["attempt"]["id"]
    row = db.session.get(QuizAttempt, attempt_id)
    row.started_at = utcnow_naive() - timedelta(hours=2)
    db.session.commit()
    login(client, admin)
    client.patch("/api/quizzes/admin/quiz-one", json={"time_limit_minutes": 5})
    login(client, student)

    state = data(client.get(f"/api/quizzes/attempts/{attempt_id}"))["attempt"]
    assert state["deadline"] is None
    assert state["quiz"]["time_limit_minutes"] is None
    assert save(client, attempt_id, {"answers": {"1": "A"}}).status_code == 200
    response = client.post(f"/api/quizzes/attempts/{attempt_id}/submit", json={"answers": {"2": "B"}})
    assert response.status_code == 200
    assert data(response)["attempt"]["correct"] == 2
    # An attempt started afterwards gets the new limit
    again = data(start(client))["attempt"]
    assert again["quiz"]["time_limit_minutes"] == 5
    assert again["deadline"] is not None


def test_removing_the_time_limit_later_keeps_the_deadline_of_an_attempt_in_progress(
    client, student, admin
):
    make_quiz(time_limit_minutes=10)
    login(client, student)
    attempt_id = data(start(client))["attempt"]["id"]
    expire_attempt(attempt_id, minutes=11)
    login(client, admin)
    client.patch("/api/quizzes/admin/quiz-one", json={"time_limit_minutes": None})
    login(client, student)

    state = data(client.get(f"/api/quizzes/attempts/{attempt_id}"))["attempt"]
    assert state["deadline"] is not None
    assert state["quiz"]["time_limit_minutes"] == 10
    response = save(client, attempt_id, {"answers": {"1": "A"}})
    assert response.status_code == 409
    assert response.get_json()["expired"] is True
    response = client.post(f"/api/quizzes/attempts/{attempt_id}/submit", json={"answers": {"1": "A"}})
    assert data(response)["attempt"]["correct"] == 0
    # An attempt started afterwards has no limit
    assert data(start(client))["attempt"]["deadline"] is None


def test_start_allows_a_retake(client, student, quiz):
    first_id = submitted_attempt(client, student, {})

    response = start(client)

    assert response.status_code == 201
    assert data(response)["attempt"]["id"] != first_id


def test_start_refuses_a_retake_when_retakes_are_off(client, student):
    make_quiz(allow_retakes=False)
    login(client, student)
    attempt_id = data(start(client))["attempt"]["id"]
    # An unfinished attempt can still be resumed
    assert start(client).status_code == 200
    client.post(f"/api/quizzes/attempts/{attempt_id}/submit")

    response = start(client)

    assert response.status_code == 403
    assert response.get_json()["error"]
    assert QuizAttempt.query.count() == 1


def test_start_an_unknown_quiz_is_not_found(client, student, quiz):
    login(client, student)

    assert start(client, "nope").status_code == 404


def test_start_an_inactive_quiz_is_not_found(client, student):
    make_quiz("hidden", is_active=False)
    login(client, student)

    assert start(client, "hidden").status_code == 404


def test_a_parent_cannot_start_a_test(client, parent_of, student, quiz):
    login(client, parent_of(student))

    assert start(client).status_code == 403
    assert QuizAttempt.query.count() == 0


def test_an_admin_can_take_a_test(client, admin, quiz):
    login(client, admin)

    assert start(client).status_code == 201


# --- read an attempt in progress ---------------------------------------------


def test_the_owner_reads_the_attempt_in_progress_without_the_key(client, student, quiz):
    login(client, student)
    attempt_id = data(start(client))["attempt"]["id"]

    response = client.get(f"/api/quizzes/attempts/{attempt_id}")

    assert response.status_code == 200
    attempt = data(response)["attempt"]
    assert attempt["status"] == "in_progress"
    assert len(attempt["questions"]) == 4
    assert "Because" not in response.get_data(as_text=True)
    assert "review" not in attempt


def test_a_missing_attempt_is_not_found(client, student):
    login(client, student)

    assert client.get("/api/quizzes/attempts/999").status_code == 404
    assert client.patch("/api/quizzes/attempts/999", json={}).status_code == 404
    assert client.post("/api/quizzes/attempts/999/submit").status_code == 404


# --- save --------------------------------------------------------------------


@pytest.fixture
def open_attempt(client, student, quiz):
    login(client, student)
    return data(start(client))["attempt"]["id"]


def expire_attempt(attempt_id, **age):
    """Make the attempt start ``age`` ago, with its deadline ten minutes after that."""
    row = db.session.get(QuizAttempt, attempt_id)
    row.started_at = utcnow_naive() - timedelta(**age)
    row.deadline = row.started_at + timedelta(minutes=10)
    db.session.commit()


def save(client, attempt_id, body):
    return client.patch(f"/api/quizzes/attempts/{attempt_id}", json=body)


def test_save_stores_answers_flags_and_elapsed(client, open_attempt):
    response = save(
        client,
        open_attempt,
        {"answers": {"1": "A", "3": "D"}, "flagged": [3, 1, 3], "elapsed_seconds": 42},
    )

    assert response.status_code == 200
    assert data(response)["attempt"] == {
        "id": open_attempt,
        "answers": {"1": "A", "3": "D"},
        "flagged": [1, 3],
        "elapsed_seconds": 42,
    }
    row = db.session.get(QuizAttempt, open_attempt)
    assert row.answers == {"1": "A", "3": "D"}


def test_save_merges_answers_and_a_blank_letter_clears_one(client, open_attempt):
    save(client, open_attempt, {"answers": {"1": "A", "2": "B"}})

    response = save(client, open_attempt, {"answers": {"2": None, "3": "C"}})
    assert data(response)["attempt"]["answers"] == {"1": "A", "3": "C"}

    response = save(client, open_attempt, {"answers": {"1": ""}})
    assert data(response)["attempt"]["answers"] == {"3": "C"}


def test_save_with_nothing_to_save_is_fine(client, open_attempt):
    assert save(client, open_attempt, {}).status_code == 200


@pytest.mark.parametrize(
    "body",
    [
        {"answers": {"1": "Z"}},
        {"answers": {"1": "a"}},
        {"answers": {"1": 1}},
        {"answers": {"9": "A"}},
        {"answers": {"x": "A"}},
        {"answers": {"-1": "A"}},
        {"answers": {"0": "A"}},
        {"answers": {"10001": "A"}},
        {"answers": {"1000000": "A"}},
        {"answers": {"9" * 5000: "A"}},
        {"answers": {"1": "A", "9" * 5000: "A"}},
        {"flagged": [10**30]},
        {"flagged": [0]},
        {"flagged": [-1]},
        {"flagged": ["9" * 5000]},
        {"flagged": [[1]]},
        {"answers": ["A"]},
        {"flagged": [9]},
        {"flagged": ["x"]},
        {"flagged": [True]},
        {"flagged": "1"},
        {"elapsed_seconds": -1},
        {"elapsed_seconds": 86401},
        {"elapsed_seconds": 10**30},
        {"elapsed_seconds": "5"},
        {"elapsed_seconds": 1.5},
        {"elapsed_seconds": True},
        # one bad part rejects the whole save
        {"answers": {"1": "A"}, "elapsed_seconds": -5},
    ],
)
def test_save_rejects_a_bad_payload_and_changes_nothing(client, open_attempt, body):
    save(client, open_attempt, {"answers": {"2": "B"}, "elapsed_seconds": 10})

    response = save(client, open_attempt, body)

    assert response.status_code == 400
    assert response.get_json()["error"]
    row = db.session.get(QuizAttempt, open_attempt)
    assert row.answers == {"2": "B"}
    assert row.elapsed_seconds == 10


def test_save_rejects_a_body_that_is_not_an_object(client, open_attempt):
    assert client.patch(f"/api/quizzes/attempts/{open_attempt}", json=[1]).status_code == 400


def test_elapsed_seconds_keeps_the_larger_value_and_still_saves_the_answers(client, open_attempt):
    save(client, open_attempt, {"elapsed_seconds": 30})

    response = save(client, open_attempt, {"elapsed_seconds": 29, "answers": {"1": "B"}})

    assert response.status_code == 200
    assert data(response)["attempt"]["elapsed_seconds"] == 30
    assert data(response)["attempt"]["answers"] == {"1": "B"}
    assert save(client, open_attempt, {"elapsed_seconds": 30}).status_code == 200
    response = save(client, open_attempt, {"elapsed_seconds": 31})
    assert data(response)["attempt"]["elapsed_seconds"] == 31
    assert db.session.get(QuizAttempt, open_attempt).elapsed_seconds == 31


def test_elapsed_seconds_accepts_a_day(client, open_attempt):
    response = save(client, open_attempt, {"elapsed_seconds": 86400})

    assert data(response)["attempt"]["elapsed_seconds"] == 86400


def test_a_submit_with_a_lower_elapsed_keeps_the_larger_one(client, open_attempt):
    save(client, open_attempt, {"elapsed_seconds": 50})

    response = client.post(
        f"/api/quizzes/attempts/{open_attempt}/submit",
        json={"elapsed_seconds": 20, "answers": {"1": "A"}},
    )

    result = data(response)["attempt"]
    assert (result["elapsed_seconds"], result["correct"]) == (50, 1)


def test_a_submit_with_a_huge_number_is_a_400_and_grades_nothing(client, open_attempt):
    for body in ({"elapsed_seconds": 10**30}, {"answers": {"9" * 5000: "A"}}, {"flagged": [10**30]}):
        response = client.post(f"/api/quizzes/attempts/{open_attempt}/submit", json=body)
        assert response.status_code == 400
    assert db.session.get(QuizAttempt, open_attempt).submitted_at is None


def test_saving_a_submitted_attempt_conflicts(client, open_attempt):
    client.post(f"/api/quizzes/attempts/{open_attempt}/submit")

    response = save(client, open_attempt, {"answers": {"1": "A"}})

    assert response.status_code == 409


def test_save_after_the_deadline_expires(client, student):
    make_quiz(time_limit_minutes=10)
    login(client, student)
    attempt_id = data(start(client))["attempt"]["id"]
    expire_attempt(attempt_id, minutes=10, seconds=40)

    response = save(client, attempt_id, {"answers": {"1": "A"}})

    assert response.status_code == 409
    body = response.get_json()
    assert body["expired"] is True
    assert body["error"]
    assert db.session.get(QuizAttempt, attempt_id).answers == {}


def test_save_within_the_grace_period_still_counts(client, student):
    make_quiz(time_limit_minutes=10)
    login(client, student)
    attempt_id = data(start(client))["attempt"]["id"]
    expire_attempt(attempt_id, minutes=10, seconds=5)

    assert save(client, attempt_id, {"answers": {"1": "A"}}).status_code == 200


def test_another_user_cannot_save_or_submit(client, open_attempt):
    login(client, UserFactory())

    assert save(client, open_attempt, {"answers": {"1": "A"}}).status_code == 403
    assert client.post(f"/api/quizzes/attempts/{open_attempt}/submit").status_code == 403
    assert db.session.get(QuizAttempt, open_attempt).answers == {}


def test_an_admin_cannot_save_for_a_student(client, open_attempt, admin):
    login(client, admin)

    assert save(client, open_attempt, {"answers": {"1": "A"}}).status_code == 403


# --- submit and grade --------------------------------------------------------


def test_submit_grades_and_counts(client, open_attempt):
    # 1 right, 2 wrong, 3 right, 4 skipped
    response = client.post(
        f"/api/quizzes/attempts/{open_attempt}/submit",
        json={"answers": {"1": "A", "2": "C", "3": "C"}, "elapsed_seconds": 95},
    )

    assert response.status_code == 200
    result = data(response)["attempt"]
    assert result["id"] == open_attempt
    assert result["status"] == "submitted"
    assert result["quiz"] == {"slug": "quiz-one", "title": "Title quiz-one"}
    assert result["student"]["username"]
    assert set(result["student"]) == {"id", "username", "nickname"}
    assert result["submitted_at"].endswith("Z")
    assert result["elapsed_seconds"] == 95
    assert result["correct"] == 2
    assert result["total"] == 4
    assert result["wrong"] == 1
    assert result["skipped"] == 1
    assert result["score_percent"] == 50
    assert result["domains"] == [
        {"domain": "Hardware", "correct": 1, "total": 2},
        {"domain": "Python", "correct": 1, "total": 2},
    ]
    row = db.session.get(QuizAttempt, open_attempt)
    assert (row.correct_count, row.total_count, row.score_percent) == (2, 4, 50)
    assert row.submitted_at is not None


def test_submit_without_a_body_grades_the_saved_answers(client, open_attempt):
    save(client, open_attempt, {"answers": {"1": "A", "2": "B", "3": "C", "4": "A"}})

    response = client.post(f"/api/quizzes/attempts/{open_attempt}/submit")

    result = data(response)["attempt"]
    assert (result["correct"], result["wrong"], result["skipped"]) == (4, 0, 0)
    assert result["score_percent"] == 100


def test_submit_an_empty_attempt_scores_zero(client, open_attempt):
    result = data(client.post(f"/api/quizzes/attempts/{open_attempt}/submit"))["attempt"]

    assert (result["correct"], result["wrong"], result["skipped"]) == (0, 0, 4)
    assert result["score_percent"] == 0


def test_score_rounds_to_a_whole_percent(client, student):
    quiz = Quiz(slug="three", title="Three")
    for number in (1, 2, 3):
        quiz.questions.append(
            QuizQuestion(number=number, domain="D", prompt="p", options={"A": "a", "B": "b"}, answer="A")
        )
    db.session.add(quiz)
    db.session.commit()
    login(client, student)
    attempt_id = data(start(client, "three"))["attempt"]["id"]

    result = client.post(
        f"/api/quizzes/attempts/{attempt_id}/submit", json={"answers": {"1": "A", "2": "A"}}
    )

    assert data(result)["attempt"]["score_percent"] == 67


def test_submit_twice_conflicts(client, open_attempt):
    assert client.post(f"/api/quizzes/attempts/{open_attempt}/submit").status_code == 200

    assert client.post(f"/api/quizzes/attempts/{open_attempt}/submit").status_code == 409


def test_submit_with_a_bad_body_grades_nothing(client, open_attempt):
    response = client.post(
        f"/api/quizzes/attempts/{open_attempt}/submit", json={"answers": {"1": "Z"}}
    )

    assert response.status_code == 400
    assert db.session.get(QuizAttempt, open_attempt).submitted_at is None


def test_submit_after_the_deadline_ignores_the_body(client, student):
    make_quiz(time_limit_minutes=10)
    login(client, student)
    attempt_id = data(start(client))["attempt"]["id"]
    save(client, attempt_id, {"answers": {"1": "A"}})
    expire_attempt(attempt_id, minutes=11)

    response = client.post(
        f"/api/quizzes/attempts/{attempt_id}/submit",
        json={"answers": {"2": "B", "3": "C"}, "elapsed_seconds": 5},
    )

    assert response.status_code == 200
    result = data(response)["attempt"]
    assert result["correct"] == 1
    assert result["skipped"] == 3


def test_submit_without_a_time_limit_never_expires(client, open_attempt):
    row = db.session.get(QuizAttempt, open_attempt)
    row.started_at = utcnow_naive() - timedelta(days=3)
    db.session.commit()

    response = client.post(
        f"/api/quizzes/attempts/{open_attempt}/submit", json={"answers": {"1": "A"}}
    )

    assert data(response)["attempt"]["correct"] == 1


def test_only_one_attempt_can_be_open_per_user_and_quiz(client, student, quiz):
    login(client, student)
    start(client)

    db.session.add(QuizAttempt(quiz_id=quiz.id, user_id=student.id))
    with pytest.raises(Exception, match="UNIQUE"):
        db.session.commit()
    db.session.rollback()


# --- review visibility -------------------------------------------------------


def review_of(response):
    return data(response)["attempt"]["review"]


def test_the_owner_sees_the_review_when_answers_are_revealed(client, student, quiz):
    attempt_id = submitted_attempt(client, student, {"1": "A", "2": "C"})

    response = client.get(f"/api/quizzes/attempts/{attempt_id}")

    assert response.status_code == 200
    attempt = data(response)["attempt"]
    assert attempt["status"] == "submitted"
    assert attempt["correct"] == 1
    review = attempt["review"]
    assert [r["number"] for r in review] == [1, 2, 3, 4]
    assert review[0] == {
        "number": 1,
        "domain": "Hardware",
        "prompt": "Prompt 1",
        "options": [
            {"letter": "A", "text": "a"},
            {"letter": "B", "text": "b"},
            {"letter": "C", "text": "c"},
            {"letter": "D", "text": "d"},
        ],
        "diagram_html": "<svg></svg>",
        "selected": "A",
        "answer": "A",
        "is_correct": True,
        "explanation": "Because 1",
    }
    assert (review[1]["selected"], review[1]["answer"], review[1]["is_correct"]) == ("C", "B", False)
    assert (review[2]["selected"], review[2]["is_correct"]) == (None, False)


def test_the_owner_gets_no_review_when_answers_are_hidden(client, student):
    make_quiz(reveal_answers=False)
    attempt_id = submitted_attempt(client, student, {"1": "A"})

    response = client.get(f"/api/quizzes/attempts/{attempt_id}")

    attempt = data(response)["attempt"]
    assert attempt["review"] is None
    assert attempt["correct"] == 1
    assert len(attempt["domains"]) == 2
    text = response.get_data(as_text=True)
    assert "Because" not in text
    assert '"answer"' not in text


def test_the_submit_response_hides_the_review_too_when_answers_are_hidden(client, student):
    make_quiz(reveal_answers=False)
    login(client, student)
    attempt_id = data(start(client))["attempt"]["id"]

    response = client.post(f"/api/quizzes/attempts/{attempt_id}/submit")

    assert data(response)["attempt"]["review"] is None
    assert "Because" not in response.get_data(as_text=True)


def test_an_admin_sees_the_review_even_when_answers_are_hidden(client, student, admin):
    make_quiz(reveal_answers=False)
    attempt_id = submitted_attempt(client, student, {"1": "A"})
    login(client, admin)

    response = client.get(f"/api/quizzes/attempts/{attempt_id}")

    assert response.status_code == 200
    review = review_of(response)
    assert review[0]["answer"] == "A"
    assert review[0]["explanation"] == "Because 1"


def test_a_linked_parent_sees_the_review_even_when_answers_are_hidden(client, student, parent_of):
    make_quiz(reveal_answers=False)
    attempt_id = submitted_attempt(client, student, {"1": "A"})
    login(client, parent_of(student))

    response = client.get(f"/api/quizzes/attempts/{attempt_id}")

    assert response.status_code == 200
    assert review_of(response)[0]["explanation"] == "Because 1"


def test_an_unlinked_parent_is_refused(client, student, parent_of, quiz):
    attempt_id = submitted_attempt(client, student, {"1": "A"})
    other_child = UserFactory()
    login(client, parent_of(other_child))

    assert client.get(f"/api/quizzes/attempts/{attempt_id}").status_code == 403


def test_another_student_is_refused(client, student, quiz):
    attempt_id = submitted_attempt(client, student, {"1": "A"})
    login(client, UserFactory())

    assert client.get(f"/api/quizzes/attempts/{attempt_id}").status_code == 403


def test_an_admin_and_a_parent_get_a_summary_of_an_attempt_in_progress(
    client, student, admin, parent_of, quiz
):
    login(client, student)
    attempt_id = data(start(client))["attempt"]["id"]
    parent = parent_of(student)

    for viewer in (admin, parent):
        login(client, viewer)
        response = client.get(f"/api/quizzes/attempts/{attempt_id}")
        assert response.status_code == 200
        attempt = data(response)["attempt"]
        assert attempt["status"] == "in_progress"
        assert attempt["correct"] is None
        assert attempt["score_percent"] is None
        assert attempt["submitted_at"] is None
        assert attempt["total"] == 4
        assert "questions" not in attempt
        assert "review" not in attempt


def test_another_student_cannot_read_an_attempt_in_progress(client, student, quiz):
    login(client, student)
    attempt_id = data(start(client))["attempt"]["id"]
    login(client, UserFactory())

    assert client.get(f"/api/quizzes/attempts/{attempt_id}").status_code == 403


# --- a student's attempts ----------------------------------------------------


def test_an_admin_lists_a_students_attempts_newest_first(client, student, admin, quiz):
    first = submitted_attempt(client, student, {"1": "A"})
    second = submitted_attempt(client, student, {})
    login(client, student)
    third = data(start(client))["attempt"]["id"]
    login(client, admin)

    response = client.get(f"/api/quizzes/students/{student.id}/attempts")

    assert response.status_code == 200
    body = data(response)
    assert body["student"] == {"id": student.id, "username": student.username, "nickname": student.nickname}
    assert [a["id"] for a in body["attempts"]] == [third, second, first]
    assert [a["status"] for a in body["attempts"]] == ["in_progress", "submitted", "submitted"]
    assert body["attempts"][0]["total"] == 4
    assert body["attempts"][0]["correct"] is None
    assert body["attempts"][2]["correct"] == 1


def test_a_linked_parent_lists_the_students_attempts(client, student, parent_of, quiz):
    attempt_id = submitted_attempt(client, student, {})
    login(client, parent_of(student))

    response = client.get(f"/api/quizzes/students/{student.id}/attempts")

    assert [a["id"] for a in data(response)["attempts"]] == [attempt_id]


def test_nobody_else_lists_a_students_attempts(client, student, parent_of, quiz):
    submitted_attempt(client, student, {})
    for viewer in (UserFactory(), student, parent_of(UserFactory())):
        login(client, viewer)
        # a student may not use this endpoint even for themselves
        assert client.get(f"/api/quizzes/students/{student.id}/attempts").status_code == 403


def test_listing_an_unknown_student_is_not_found_for_an_admin(client, admin):
    login(client, admin)

    assert client.get("/api/quizzes/students/9999/attempts").status_code == 404


# --- admin -------------------------------------------------------------------


def test_the_admin_endpoints_refuse_a_student_and_a_parent(client, student, parent_of, quiz):
    for viewer in (student, parent_of(student)):
        login(client, viewer)
        assert client.get("/api/quizzes/admin").status_code == 403
        assert client.patch("/api/quizzes/admin/quiz-one", json={"is_active": False}).status_code == 403
        assert client.get("/api/quizzes/admin/results").status_code == 403
        assert client.delete("/api/quizzes/admin/attempts/1").status_code == 403


def test_admin_list_includes_inactive_quizzes_with_counts(client, student, admin, quiz):
    inactive = make_quiz("old", is_active=False)
    inactive.sort_order = 5
    db.session.commit()
    submitted_attempt(client, student, {"1": "A", "2": "B", "3": "C", "4": "A"})  # 100
    submitted_attempt(client, student, {"1": "A", "2": "B"})  # 50
    login(client, student)
    start(client)
    login(client, admin)

    response = client.get("/api/quizzes/admin")

    assert response.status_code == 200
    first, old = data(response)["quizzes"]
    assert first == {
        "slug": "quiz-one",
        "title": "Title quiz-one",
        "description": "d",
        "sort_order": 1,
        "is_active": True,
        "reveal_answers": True,
        "allow_retakes": True,
        "time_limit_minutes": None,
        "question_count": 4,
        "attempt_count": 3,
        "submitted_count": 2,
        "average_percent": 75,
    }
    assert old["slug"] == "old"
    assert old["is_active"] is False
    assert old["average_percent"] is None
    assert (old["attempt_count"], old["submitted_count"]) == (0, 0)


def test_admin_updates_settings(client, admin, quiz):
    login(client, admin)

    response = client.patch(
        "/api/quizzes/admin/quiz-one",
        json={
            "is_active": False,
            "reveal_answers": False,
            "allow_retakes": False,
            "time_limit_minutes": 45,
        },
    )

    assert response.status_code == 200
    row = data(response)["quiz"]
    assert row["slug"] == "quiz-one"
    assert (row["is_active"], row["reveal_answers"], row["allow_retakes"]) == (False, False, False)
    assert row["time_limit_minutes"] == 45
    assert row["question_count"] == 4
    stored = Quiz.query.one()
    assert (stored.is_active, stored.reveal_answers, stored.allow_retakes) == (False, False, False)

    response = client.patch("/api/quizzes/admin/quiz-one", json={"time_limit_minutes": None})
    assert data(response)["quiz"]["time_limit_minutes"] is None
    # Fields not sent stay as they were
    assert data(response)["quiz"]["is_active"] is False


@pytest.mark.parametrize(
    "body",
    [
        {"is_active": "yes"},
        {"is_active": 1},
        {"reveal_answers": None},
        {"allow_retakes": "false"},
        {"time_limit_minutes": 0},
        {"time_limit_minutes": 601},
        {"time_limit_minutes": -5},
        {"time_limit_minutes": "30"},
        {"time_limit_minutes": 12.5},
        {"time_limit_minutes": True},
        [True],
    ],
)
def test_admin_settings_reject_bad_types_and_change_nothing(client, admin, quiz, body):
    login(client, admin)

    response = client.patch("/api/quizzes/admin/quiz-one", json=body)

    assert response.status_code == 400
    stored = Quiz.query.one()
    assert (stored.is_active, stored.reveal_answers, stored.allow_retakes) == (True, True, True)
    assert stored.time_limit_minutes is None


def test_admin_settings_accept_the_limits(client, admin, quiz):
    login(client, admin)

    for minutes in (1, 600):
        response = client.patch("/api/quizzes/admin/quiz-one", json={"time_limit_minutes": minutes})
        assert response.status_code == 200


def test_admin_settings_of_an_unknown_quiz_are_not_found(client, admin):
    login(client, admin)

    assert client.patch("/api/quizzes/admin/nope", json={"is_active": True}).status_code == 404


def test_an_inactive_quiz_disappears_for_students(client, student, admin, quiz):
    login(client, admin)
    client.patch("/api/quizzes/admin/quiz-one", json={"is_active": False})
    login(client, student)

    assert data(client.get("/api/quizzes"))["quizzes"] == []
    assert start(client).status_code == 404


def test_admin_results_filter_by_quiz_status_and_classroom(client, admin, student):
    make_quiz("quiz-one")
    make_quiz("quiz-two")
    other = UserFactory()
    classroom = ClassroomFactory()
    classroom.users.append(student)
    db.session.commit()
    a = submitted_attempt(client, student, {"1": "A"})
    login(client, student)
    b = data(start(client, "quiz-two"))["attempt"]["id"]
    c = submitted_attempt(client, other, {})
    login(client, admin)

    def ids(query=""):
        response = client.get(f"/api/quizzes/admin/results{query}")
        assert response.status_code == 200
        return [r["id"] for r in data(response)["results"]]

    assert ids() == [c, b, a]
    assert ids("?quiz=quiz-two") == [b]
    assert ids("?status=submitted") == [c, a]
    assert ids("?status=in_progress") == [b]
    assert ids("?quiz=quiz-one&status=submitted") == [c, a]
    assert ids(f"?classroom_id={classroom.id}") == [b, a]
    assert ids(f"?classroom_id={classroom.id}&status=submitted") == [a]
    assert ids("?classroom_id=nowhere") == []
    assert ids("?quiz=missing") == []
    first = client.get("/api/quizzes/admin/results?status=submitted").get_json()["data"]["results"][1]
    assert first["student"]["id"] == student.id
    assert first["correct"] == 1


def test_admin_results_reject_an_unknown_status(client, admin):
    login(client, admin)

    assert client.get("/api/quizzes/admin/results?status=whatever").status_code == 400


def test_admin_deletes_an_attempt_so_the_student_can_retake(client, student, admin):
    make_quiz(allow_retakes=False)
    attempt_id = submitted_attempt(client, student, {"1": "A"})
    assert start(client).status_code == 403
    login(client, admin)

    response = client.delete(f"/api/quizzes/admin/attempts/{attempt_id}")

    assert response.status_code == 200
    assert data(response) == {"deleted": attempt_id}
    assert db.session.get(QuizAttempt, attempt_id) is None
    login(client, student)
    assert start(client).status_code == 201
    login(client, admin)
    assert client.delete("/api/quizzes/admin/attempts/9999").status_code == 404


# --- the test data stays off public pages -------------------------------------

# Words that only a test result carries (the test data has no other use for them)
QUIZ_WORDS = ("quiz", "title quiz-one", "score_percent", "correct_count", "hardware", "prompt 1")
JSON = {"Accept": "application/json"}


def assert_no_quiz_data(response):
    assert response.status_code == 200
    text = response.get_data(as_text=True).lower()
    for word in QUIZ_WORDS:
        assert word not in text, word


def test_a_submitted_test_is_not_on_the_public_profile_or_course_progress(client, student, quiz):
    submitted_attempt(client, student, {"1": "A", "2": "B"})
    slug = student.slug
    assert slug

    # The course progress is part of the profile JSON (/course-progress/:slug reads
    # target.course_progress from it), so one body covers both pages.
    public = client.application.test_client()
    response = public.get(f"/user/profile/{slug}", headers=JSON)
    assert_no_quiz_data(response)
    assert "course_progress" in data(response)["target"]

    visitor = client.application.test_client()
    login(visitor, UserFactory())
    assert_no_quiz_data(visitor.get(f"/user/profile/{slug}", headers=JSON))

    # The student's own views
    login(client, student)
    assert_no_quiz_data(client.get(f"/user/profile/{slug}", headers=JSON))
    assert_no_quiz_data(client.get("/user/profile", headers=JSON))
    assert_no_quiz_data(client.get(f"/user/api/users/search?q={student.username}"))
    assert_no_quiz_data(client.get("/api/me/activity"))


def test_a_submitted_test_is_not_in_the_course_progress_data(client, student, quiz):
    submitted_attempt(client, student, {"1": "A", "2": "B"})
    db.session.expire_all()

    progress = db.session.get(type(student), student.id).get_course_progress_data()

    assert "quiz" not in repr(progress).lower()
    assert "score_percent" not in repr(progress)


def test_a_submitted_test_is_not_in_the_user_dicts(client, student, quiz):
    submitted_attempt(client, student, {"1": "A"})
    db.session.expire_all()
    user = db.session.get(type(student), student.id)

    for payload in (user.to_dict(), user.to_dict_summary()):
        assert "quiz" not in repr(payload).lower()


def test_a_submitted_test_is_not_in_the_parent_report_card(client, student, parent_of, quiz):
    submitted_attempt(client, student, {"1": "A"})
    login(client, parent_of(student))

    assert_no_quiz_data(client.get(f"/api/parents/student/{student.id}/report"))


# --- ducks for the first attempt ------------------------------------------------


def balance(user):
    db.session.expire_all()
    return db.session.get(type(user), user.id).duck_balance


def test_the_first_attempt_pays_a_duck_per_correct_answer(client, student, quiz):
    student.duck_balance = 5
    student.earned_ducks = 5
    db.session.commit()
    login(client, student)
    attempt_id = data(start(client))["attempt"]["id"]

    response = client.post(
        f"/api/quizzes/attempts/{attempt_id}/submit", json={"answers": {"1": "A", "2": "B", "3": "D"}}
    )

    assert data(response)["attempt"]["ducks_awarded"] == 2
    db.session.expire_all()
    user = db.session.get(type(student), student.id)
    assert (user.duck_balance, user.earned_ducks) == (7, 7)
    [transaction] = DuckTransaction.query.filter_by(user_id=student.id).all()
    assert (transaction.amount, transaction.reason) == (2, "Test: quiz-one")
    assert db.session.get(QuizAttempt, attempt_id).ducks_awarded == 2
    reward = QuizReward.query.one()
    assert (reward.user_id, reward.ducks) == (student.id, 2)
    # The same figure on every view of the result
    for path in (f"/api/quizzes/attempts/{attempt_id}", f"/api/quizzes/students/{student.id}/attempts"):
        login(client, student if "students" not in path else AdminFactory(_username="boss"))
        body = data(client.get(path))
        row = body["attempt"] if "attempt" in body else body["attempts"][0]
        assert row["ducks_awarded"] == 2


def test_no_perk_multiplier_applies(client, student, quiz):
    student.has_double_duck = True
    db.session.commit()

    submitted_attempt(client, student, {"1": "A", "2": "B", "3": "C", "4": "A"})

    assert balance(student) == 4


def test_a_retake_pays_nothing(client, student, quiz):
    submitted_attempt(client, student, {"1": "A"})
    attempt_id = submitted_attempt(client, student, {"1": "A", "2": "B", "3": "C", "4": "A"})

    assert balance(student) == 1
    result = data(client.get(f"/api/quizzes/attempts/{attempt_id}"))["attempt"]
    assert result["ducks_awarded"] == 0
    assert DuckTransaction.query.filter_by(user_id=student.id).count() == 1


def test_deleting_the_first_attempt_does_not_make_a_retake_pay(client, student, admin, quiz):
    first = submitted_attempt(client, student, {"1": "A", "2": "B"})
    login(client, admin)
    assert client.delete(f"/api/quizzes/admin/attempts/{first}").status_code == 200

    again = submitted_attempt(client, student, {"1": "A", "2": "B", "3": "C", "4": "A"})

    assert balance(student) == 2
    assert data(client.get(f"/api/quizzes/attempts/{again}"))["attempt"]["ducks_awarded"] == 0
    assert DuckTransaction.query.filter_by(user_id=student.id).count() == 1


def test_a_first_attempt_with_nothing_correct_pays_nothing_and_uses_up_the_reward(client, student, quiz):
    first = submitted_attempt(client, student, {"1": "B"})
    second = submitted_attempt(client, student, {"1": "A", "2": "B"})

    assert balance(student) == 0
    assert DuckTransaction.query.filter_by(user_id=student.id).count() == 0
    for attempt_id in (first, second):
        assert db.session.get(QuizAttempt, attempt_id).ducks_awarded == 0


def test_each_quiz_pays_once(client, student, quiz):
    make_quiz("quiz-two")
    submitted_attempt(client, student, {"1": "A"})
    login(client, student)
    other = data(start(client, "quiz-two"))["attempt"]["id"]
    client.post(f"/api/quizzes/attempts/{other}/submit", json={"answers": {"1": "A", "2": "B"}})

    assert balance(student) == 3
    reasons = sorted(t.reason for t in DuckTransaction.query.filter_by(user_id=student.id))
    assert reasons == ["Test: quiz-one", "Test: quiz-two"]


def test_an_admin_is_not_paid(client, admin, quiz):
    attempt_id = submitted_attempt(client, admin, {"1": "A", "2": "B"})

    assert balance(admin) == 0
    assert DuckTransaction.query.count() == 0
    assert QuizReward.query.count() == 0
    assert data(client.get(f"/api/quizzes/attempts/{attempt_id}"))["attempt"]["ducks_awarded"] == 0


def test_a_parent_is_not_paid(init_db, quiz):
    from application.services import quiz_service

    parent = ParentFactory()
    attempt = QuizAttempt(quiz_id=quiz.id, user_id=parent.id, answers={}, flagged=[], correct_count=3)
    db.session.add(attempt)
    db.session.commit()

    assert quiz_service.award_ducks(parent, attempt) == 0
    assert QuizReward.query.count() == 0


def test_a_summary_of_an_attempt_in_progress_carries_no_ducks(client, student, admin, quiz):
    login(client, student)
    attempt_id = data(start(client))["attempt"]["id"]
    login(client, admin)

    assert data(client.get(f"/api/quizzes/attempts/{attempt_id}"))["attempt"]["ducks_awarded"] == 0


def test_a_second_submit_neither_conflicts_with_nor_repays_the_first(client, student, quiz):
    attempt_id = submitted_attempt(client, student, {"1": "A", "2": "B"})

    assert client.post(f"/api/quizzes/attempts/{attempt_id}/submit").status_code == 409
    assert balance(student) == 2


def test_a_submit_that_lost_the_race_pays_nothing(client, student, quiz):
    """Another request closes the attempt between this one reading it and claiming it."""
    from application.services import quiz_service

    login(client, student)
    attempt_id = data(start(client))["attempt"]["id"]
    attempt = db.session.get(QuizAttempt, attempt_id)
    db.session.execute(
        db.update(QuizAttempt).where(QuizAttempt.id == attempt_id).values(submitted_at=utcnow_naive())
    )

    assert quiz_service.close_attempt(attempt, list(quiz.questions)) is False


def test_the_reward_key_is_unique_per_user_and_quiz(student, quiz):
    from application.services import quiz_service

    db.session.add(QuizReward(user_id=student.id, quiz_id=quiz.id, ducks=0))
    db.session.commit()
    attempt = QuizAttempt(
        quiz_id=quiz.id, user_id=student.id, answers={}, flagged=[], correct_count=4, total_count=4
    )
    db.session.add(attempt)
    db.session.commit()

    assert quiz_service.award_ducks(student, attempt) == 0
    db.session.commit()
    assert balance(student) == 0
    assert QuizReward.query.count() == 1


# --- results match the stored score ----------------------------------------------


def test_the_snapshot_is_stored_at_submit(client, student, quiz):
    attempt_id = submitted_attempt(client, student, {"1": "A", "2": "C"})

    row = db.session.get(QuizAttempt, attempt_id)

    assert row.graded == {
        "1": {"answer": "A", "selected": "A", "domain": "Hardware"},
        "2": {"answer": "B", "selected": "C", "domain": "Hardware"},
        "3": {"answer": "C", "selected": None, "domain": "Python"},
        "4": {"answer": "A", "selected": None, "domain": "Python"},
    }


def test_an_attempt_in_progress_has_no_snapshot(client, open_attempt):
    assert db.session.get(QuizAttempt, open_attempt).graded is None


def test_a_result_ignores_a_key_changed_after_the_submit(client, student, quiz):
    attempt_id = submitted_attempt(client, student, {"1": "A", "2": "B", "3": "C"})
    before = data(client.get(f"/api/quizzes/attempts/{attempt_id}"))["attempt"]
    QuizQuestion.query.filter_by(quiz_id=quiz.id, number=1).one().answer = "D"
    QuizQuestion.query.filter_by(quiz_id=quiz.id, number=2).one().domain = "Moved"
    db.session.commit()

    after = data(client.get(f"/api/quizzes/attempts/{attempt_id}"))["attempt"]

    assert (after["correct"], after["wrong"], after["skipped"]) == (3, 0, 1)
    assert after["domains"] == before["domains"]
    assert after["review"][0]["answer"] == "A"
    assert after["review"][0]["is_correct"] is True
    assert after["review"][1]["domain"] == "Hardware"
    # The text still follows the live question
    assert after["review"][0]["prompt"] == "Prompt 1"


def test_a_result_still_counts_a_question_deleted_after_the_submit(client, student, quiz):
    attempt_id = submitted_attempt(client, student, {"1": "A", "3": "C"})
    QuizQuestion.query.filter_by(quiz_id=quiz.id, number=3).delete()
    db.session.commit()

    result = data(client.get(f"/api/quizzes/attempts/{attempt_id}"))["attempt"]

    assert (result["total"], result["correct"], result["wrong"], result["skipped"]) == (4, 2, 0, 2)
    assert result["score_percent"] == 50
    assert result["domains"] == [
        {"domain": "Hardware", "correct": 1, "total": 2},
        {"domain": "Python", "correct": 1, "total": 2},
    ]
    assert [r["number"] for r in result["review"]] == [1, 2, 4]


def test_a_result_ignores_a_question_added_after_the_submit(client, student, quiz):
    attempt_id = submitted_attempt(client, student, {"1": "A"})
    quiz.questions.append(
        QuizQuestion(number=5, domain="New", prompt="p", options={"A": "a"}, answer="A")
    )
    db.session.commit()

    result = data(client.get(f"/api/quizzes/attempts/{attempt_id}"))["attempt"]

    assert (result["total"], result["correct"], result["skipped"]) == (4, 1, 3)
    assert [d["domain"] for d in result["domains"]] == ["Hardware", "Python"]
    assert len(result["review"]) == 4


def test_a_save_that_loses_the_race_with_a_submit_changes_nothing(client, student, quiz, monkeypatch):
    """The submit lands between the save validating the attempt and writing it."""
    from application.services import quiz_service

    login(client, student)
    attempt_id = data(start(client))["attempt"]["id"]
    save(client, attempt_id, {"answers": {"1": "A"}, "elapsed_seconds": 5})
    original = quiz_service.parse_progress

    def parse_then_get_submitted(attempt, payload, questions):
        changes = original(attempt, payload, questions)
        db.session.execute(
            db.update(QuizAttempt)
            .where(QuizAttempt.id == attempt_id)
            .values(submitted_at=utcnow_naive(), graded={}, correct_count=1, total_count=4)
        )
        return changes

    monkeypatch.setattr(quiz_service, "parse_progress", parse_then_get_submitted)

    response = save(client, attempt_id, {"answers": {"1": "B", "2": "B"}, "elapsed_seconds": 99})

    assert response.status_code == 409
    db.session.expire_all()
    row = db.session.get(QuizAttempt, attempt_id)
    assert row.answers == {"1": "A"}
    assert row.elapsed_seconds == 5


def test_a_submit_grades_the_answers_it_stores(client, student, quiz):
    login(client, student)
    attempt_id = data(start(client))["attempt"]["id"]
    save(client, attempt_id, {"answers": {"1": "A"}})

    client.post(f"/api/quizzes/attempts/{attempt_id}/submit", json={"answers": {"2": "B"}})

    row = db.session.get(QuizAttempt, attempt_id)
    assert row.answers == {"1": "A", "2": "B"}
    assert row.correct_count == 2
    assert {k: v["selected"] for k, v in row.graded.items()} == {"1": "A", "2": "B", "3": None, "4": None}
    assert save(client, attempt_id, {"answers": {"1": "D"}}).status_code == 409
    assert db.session.get(QuizAttempt, attempt_id).answers == {"1": "A", "2": "B"}
