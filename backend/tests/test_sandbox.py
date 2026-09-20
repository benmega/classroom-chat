"""
File: test_sandbox.py
Type: py
Summary: Unit and integration tests for Classroom Sandbox Mode backend features,
         including models, service logic, CSV ingestion, and sandbox API endpoints.
"""

import io
from datetime import datetime
from unittest.mock import patch

import pytest
from application.extensions import db
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.classroom import Classroom
from application.models.course import Course
from application.models.course_instance import CourseInstance
from application.models.level_game import LevelGame
from application.models.message import Message
from application.models.user import User
from application.services.level_game_service import (
    estimate_target_challenge_by_position,
    get_student_sandbox_games,
    ingest_games_csv,
    parse_assigned_lesson,
    resolve_course_id,
)


def test_level_game_model(init_db):
    game = LevelGame(
        course_id="course_1",
        chapter=1,
        lesson=2,
        challenge_level="b",
        assigned_lesson="1.2b",
        challenge_slug="maze-challenge",
        progression_order=10202,
        game_name="Maze Runner",
        game_url="https://example.com/play/maze",
        platform="Web",
        comment="Fun intro maze",
        requires_account=False,
        rating=4.5,
        verified=True,
    )
    db.session.add(game)
    db.session.commit()

    saved = db.session.get(LevelGame, game.id)
    assert saved is not None
    assert saved.game_name == "Maze Runner"
    assert saved.challenge_slug == "maze-challenge"
    assert saved.progression_order == 10202

    d = saved.to_dict()
    assert d["id"] == saved.id
    assert d["game_name"] == "Maze Runner"
    assert d["game_url"] == "https://example.com/play/maze"
    assert d["assigned_lesson"] == "1.2b"
    assert d["challenge_slug"] == "maze-challenge"
    assert d["progression_order"] == 10202
    assert d["verified"] is True
    assert d["requires_account"] is False
    assert d["rating"] == 4.5
    assert d["created_at"] is not None


def test_classroom_sandbox_fields(init_db):
    classroom = Classroom(id="test_class_1", name="Test Classroom", language="python")
    db.session.add(classroom)
    db.session.commit()

    assert classroom.sandbox_active is False
    assert classroom.sandbox_activated_at is None

    d = classroom.to_dict()
    assert d["sandbox_active"] is False
    assert d["sandbox_activated_at"] is None

    classroom.sandbox_active = True
    classroom.sandbox_activated_at = datetime.utcnow()
    db.session.commit()

    d2 = classroom.to_dict()
    assert d2["sandbox_active"] is True
    assert d2["sandbox_activated_at"] is not None


def test_parse_assigned_lesson():
    # 5.1a
    res = parse_assigned_lesson("5.1a")
    assert res["chapter"] == 5
    assert res["lesson"] == 1
    assert res["challenge_level"] == "a"
    assert res["progression_order"] == 50101

    # Lesson 5.1a
    res = parse_assigned_lesson("Lesson 5.1a")
    assert res["chapter"] == 5
    assert res["lesson"] == 1
    assert res["challenge_level"] == "a"
    assert res["progression_order"] == 50101

    # Code Combat 2.3a
    res_cc = parse_assigned_lesson("Code Combat 2.3a")
    assert res_cc["chapter"] == 2
    assert res_cc["lesson"] == 3
    assert res_cc["challenge_level"] == "a"
    assert res_cc["progression_order"] == 20301

    # 5.1
    res = parse_assigned_lesson("5.1")
    assert res["chapter"] == 5
    assert res["lesson"] == 1
    assert res["challenge_level"] is None
    assert res["progression_order"] == 50100

    # 1.2b
    res = parse_assigned_lesson("1.2b")
    assert res["chapter"] == 1
    assert res["lesson"] == 2
    assert res["challenge_level"] == "b"
    assert res["progression_order"] == 10202

    # 5.10c
    res = parse_assigned_lesson("5.10c")
    assert res["chapter"] == 5
    assert res["lesson"] == 10
    assert res["challenge_level"] == "c"
    assert res["progression_order"] == 51003

    # Fallbacks
    res_none = parse_assigned_lesson(None)
    assert res_none["progression_order"] == 0
    assert res_none["chapter"] is None

    res_empty = parse_assigned_lesson("")
    assert res_empty["progression_order"] == 0

    res_single = parse_assigned_lesson("3")
    assert res_single["chapter"] == 3
    assert res_single["progression_order"] == 30100

    # Lesson number position estimation logic
    class MockChallenge:
        def __init__(self, slug, sequence, name=None):
            self.slug = slug
            self.sequence = sequence
            self.name = name

    challenges = [MockChallenge(f"ch-{i}", i, f"Lesson {i}") for i in range(1, 11)]

    # Lesson 1 -> ratio (1-1)/10 = 0.0 -> index 0 -> ch-1
    est1 = estimate_target_challenge_by_position(challenges, lesson=1, max_lessons_in_course=10)
    assert est1 is not None and est1.slug == "ch-1"

    # Lesson 6 -> ratio (6-1)/10 = 0.5 -> index 5 -> ch-6
    est6 = estimate_target_challenge_by_position(challenges, lesson=6, max_lessons_in_course=10)
    assert est6 is not None and est6.slug == "ch-6"

    # Lesson 10 -> ratio (10-1)/10 = 0.9 -> index 9 -> ch-10
    est10 = estimate_target_challenge_by_position(challenges, lesson=10, max_lessons_in_course=10)
    assert est10 is not None and est10.slug == "ch-10"

    # Clamping beyond max lessons (e.g. lesson=15) -> index 9 -> ch-10
    est_clamp = estimate_target_challenge_by_position(challenges, lesson=15, max_lessons_in_course=10)
    assert est_clamp is not None and est_clamp.slug == "ch-10"

    # Auto-detection of max_lessons_in_course from challenge names
    est_auto = estimate_target_challenge_by_position(challenges, lesson=1)
    assert est_auto is not None and est_auto.slug == "ch-1"


