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
    assert saved.progression_order == 10202

    d = saved.to_dict()
    assert d["id"] == saved.id
    assert d["game_name"] == "Maze Runner"
    assert d["game_url"] == "https://example.com/play/maze"
    assert d["assigned_lesson"] == "1.2b"
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

    # Add LevelGames: 1.1a (1 game), 1.1b (1 game), 1.2a (1 game), 2.1a (2 games)
    g1 = LevelGame(
        course_id="c1", assigned_lesson="1.1a", progression_order=10101,
        game_name="Game 1.1a", game_url="https://g.com/1", verified=True
    )
    g2 = LevelGame(
        course_id="c1", assigned_lesson="1.1b", progression_order=10102,
        game_name="Game 1.1b", game_url="https://g.com/2", verified=True
    )
    g3 = LevelGame(
        course_id="c1", assigned_lesson="1.2a", progression_order=10201,
        game_name="Game 1.2a", game_url="https://g.com/3", verified=True
    )
    g4 = LevelGame(
        course_id="c1", assigned_lesson="2.1a", progression_order=20101,
        game_name="Game 2.1a-1", game_url="https://g.com/4", verified=True
    )
    g5 = LevelGame(
        course_id="c1", assigned_lesson="2.1a", progression_order=20101,
        game_name="Game 2.1a-2", game_url="https://g.com/5", verified=True
    )
    db.session.add_all([g1, g2, g3, g4, g5])
    db.session.commit()

    # 2. Student with 0 completed levels: fallback to earliest milestone games, min 3 games
    res_zero = get_student_sandbox_games(sample_user, classroom)
    assert res_zero["sandbox_active"] is True
    assert res_zero["highest_milestone"] == "1.1a"
    assert len(res_zero["games"]) >= 3

    # 3. Student has completed challenges for 2.1a
    ch = Challenge(
        name="Challenge 2.1a",
        slug="challenge-2-1a",
        domain="codecombat.com",
        sequence=4,
        course_id="c1",
    )
    db.session.add(ch)
    db.session.flush()

    log = ChallengeLog(
        user_id=sample_user.id,
        domain="codecombat.com",
        challenge_slug="challenge-2-1a",
        course_id="c1",
    )
    db.session.add(log)
    db.session.commit()

    res_completed = get_student_sandbox_games(sample_user, classroom)
    assert res_completed["sandbox_active"] is True
    # Highest milestone should be 2.1a (due to direct match or sequence)
    assert res_completed["highest_milestone"] == "2.1a"
    # 2.1a has 2 games, so algorithm steps back to preceding milestone 1.2a to get >= 3 games!
    assert len(res_completed["games"]) == 3
    game_names = [g["game_name"] for g in res_completed["games"]]
    assert "Game 2.1a-1" in game_names
    assert "Game 2.1a-2" in game_names
    assert "Game 1.2a" in game_names


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

    # 2. Upload CSV
    csv_content = (
        b"Title,Link,Assigned Lesson,Chapter,Chapter Name,Platform,Comment,RequiresAccount,Rating,Verified\n"
        b"Game A,https://games.com/a,1.1a,1,CS1,Web,Note,False,5.0,True\n"
        b"Game B,https://games.com/b,1.1a,1,CS1,Web,Note,False,4.0,True\n"
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
    db.session.add(classroom)

    game = LevelGame(
        assigned_lesson="1.1a",
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
    assert len(data["games"]) >= 1
    assert data["games"][0]["game_name"] == "Game S"


def test_algorithm_edge_cases_and_one_to_many(init_db, sample_user):
    """
    Tests edge cases for level_game_service:
    - 1-to-many mapping: multiple games for 5.1a
    - Case a: Highest completed lesson has >= 3 games (verify all >= 3 games returned)
    - Case b: Highest completed lesson has 1 game, preceding has 2 games (verify 3 games returned across 2 lessons)
    - Case c: Highest completed lesson has 2 games, preceding has 2 games (verify 4 games returned, not truncated to 3)
    - Case d: Student with 0 completed levels (verify fallback earliest games)
    """
    classroom = Classroom(id="class_algo_test", name="Algo Classroom", language="python", sandbox_active=True)
    db.session.add(classroom)

    course = Course(id="course_algo", name="Algo Course", domain="codecombat.com")
    db.session.add(course)
    db.session.flush()

    ci = CourseInstance(id="ci_algo", classroom_id=classroom.id, course_id=course.id)
    db.session.add(ci)
    db.session.commit()

    # --- Scenario Case A: Highest completed lesson has >= 3 games (and 1-to-many mapping) ---
    # 4 games mapped to 5.1a, 2 games mapped to 4.2
    g_42_1 = LevelGame(course_id="course_algo", assigned_lesson="4.2", progression_order=40200, game_name="Game 4.2-1", game_url="https://g.com/42-1", verified=True)
    g_42_2 = LevelGame(course_id="course_algo", assigned_lesson="4.2", progression_order=40200, game_name="Game 4.2-2", game_url="https://g.com/42-2", verified=True)
    g_51a_1 = LevelGame(course_id="course_algo", assigned_lesson="5.1a", progression_order=50101, game_name="Game 5.1a-1", game_url="https://g.com/51a-1", verified=True)
    g_51a_2 = LevelGame(course_id="course_algo", assigned_lesson="5.1a", progression_order=50101, game_name="Game 5.1a-2", game_url="https://g.com/51a-2", verified=True)
    g_51a_3 = LevelGame(course_id="course_algo", assigned_lesson="5.1a", progression_order=50101, game_name="Game 5.1a-3", game_url="https://g.com/51a-3", verified=True)
    g_51a_4 = LevelGame(course_id="course_algo", assigned_lesson="5.1a", progression_order=50101, game_name="Game 5.1a-4", game_url="https://g.com/51a-4", verified=True)
    db.session.add_all([g_42_1, g_42_2, g_51a_1, g_51a_2, g_51a_3, g_51a_4])
    db.session.commit()

    # Student completed 5.1a
    log_51a = ChallengeLog(user_id=sample_user.id, domain="codecombat.com", challenge_slug="lesson-5-1a", course_id="course_algo")
    db.session.add(log_51a)
    db.session.commit()

    res_a = get_student_sandbox_games(sample_user, classroom)
    assert res_a["sandbox_active"] is True
    assert res_a["highest_milestone"] == "5.1a"
    # Case a requirement: all >= 3 games from that lesson are returned (in this case all 4)
    assert len(res_a["games"]) == 4
    names_a = {g["game_name"] for g in res_a["games"]}
    assert names_a == {"Game 5.1a-1", "Game 5.1a-2", "Game 5.1a-3", "Game 5.1a-4"}
    # Preceding milestone games (4.2) should NOT be included since 5.1a alone has >= 3 games
    assert "Game 4.2-1" not in names_a

    # Clean up games and logs for scenario B
    LevelGame.query.delete()
    ChallengeLog.query.filter_by(user_id=sample_user.id).delete()
    db.session.commit()

    # --- Scenario Case B: Highest completed lesson has 1 game, preceding has 2 games ---
    # Preceding lesson 5.1a has 2 games; highest completed lesson 5.2 has 1 game
    g_b_pre1 = LevelGame(course_id="course_algo", assigned_lesson="5.1a", progression_order=50101, game_name="Game 5.1a-A", game_url="https://g.com/51a-a", verified=True)
    g_b_pre2 = LevelGame(course_id="course_algo", assigned_lesson="5.1a", progression_order=50101, game_name="Game 5.1a-B", game_url="https://g.com/51a-b", verified=True)
    g_b_high = LevelGame(course_id="course_algo", assigned_lesson="5.2", progression_order=50200, game_name="Game 5.2-Solo", game_url="https://g.com/52-solo", verified=True)
    db.session.add_all([g_b_pre1, g_b_pre2, g_b_high])

    log_52 = ChallengeLog(user_id=sample_user.id, domain="codecombat.com", challenge_slug="challenge-5-2", course_id="course_algo")
    db.session.add(log_52)
    db.session.commit()

    res_b = get_student_sandbox_games(sample_user, classroom)
    assert res_b["sandbox_active"] is True
    assert res_b["highest_milestone"] == "5.2"
    # Case b requirement: 3 games returned across 2 lessons
    assert len(res_b["games"]) == 3
    names_b = {g["game_name"] for g in res_b["games"]}
    assert names_b == {"Game 5.2-Solo", "Game 5.1a-A", "Game 5.1a-B"}

    # Clean up for scenario C
    LevelGame.query.delete()
    ChallengeLog.query.filter_by(user_id=sample_user.id).delete()
    db.session.commit()

    # --- Scenario Case C: Highest completed lesson has 2 games, preceding has 2 games ---
    # Preceding lesson 5.2 has 2 games; highest completed lesson 6.1 has 2 games
    g_c_pre1 = LevelGame(course_id="course_algo", assigned_lesson="5.2", progression_order=50200, game_name="Game 5.2-1", game_url="https://g.com/52-1", verified=True)
    g_c_pre2 = LevelGame(course_id="course_algo", assigned_lesson="5.2", progression_order=50200, game_name="Game 5.2-2", game_url="https://g.com/52-2", verified=True)
    g_c_high1 = LevelGame(course_id="course_algo", assigned_lesson="6.1", progression_order=60100, game_name="Game 6.1-1", game_url="https://g.com/61-1", verified=True)
    g_c_high2 = LevelGame(course_id="course_algo", assigned_lesson="6.1", progression_order=60100, game_name="Game 6.1-2", game_url="https://g.com/61-2", verified=True)
    db.session.add_all([g_c_pre1, g_c_pre2, g_c_high1, g_c_high2])

    log_61 = ChallengeLog(user_id=sample_user.id, domain="codecombat.com", challenge_slug="challenge-6-1", course_id="course_algo")
    db.session.add(log_61)
    db.session.commit()

    res_c = get_student_sandbox_games(sample_user, classroom)
    assert res_c["sandbox_active"] is True
    assert res_c["highest_milestone"] == "6.1"
    # Case c requirement: 4 games returned, NOT truncated to 3!
    assert len(res_c["games"]) == 4
    names_c = {g["game_name"] for g in res_c["games"]}
    assert names_c == {"Game 6.1-1", "Game 6.1-2", "Game 5.2-1", "Game 5.2-2"}

    # Clean up for scenario D
    ChallengeLog.query.filter_by(user_id=sample_user.id).delete()
    LevelGame.query.delete()
    db.session.commit()

    # --- Scenario Case D: Student with 0 completed levels (fallback earliest games) ---
    g_d_1 = LevelGame(course_id="course_algo", assigned_lesson="1.1a", progression_order=10101, game_name="Game 1.1a-1", game_url="https://g.com/11a-1", verified=True)
    g_d_2 = LevelGame(course_id="course_algo", assigned_lesson="1.1a", progression_order=10101, game_name="Game 1.1a-2", game_url="https://g.com/11a-2", verified=True)
    g_d_3 = LevelGame(course_id="course_algo", assigned_lesson="1.2a", progression_order=10201, game_name="Game 1.2a-1", game_url="https://g.com/12a-1", verified=True)
    g_d_4 = LevelGame(course_id="course_algo", assigned_lesson="1.2a", progression_order=10201, game_name="Game 1.2a-2", game_url="https://g.com/12a-2", verified=True)
    g_d_5 = LevelGame(course_id="course_algo", assigned_lesson="2.1", progression_order=20100, game_name="Game 2.1-1", game_url="https://g.com/21-1", verified=True)
    db.session.add_all([g_d_1, g_d_2, g_d_3, g_d_4, g_d_5])
    db.session.commit()

    res_d = get_student_sandbox_games(sample_user, classroom)
    assert res_d["sandbox_active"] is True
    assert res_d["highest_milestone"] == "1.1a"
    # Fallback starts with earliest milestone (1.1a) and advances forward until >= 3
    # 1.1a (2 games) + 1.2a (2 games) = 4 games returned, all from earliest milestones
    assert len(res_d["games"]) == 4
    names_d = {g["game_name"] for g in res_d["games"]}
    assert "Game 1.1a-1" in names_d
    assert "Game 1.1a-2" in names_d
    assert "Game 1.2a-1" in names_d
    assert "Game 1.2a-2" in names_d
    assert "Game 2.1-1" not in names_d


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