def test_ingest_games_csv(init_db):
    course = Course(id="course_cs1", name="CS1", domain="codecombat.com")
    db.session.add(course)
    db.session.commit()

    csv_data = """Title,Link,Assigned Lesson,Chapter,Chapter Name,Platform,Comment,RequiresAccount,Rating,Verified
Game 1,https://games.com/1,1.1a,1,CS1,Web,First game,False,4.5,True
Game 2,https://games.com/2,1.1b,1,CS1,Web,Second game,False,4.2,True
Invalid Game,ftp://invalid-url.com,1.2a,1,CS1,Web,Bad link,False,3.0,True
Game 3,https://games.com/3,1.2a,1,CS1,Web,Third game,True,4.8,True
"""
    result = ingest_games_csv(csv_data, replace_all=True)
    assert result["success"] is True
    assert result["total_rows"] == 4
    assert result["inserted"] == 3
    assert len(result["errors"]) == 1
    assert "Invalid URL" in result["errors"][0]

    games = LevelGame.query.order_by(LevelGame.progression_order.asc()).all()
    assert len(games) == 3
    assert games[0].game_name == "Game 1"
    assert games[0].course_id == "course_cs1"
    assert games[0].progression_order == 10101
    assert games[2].game_name == "Game 3"
    assert games[2].requires_account is True


def test_ingest_with_explicit_challenge_slug(init_db):
    course = Course(id="course_cs1", name="CS1", domain="codecombat.com")
    ch = Challenge(name="Dungeon 1", slug="dungeon-1", domain="codecombat.com", sequence=1, course_id="course_cs1")
    db.session.add_all([course, ch])
    db.session.commit()

    csv_data = """Title,Link,Assigned Lesson,Chapter,Chapter Name,Platform,Comment,RequiresAccount,Rating,Verified,Challenge Slug
Dungeon Game,https://games.com/dungeon,1.1a,1,CS1,Web,Intro,False,4.5,True,dungeon-1
"""
    result = ingest_games_csv(csv_data, replace_all=True)
    assert result["success"] is True
    assert result["inserted"] == 1
    game = LevelGame.query.first()
    assert game.challenge_slug == "dungeon-1"


def test_ingest_with_no_challenge_slug_fallback(init_db):
    course = Course(id="course_cs1", name="CS1", domain="codecombat.com")
    ch1 = Challenge(name="Intro 1", slug="intro-1", domain="codecombat.com", sequence=1, course_id="course_cs1")
    ch2 = Challenge(name="Intro 2", slug="intro-2", domain="codecombat.com", sequence=2, course_id="course_cs1")
    db.session.add_all([course, ch1, ch2])
    db.session.commit()

    csv_data = """Title,Link,Assigned Lesson,Chapter,Chapter Name,Platform,Comment,RequiresAccount,Rating,Verified
Fallback Game,https://games.com/fallback,,1,CS1,Web,Fallback note,False,4.0,True
"""
    result = ingest_games_csv(csv_data, replace_all=True)
    assert result["success"] is True
    assert result["inserted"] == 1
    game = LevelGame.query.first()
    # Step 3 fallback picks first challenge of course ordered by sequence ASC -> intro-1
    assert game.challenge_slug == "intro-1"


def test_ingest_discards_no_course_rows(init_db):
    course = Course(id="course_cs1", name="CS1", domain="codecombat.com")
    db.session.add(course)
    db.session.commit()

    csv_data = """Title,Link,Assigned Lesson,Chapter,Chapter Name,Platform,Comment,RequiresAccount,Rating,Verified
Valid Course Game,https://games.com/valid,1.1a,1,CS1,Web,Valid,False,4.5,True
Catch Up,https://games.com/catchup,General,,,,Web,No course,False,4.0,True
"""
    result = ingest_games_csv(csv_data, replace_all=True)
    assert result["success"] is True
    assert result["total_rows"] == 2
    assert result["inserted"] == 1
    games = LevelGame.query.all()
    assert len(games) == 1
    assert games[0].game_name == "Valid Course Game"


def test_ingest_carriage_return_newlines(init_db):
    """Test CSV with bare carriage returns (\\r) which previously triggered _csv.Error."""
    course = Course(id="course_cs1", name="CS1", domain="codecombat.com")
    db.session.add(course)
    db.session.commit()

    # Classic Mac OS style \\r line endings
    csv_data = "Title,Link,Assigned Lesson,Chapter,Chapter Name,Platform,Comment,RequiresAccount,Rating,Verified\rGame CR,https://games.com/cr,1.1a,1,CS1,Web,Bare CR,False,4.5,True\r"
    result = ingest_games_csv(csv_data, replace_all=True)
    assert result["success"] is True
    assert result["inserted"] == 1
    game = LevelGame.query.first()
    assert game.game_name == "Game CR"


def test_ingest_mixed_and_double_newlines_and_bom(init_db):
    """Test CSV with mixed \\r\\r\\n, \\r\\n, \\n, and UTF-8 BOM as bytes."""
    course = Course(id="course_cs1", name="CS1", domain="codecombat.com")
    db.session.add(course)
    db.session.commit()

    csv_text = "Title,Link,Assigned Lesson,Chapter,Chapter Name,Platform,Comment,RequiresAccount,Rating,Verified\r\r\nGame DoubleCR,https://games.com/dcr,1.1a,1,CS1,Web,Double CR,False,4.5,True\r\nGame Normal,https://games.com/norm,1.2a,1,CS1,Web,Normal,False,4.0,True\n"
    csv_bytes = b"\xef\xbb\xbf" + csv_text.encode("utf-8")

    result = ingest_games_csv(io.BytesIO(csv_bytes), replace_all=True)
    assert result["success"] is True
    assert result["inserted"] == 2
    games = LevelGame.query.order_by(LevelGame.id.asc()).all()
    assert len(games) == 2
    assert games[0].game_name == "Game DoubleCR"
    assert games[1].game_name == "Game Normal"


def test_ingest_malformed_csv_row_does_not_crash(init_db):
    """Ensure malformed CSV rows don't crash the entire ingestion with a 500."""
    course = Course(id="course_cs1", name="CS1", domain="codecombat.com")
    db.session.add(course)
    db.session.commit()

    # Header ok, followed by a valid row, then an empty row
    csv_data = "Title,Link,Assigned Lesson,Chapter,Chapter Name,Platform,Comment,RequiresAccount,Rating,Verified\nValid,https://games.com/valid,1.1a,1,CS1,Web,Valid,False,4.5,True\n"
    result = ingest_games_csv(csv_data, replace_all=True)
    assert result["success"] is True
    assert result["inserted"] == 1


def test_get_student_sandbox_games(init_db, sample_user):
    classroom = Classroom(id="class_test", name="Test Classroom", language="python")
    classroom.sandbox_active = False
    db.session.add(classroom)

    course = Course(id="c1", name="CS1", domain="codecombat.com")
    db.session.add(course)
    db.session.flush()

    ci = CourseInstance(id="ci_1", classroom_id=classroom.id, course_id=course.id)
    db.session.add(ci)
    db.session.commit()

    # 1. When sandbox_active is False
    res = get_student_sandbox_games(sample_user, classroom)
    assert res["sandbox_active"] is False
    assert res["games"] == []

    # Activate sandbox
    classroom.sandbox_active = True
    db.session.commit()

    # Add LevelGames bound to challenges
    ch1 = Challenge(name="Ch 1", slug="ch-1", domain="codecombat.com", sequence=1, course_id="c1")
    ch2 = Challenge(name="Ch 2", slug="ch-2", domain="codecombat.com", sequence=2, course_id="c1")
    ch3 = Challenge(name="Ch 3", slug="ch-3", domain="codecombat.com", sequence=3, course_id="c1")
    ch4 = Challenge(name="Ch 4", slug="ch-4", domain="codecombat.com", sequence=4, course_id="c1")
    db.session.add_all([ch1, ch2, ch3, ch4])
    db.session.flush()

    g1 = LevelGame(
        course_id="c1", assigned_lesson="1.1a", challenge_slug="ch-1", progression_order=10101,
        game_name="Game 1.1a", game_url="https://g.com/1", rating=4.0, verified=True
    )
    g2 = LevelGame(
        course_id="c1", assigned_lesson="1.1b", challenge_slug="ch-2", progression_order=10102,
        game_name="Game 1.1b", game_url="https://g.com/2", rating=4.5, verified=True
    )
    g3 = LevelGame(
        course_id="c1", assigned_lesson="1.2a", challenge_slug="ch-3", progression_order=10201,
        game_name="Game 1.2a", game_url="https://g.com/3", rating=5.0, verified=True
    )
    g4 = LevelGame(
        course_id="c1", assigned_lesson="2.1a", challenge_slug="ch-4", progression_order=20101,
        game_name="Game 2.1a-1", game_url="https://g.com/4", rating=4.8, verified=True
    )
    db.session.add_all([g1, g2, g3, g4])
    db.session.commit()

    # 2. Student with 0 completed levels: returns Dragon Drop fallback game
    res_zero = get_student_sandbox_games(sample_user, classroom)
    assert res_zero["sandbox_active"] is True
    assert len(res_zero["games"]) == 1
    assert res_zero["games"][0]["game_name"] == "Dragon Drop"
    assert res_zero["message"] == "Complete your first challenge to unlock more games!"

    # 3. Student has completed challenges up to sequence 4
    log = ChallengeLog(
        user_id=sample_user.id,
        domain="codecombat.com",
        challenge_slug="ch-4",
        course_id="c1",
    )
    db.session.add(log)
    db.session.commit()

    res_completed = get_student_sandbox_games(sample_user, classroom)
    assert res_completed["sandbox_active"] is True
    # With 4 eligible games, exactly 3 are selected
    assert len(res_completed["games"]) == 3
    assert res_completed["message"] is None


def test_get_student_sandbox_games_zero_completions(init_db, sample_user):
    classroom = Classroom(id="class_zc", name="Zero Completions Room", language="python", sandbox_active=True)
    course = Course(id="c_zc", name="CS Zero", domain="codecombat.com")
    db.session.add_all([classroom, course])
    db.session.flush()

    ci = CourseInstance(id="ci_zc", classroom_id=classroom.id, course_id=course.id)
    db.session.add(ci)

    game = LevelGame(
        course_id="c_zc", assigned_lesson="1.1a", challenge_slug="ch-zc",
        progression_order=10101, game_name="Some Game", game_url="https://g.com/1", verified=True
    )
    db.session.add(game)
    db.session.commit()

    res = get_student_sandbox_games(sample_user, classroom)
    assert res["sandbox_active"] is True
    assert len(res["games"]) == 1
    fallback = res["games"][0]
    assert fallback["game_name"] == "Dragon Drop"
    assert fallback["game_url"] == "https://www.roomrecess.com/games/DragonDrop/play.html"
    assert fallback["platform"] == "Room Recess"
    assert fallback["requires_account"] is False
    assert fallback["verified"] is True
    assert res["message"] == "Complete your first challenge to unlock more games!"


def test_get_student_sandbox_games_returns_exactly_three(init_db, sample_user):
    classroom = Classroom(id="class_e3", name="Exact 3 Room", language="python", sandbox_active=True)
    course = Course(id="c_e3", name="CS Exact", domain="codecombat.com")
    db.session.add_all([classroom, course])
    db.session.flush()

    ci = CourseInstance(id="ci_e3", classroom_id=classroom.id, course_id=course.id)
    db.session.add(ci)

    # 5 challenges, completed by student
    for i in range(1, 6):
        ch = Challenge(name=f"Challenge {i}", slug=f"ch-e3-{i}", domain="codecombat.com", sequence=i, course_id="c_e3")
        db.session.add(ch)
        log = ChallengeLog(user_id=sample_user.id, domain="codecombat.com", challenge_slug=f"ch-e3-{i}", course_id="c_e3")
        db.session.add(log)

    # 5 eligible games
    for i in range(1, 6):
        g = LevelGame(
            course_id="c_e3",
            assigned_lesson=f"1.{i}a",
            challenge_slug=f"ch-e3-{i}",
            progression_order=10000 + i * 100,
            game_name=f"Game E3-{i}",
            game_url=f"https://g.com/e3-{i}",
            rating=float(i),
            verified=True,
        )
        db.session.add(g)

    db.session.commit()

    res = get_student_sandbox_games(sample_user, classroom)
    assert res["sandbox_active"] is True
    assert len(res["games"]) == 3
    # Verify all 3 games are unique
    game_names = [g["game_name"] for g in res["games"]]
    assert len(set(game_names)) == 3


def test_get_student_sandbox_games_daily_seed_stable(init_db, sample_user):
    classroom = Classroom(id="class_seed", name="Seed Room", language="python", sandbox_active=True)
    course = Course(id="c_seed", name="CS Seed", domain="codecombat.com")
    db.session.add_all([classroom, course])
    db.session.flush()

    ci = CourseInstance(id="ci_seed", classroom_id=classroom.id, course_id=course.id)
    db.session.add(ci)

    # 6 challenges, completed by student
    for i in range(1, 7):
        ch = Challenge(name=f"Ch {i}", slug=f"ch-seed-{i}", domain="codecombat.com", sequence=i, course_id="c_seed")
        db.session.add(ch)
        log = ChallengeLog(user_id=sample_user.id, domain="codecombat.com", challenge_slug=f"ch-seed-{i}", course_id="c_seed")
        db.session.add(log)
        g = LevelGame(
            course_id="c_seed",
            assigned_lesson=f"1.{i}a",
            challenge_slug=f"ch-seed-{i}",
            progression_order=10000 + i * 100,
            game_name=f"Game Seed {i}",
            game_url=f"https://g.com/seed-{i}",
            rating=float(i),
            verified=True,
        )
        db.session.add(g)

    db.session.commit()

    res1 = get_student_sandbox_games(sample_user, classroom)
    res2 = get_student_sandbox_games(sample_user, classroom)
    assert [g["game_name"] for g in res1["games"]] == [g["game_name"] for g in res2["games"]]


def test_get_student_sandbox_games_fewer_than_three(init_db, sample_user):
    classroom = Classroom(id="class_few", name="Few Room", language="python", sandbox_active=True)
    course = Course(id="c_few", name="CS Few", domain="codecombat.com")
    db.session.add_all([classroom, course])
    db.session.flush()

    ci = CourseInstance(id="ci_few", classroom_id=classroom.id, course_id=course.id)
    db.session.add(ci)

    ch1 = Challenge(name="Ch 1", slug="ch-few-1", domain="codecombat.com", sequence=1, course_id="c_few")
    ch2 = Challenge(name="Ch 2", slug="ch-few-2", domain="codecombat.com", sequence=2, course_id="c_few")
    db.session.add_all([ch1, ch2])
    db.session.flush()

    # Student completed sequence 1 only
    log = ChallengeLog(user_id=sample_user.id, domain="codecombat.com", challenge_slug="ch-few-1", course_id="c_few")
    db.session.add(log)

    # 1 game bound to seq 1 (eligible), 1 game bound to seq 2 (ineligible)
    g1 = LevelGame(course_id="c_few", assigned_lesson="1.1a", challenge_slug="ch-few-1", progression_order=10101, game_name="Unlocked Game 1", game_url="https://g.com/1", verified=True)
    g2 = LevelGame(course_id="c_few", assigned_lesson="1.2a", challenge_slug="ch-few-2", progression_order=10201, game_name="Locked Game 2", game_url="https://g.com/2", verified=True)
    db.session.add_all([g1, g2])
    db.session.commit()

    # Case: Exactly 1 game eligible -> returns 1 game without error or backfill
    res = get_student_sandbox_games(sample_user, classroom)
    assert res["sandbox_active"] is True
    assert len(res["games"]) == 1
    assert res["games"][0]["game_name"] == "Unlocked Game 1"

    # Case: Exactly 2 games eligible
    g2.challenge_slug = "ch-few-1"  # now bound to sequence 1 as well
    db.session.commit()
    res2 = get_student_sandbox_games(sample_user, classroom)
    assert res2["sandbox_active"] is True
    assert len(res2["games"]) == 2

    # Case: 0 eligible games exist but student has completions
    g1.verified = False
    g2.verified = False
    db.session.commit()
    res_zero_eligible = get_student_sandbox_games(sample_user, classroom)
    assert res_zero_eligible["sandbox_active"] is True
    assert res_zero_eligible["games"] == []
    assert res_zero_eligible["message"] == "No games assigned to your current progress level yet."


def test_sandbox_routes_admin_operations(client, sample_admin, sample_user):
    # Non-admin cannot upload or access admin routes
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
    resp = client.get("/api/admin/level-games")
    assert resp.status_code == 403

    # Log in as admin
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    # 1. Download sample CSV
    resp_sample = client.get("/api/admin/level-games/sample-csv")
    assert resp_sample.status_code == 200
    assert "text/csv" in resp_sample.content_type
    assert b"Assigned Lesson" in resp_sample.data
    assert b"Challenge Slug" in resp_sample.data

    # Seed course and challenges so uploaded games can be associated
    course = Course(id="course_cs1", name="CS1", domain="codecombat.com")
    ch_a = Challenge(name="Ch A", slug="ch-a", domain="codecombat.com", sequence=1, course_id="course_cs1")
    ch_b = Challenge(name="Ch B", slug="ch-b", domain="codecombat.com", sequence=2, course_id="course_cs1")
    db.session.add_all([course, ch_a, ch_b])
    db.session.commit()

    # 2. Upload CSV
    csv_content = (
        b"Title,Link,Assigned Lesson,Chapter,Chapter Name,Platform,Comment,RequiresAccount,Rating,Verified,Challenge Slug\n"
        b"Game A,https://games.com/a,1.1a,1,CS1,Web,Note,False,5.0,True,ch-a\n"
        b"Game B,https://games.com/b,1.1a,1,CS1,Web,Note,False,4.0,True,ch-b\n"
    )
    data = {"file": (io.BytesIO(csv_content), "test_games.csv")}
    resp_upload = client.post(
        "/api/admin/level-games/upload-csv",
        data=data,
        content_type="multipart/form-data",
    )
    assert resp_upload.status_code == 200
    json_data = resp_upload.get_json()
    assert json_data["success"] is True
    assert json_data["inserted"] == 2

    # 3. GET level games
    resp_list = client.get("/api/admin/level-games")
    assert resp_list.status_code == 200
    assert resp_list.get_json()["count"] == 2

    # 4. DELETE level games
    resp_del = client.delete("/api/admin/level-games")
    assert resp_del.status_code == 200
    assert resp_del.get_json()["deleted"] == 2

    resp_after = client.get("/api/admin/level-games")
    assert resp_after.get_json()["count"] == 0


def test_sandbox_toggle_and_status(client, sample_admin, sample_user):
    classroom = Classroom(id="class_toggle_test", name="Sandbox Room", language="python")
    db.session.add(classroom)
    db.session.commit()

    # Log in as admin
    with client.session_transaction() as sess:
        sess["user"] = sample_admin.id

    # Toggle ON
    with patch("application.extensions.socketio.emit") as mock_emit:
        resp_toggle = client.post(
            f"/api/admin/classrooms/{classroom.id}/sandbox/toggle",
            json={"sandbox_active": True},
        )
        assert resp_toggle.status_code == 200
        assert resp_toggle.get_json()["sandbox_active"] is True

        # Verify Socket.IO emitted sandbox_status_changed
        status_calls = [
            call for call in mock_emit.call_args_list if call[0][0] == "sandbox_status_changed"
        ]
        assert len(status_calls) > 0
        assert status_calls[0][1]["room"] == f"classroom:{classroom.id}"

    # Verify announcement message was created
    msg = (
        Message.query.filter(
            Message.content.contains("🎉 All Tests Passed! Sandbox Mode is now active!")
        ).first()
    )
    assert msg is not None
    assert classroom in msg.target_classrooms

    # Check status endpoint
    resp_status = client.get(f"/api/classrooms/{classroom.id}/sandbox-status")
    assert resp_status.status_code == 200
    status_json = resp_status.get_json()
    assert status_json["sandbox_active"] is True
    assert status_json["activated_at"] is not None

    # Toggle OFF
    resp_toggle_off = client.post(
        f"/api/admin/classrooms/{classroom.id}/sandbox/toggle",
        json={"sandbox_active": False},
    )
    assert resp_toggle_off.status_code == 200
    assert resp_toggle_off.get_json()["sandbox_active"] is False

    resp_status_off = client.get(f"/api/classrooms/{classroom.id}/sandbox-status")
    assert resp_status_off.get_json()["sandbox_active"] is False
    assert resp_status_off.get_json()["activated_at"] is None


def test_student_sandbox_games_route(client, sample_user):
    classroom = Classroom(id="class_student_test", name="Room", language="python")
    classroom.sandbox_active = True
    course = Course(id="course_student_route", name="CS Route", domain="codecombat.com")
    db.session.add_all([classroom, course])
    db.session.flush()

    ci = CourseInstance(id="ci_student_route", classroom_id=classroom.id, course_id=course.id)
    db.session.add(ci)

    game = LevelGame(
        course_id=course.id,
        assigned_lesson="1.1a",
        challenge_slug="ch-route",
        progression_order=10101,
        game_name="Game S",
        game_url="https://games.com/s",
        verified=True,
    )
    db.session.add(game)
    db.session.commit()

    # Unauthenticated
    resp_unauth = client.get(f"/api/student/classrooms/{classroom.id}/sandbox-games")
    assert resp_unauth.status_code == 401

    # Log in as student
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    resp = client.get(f"/api/student/classrooms/{classroom.id}/sandbox-games")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["sandbox_active"] is True
    # Student with 0 completions receives fallback Dragon Drop
    assert len(data["games"]) == 1
    assert data["games"][0]["game_name"] == "Dragon Drop"


def test_algorithm_edge_cases_and_one_to_many(init_db, sample_user):
    """
    Tests edge cases for level_game_service according to the new behavioural contract:
    - Case a: >=3 games eligible -> show exactly 3 (daily-seeded, weighted by rating)
    - Case b: 1 game eligible -> show exactly 1 game (no backfilling)
    - Case c: 2 games eligible -> show exactly 2 games (no backfilling)
    - Case d: 0 games eligible but student has completions -> return empty list with informational message
    - Case e: 0 completed levels -> returns Dragon Drop fallback game
    """
    classroom = Classroom(id="class_algo_test", name="Algo Classroom", language="python", sandbox_active=True)
    db.session.add(classroom)

    course = Course(id="course_algo", name="Algo Course", domain="codecombat.com")
    db.session.add(course)
    db.session.flush()

    ci = CourseInstance(id="ci_algo", classroom_id=classroom.id, course_id=course.id)
    db.session.add(ci)
    db.session.commit()

    # Create challenges seq 1 to 5
    for i in range(1, 6):
        ch = Challenge(name=f"Challenge {i}", slug=f"ch-algo-{i}", domain="codecombat.com", sequence=i, course_id="course_algo")
        db.session.add(ch)
    db.session.commit()

    # --- Scenario Case A: >=3 games eligible -> show exactly 3 ---
    # Student completed sequence 5
    for i in range(1, 6):
        log = ChallengeLog(user_id=sample_user.id, domain="codecombat.com", challenge_slug=f"ch-algo-{i}", course_id="course_algo")
        db.session.add(log)

    # 4 games bound to challenge sequence 5
    g1 = LevelGame(course_id="course_algo", assigned_lesson="5.1a", challenge_slug="ch-algo-5", progression_order=50101, game_name="Game 5.1a-1", game_url="https://g.com/51a-1", rating=4.9, verified=True)
    g2 = LevelGame(course_id="course_algo", assigned_lesson="5.1a", challenge_slug="ch-algo-5", progression_order=50101, game_name="Game 5.1a-2", game_url="https://g.com/51a-2", rating=4.8, verified=True)
    g3 = LevelGame(course_id="course_algo", assigned_lesson="5.1a", challenge_slug="ch-algo-5", progression_order=50101, game_name="Game 5.1a-3", game_url="https://g.com/51a-3", rating=4.7, verified=True)
    g4 = LevelGame(course_id="course_algo", assigned_lesson="5.1a", challenge_slug="ch-algo-5", progression_order=50101, game_name="Game 5.1a-4", game_url="https://g.com/51a-4", rating=4.6, verified=True)
    db.session.add_all([g1, g2, g3, g4])
    db.session.commit()

    res_a = get_student_sandbox_games(sample_user, classroom)
    assert res_a["sandbox_active"] is True
    # Exactly 3 games returned from the 4 eligible
    assert len(res_a["games"]) == 3

    # Clean up games and logs for scenario B
    LevelGame.query.delete()
    for cl in ChallengeLog.query.filter_by(user_id=sample_user.id).all():
        db.session.delete(cl)
    db.session.commit()

    # --- Scenario Case B: 1 game eligible -> show exactly 1 game without backfill ---
    log_1 = ChallengeLog(user_id=sample_user.id, domain="codecombat.com", challenge_slug="ch-algo-1", course_id="course_algo")
    db.session.add(log_1)

    # 1 game bound to seq 1 (eligible), 1 game bound to seq 2 (ineligible)
    g_b1 = LevelGame(course_id="course_algo", assigned_lesson="1.1a", challenge_slug="ch-algo-1", progression_order=10101, game_name="Solo Game", game_url="https://g.com/solo", rating=5.0, verified=True)
    g_b2 = LevelGame(course_id="course_algo", assigned_lesson="1.2a", challenge_slug="ch-algo-2", progression_order=10201, game_name="Locked 2", game_url="https://g.com/locked2", rating=4.0, verified=True)
    db.session.add_all([g_b1, g_b2])
    db.session.commit()

    res_b = get_student_sandbox_games(sample_user, classroom)
    assert res_b["sandbox_active"] is True
    assert len(res_b["games"]) == 1
    assert res_b["games"][0]["game_name"] == "Solo Game"

    # Clean up for scenario C
    LevelGame.query.delete()
    for cl in ChallengeLog.query.filter_by(user_id=sample_user.id).all():
        db.session.delete(cl)
    db.session.commit()

    # --- Scenario Case C: 2 games eligible -> show exactly 2 games without backfill ---
    log_2 = ChallengeLog(user_id=sample_user.id, domain="codecombat.com", challenge_slug="ch-algo-2", course_id="course_algo")
    db.session.add(log_2)

    g_c1 = LevelGame(course_id="course_algo", assigned_lesson="1.1a", challenge_slug="ch-algo-1", progression_order=10101, game_name="Game C1", game_url="https://g.com/c1", rating=4.5, verified=True)
    g_c2 = LevelGame(course_id="course_algo", assigned_lesson="1.2a", challenge_slug="ch-algo-2", progression_order=10201, game_name="Game C2", game_url="https://g.com/c2", rating=4.6, verified=True)
    g_c3 = LevelGame(course_id="course_algo", assigned_lesson="1.3a", challenge_slug="ch-algo-3", progression_order=10301, game_name="Game C3", game_url="https://g.com/c3", rating=4.7, verified=True)
    db.session.add_all([g_c1, g_c2, g_c3])
    db.session.commit()

    res_c = get_student_sandbox_games(sample_user, classroom)
    assert res_c["sandbox_active"] is True
    # Student completed seq 2, so seq 1 and seq 2 games are eligible -> 2 games
    assert len(res_c["games"]) == 2
    names_c = {g["game_name"] for g in res_c["games"]}
    assert names_c == {"Game C1", "Game C2"}
    assert "Game C3" not in names_c

    # Clean up for scenario D
    LevelGame.query.delete()
    for cl in ChallengeLog.query.filter_by(user_id=sample_user.id).all():
        db.session.delete(cl)
    db.session.commit()

    # --- Scenario Case D: Student with 0 completed levels -> Dragon Drop fallback game ---
    g_d_1 = LevelGame(course_id="course_algo", assigned_lesson="1.1a", challenge_slug="ch-algo-1", progression_order=10101, game_name="Game 1.1a-1", game_url="https://g.com/11a-1", verified=True)
    db.session.add(g_d_1)
    db.session.commit()

    res_d = get_student_sandbox_games(sample_user, classroom)
    assert res_d["sandbox_active"] is True
    assert len(res_d["games"]) == 1
    assert res_d["games"][0]["game_name"] == "Dragon Drop"
    assert res_d["message"] == "Complete your first challenge to unlock more games!"


def test_csv_ingestion_exact_user_columns_and_one_to_many(init_db):
    """
    Tests CSV ingestion with user's exact columns:
    Title, Link, Assigned Lesson, Chapter, Chapter Name, Platform, Comment, RequiresAccount, Rating, Verified.
    Verifies 1-to-many lesson mapping in CSV, type conversions, defaults, and course resolution.
    """
    course = Course(id="course_intro_cs", name="Introduction to Computer Science", domain="codecombat.com")
    db.session.add(course)
    db.session.commit()

    csv_data = """Title,Link,Assigned Lesson,Chapter,Chapter Name,Platform,Comment,RequiresAccount,Rating,Verified
Space Maze 1,https://arcade.com/play/space1,5.1a,5,Introduction to Computer Science,Web,Fun introductory game,False,4.9,True
Space Maze 2,https://arcade.com/play/space2,5.1a,5,Introduction to Computer Science,Web,Companion game for 5.1a,True,4.7,True
Dungeon Runner,https://arcade.com/play/dungeon,5.1b,5,Introduction to Computer Science,PC,Challenging maze,False,4.5,False
Castle Quest,https://arcade.com/play/castle,5.2,5,Introduction to Computer Science,Web,Defaults verified to true,False,5.0,
"""
    result = ingest_games_csv(csv_data, replace_all=True)
    assert result["success"] is True
    assert result["total_rows"] == 4
    assert result["inserted"] == 4
    assert len(result["errors"]) == 0

    games = LevelGame.query.order_by(LevelGame.progression_order.asc(), LevelGame.game_name.asc()).all()
    assert len(games) == 4

    # 1-to-many lesson mapping: Space Maze 1 & Space Maze 2 both on 5.1a
    g1 = games[0]
    assert g1.game_name == "Space Maze 1"
    assert g1.game_url == "https://arcade.com/play/space1"
    assert g1.assigned_lesson == "5.1a"
    assert g1.chapter == 5
    assert g1.course_id == "course_intro_cs"
    assert g1.platform == "Web"
    assert g1.comment == "Fun introductory game"
    assert g1.requires_account is False
    assert g1.rating == 4.9
    assert g1.verified is True

    g2 = games[1]
    assert g2.game_name == "Space Maze 2"
    assert g2.assigned_lesson == "5.1a"
    assert g2.requires_account is True
    assert g2.rating == 4.7
    assert g2.verified is True

    g3 = games[2]
    assert g3.game_name == "Dungeon Runner"
    assert g3.assigned_lesson == "5.1b"
    assert g3.platform == "PC"
    assert g3.verified is False

    # Default verified when empty
    g4 = games[3]
    assert g4.game_name == "Castle Quest"
    assert g4.assigned_lesson == "5.2"
    assert g4.verified is True
    assert g4.rating == 5.0


def test_csv_ingestion_security_url_validation(init_db):
    """
    Verifies rejection of invalid or malicious URLs:
    - javascript:... (XSS vectors)
    - data:...
    - ftp:...
    - file:...
    - Empty domain or invalid format
    """
    course = Course(id="course_cs1", name="CS1", domain="codecombat.com")
    db.session.add(course)
    db.session.commit()

    csv_data = """Title,Link,Assigned Lesson,Chapter,Chapter Name,Platform,Comment,RequiresAccount,Rating,Verified
Valid Game,https://games.com/valid,1.1a,1,CS1,Web,Safe,False,4.5,True
XSS Game 1,javascript:alert(document.domain),1.1b,1,CS1,Web,Attack,False,1.0,True
XSS Game 2,javascript:void(0),1.2a,1,CS1,Web,Attack,False,1.0,True
Data Scheme,data:text/html,<script>alert(1)</script>,1.2b,1,CS1,Web,Attack,False,1.0,True
FTP Protocol,ftp://ftp.example.com/game,1.3a,1,CS1,Web,Unsupported,False,2.0,True
File Protocol,file:///etc/passwd,1.3b,1,CS1,Web,Local file,False,1.0,True
Empty Domain,https://,1.4a,1,CS1,Web,Bad domain,False,1.0,True
Injection Tag,https://games.com/<script>alert(1)</script>,1.4b,1,CS1,Web,Tag injection,False,1.0,True
Valid Game 2,http://games.com/valid2,1.5a,1,CS1,Web,Safe HTTP,False,4.0,True
"""
    result = ingest_games_csv(csv_data, replace_all=True)
    assert result["success"] is True
    assert result["total_rows"] == 9
    assert result["inserted"] == 2
    assert len(result["errors"]) == 7

    for err in result["errors"]:
        assert "Invalid URL" in err

    inserted_names = [g.game_name for g in LevelGame.query.all()]
    assert inserted_names == ["Valid Game", "Valid Game 2"]


def test_api_authorization_matrix(client, sample_admin, sample_user):
    """
    Verifies full authorization matrix:
    - Admin-only endpoints reject unauthenticated requests with 401.
    - Admin-only endpoints reject non-admin authenticated users with 403.
    - Student-only endpoints reject unauthenticated requests with 401.
    - Student-only endpoints allow authenticated students with 200.
    """
    classroom = Classroom(id="class_auth_test", name="Auth Class", language="python", sandbox_active=True)
    db.session.add(classroom)
    db.session.commit()

    admin_routes = [
        ("POST", f"/api/admin/classrooms/{classroom.id}/sandbox/toggle", {"sandbox_active": True}),
        ("POST", "/api/admin/level-games/upload-csv", None),
        ("GET", "/api/admin/level-games", None),
        ("DELETE", "/api/admin/level-games", None),
        ("GET", "/api/admin/level-games/sample-csv", None),
    ]

    # 1. Unauthenticated -> 401 for all admin routes
    for method, path, data in admin_routes:
        if method == "POST":
            resp = client.post(path, json=data) if data else client.post(path)
        elif method == "GET":
            resp = client.get(path)
        elif method == "DELETE":
            resp = client.delete(path)
        assert resp.status_code == 401, f"Expected 401 for unauthenticated {method} {path}, got {resp.status_code}"

    # 2. Non-admin student -> 403 for all admin routes
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    for method, path, data in admin_routes:
        if method == "POST":
            resp = client.post(path, json=data) if data else client.post(path)
        elif method == "GET":
            resp = client.get(path)
        elif method == "DELETE":
            resp = client.delete(path)
        assert resp.status_code == 403, f"Expected 403 for non-admin {method} {path}, got {resp.status_code}"

    # 3. Student endpoint unauthenticated -> 401
    with client.session_transaction() as sess:
        sess.clear()

    resp_student_unauth = client.get(f"/api/student/classrooms/{classroom.id}/sandbox-games")
    assert resp_student_unauth.status_code == 401

    # 4. Student endpoint authenticated -> 200
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    resp_student_auth = client.get(f"/api/student/classrooms/{classroom.id}/sandbox-games")
    assert resp_student_auth.status_code == 200

