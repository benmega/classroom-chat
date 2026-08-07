from datetime import datetime, timedelta

from application.extensions import db
from application.models.achievements import Achievement
from application.models.challenge_log import ChallengeLog
from application.models.duck_trade import DuckTradeLog
from application.models.message import Message
from application.models.project import Project
from application.models.session_log import SessionLog
from application.models.user import User
from application.models.user_certificate import UserCertificate
from application.services.achievement_engine import (
    _calculate_consistency,
    check_achievement,
    evaluate_user,
    get_achievement_progress,
    longest_session_minutes,
)


def test_check_achievement_requirement_parsing(init_db, sample_user):
    achievement = Achievement(
        name="Invalid Requirement",
        slug="invalid-req",
        type="ducks",
        reward=10,
        requirement_value="abc",  # ValueError
    )
    db.session.add(achievement)
    db.session.commit()

    sample_user.earned_ducks = 5
    assert check_achievement(sample_user, achievement) is True  # 5 >= 0

    achievement.requirement_value = None  # TypeError
    db.session.commit()
    assert check_achievement(sample_user, achievement) is True  # 5 >= 0


def test_check_achievement_types_with_stats(init_db, sample_user):
    # Setup achievements of different types
    ach_ducks = Achievement(name="D", slug="d", type="ducks", requirement_value="10")
    ach_project = Achievement(name="P", slug="p", type="project", requirement_value="2")
    ach_progress = Achievement(
        name="PR", slug="pr", type="progress", requirement_value="80", source="python"
    )
    ach_chat = Achievement(name="C", slug="c", type="chat", requirement_value="5")
    ach_consistency = Achievement(
        name="CO", slug="co", type="consistency", requirement_value="3"
    )
    ach_community = Achievement(
        name="COM", slug="com", type="community", requirement_value="4"
    )
    ach_session = Achievement(
        name="S", slug="s", type="session", requirement_value="30"
    )
    ach_trade = Achievement(name="T", slug="t", type="trade", requirement_value="6")
    ach_cert = Achievement(
        name="CR", slug="cr", type="certificate", requirement_value="1"
    )
    ach_default = Achievement(
        name="DF", slug="df", type="unknown_type", requirement_value="1"
    )

    db.session.add_all(
        [
            ach_ducks,
            ach_project,
            ach_progress,
            ach_chat,
            ach_consistency,
            ach_community,
            ach_session,
            ach_trade,
            ach_cert,
            ach_default,
        ]
    )
    db.session.commit()

    sample_user.earned_ducks = 10
    assert check_achievement(sample_user, ach_ducks) is True

    # Project type
    proj1 = Project(name="Proj1", user_id=sample_user.id)
    proj2 = Project(name="Proj2", user_id=sample_user.id)
    db.session.add_all([proj1, proj2])
    db.session.commit()
    assert check_achievement(sample_user, ach_project) is True

    # Progress type
    class MockUser:
        def __init__(self):
            self.projects = []
            self.earned_ducks = 10
            self.id = 1

        def get_progress(self, source):
            if source == "python":
                return 85
            return 0

    mock_user = MockUser()
    assert check_achievement(mock_user, ach_progress) is True

    stats = {
        "chat_count": 5,
        "consistency_streak": 3,
        "community_count": 4,
        "max_session": 30,
        "trade_count": 6,
    }
    assert check_achievement(sample_user, ach_chat, stats=stats) is True
    assert check_achievement(sample_user, ach_consistency, stats=stats) is True
    assert check_achievement(sample_user, ach_community, stats=stats) is True
    assert check_achievement(sample_user, ach_session, stats=stats) is True
    assert check_achievement(sample_user, ach_trade, stats=stats) is True

    # Certificate type
    cert = UserCertificate(
        user_id=sample_user.id,
        achievement_id=ach_cert.id,
        url="http://example.com/cert.pdf",
        status="approved",
    )
    db.session.add(cert)
    db.session.commit()
    assert check_achievement(sample_user, ach_cert) is True

    # Unknown type should return False (or True if requirement is 0)
    assert check_achievement(sample_user, ach_default) is False


def test_check_achievement_types_no_stats(init_db, sample_user):
    ach_chat = Achievement(name="C", slug="c", type="chat", requirement_value="2")
    ach_community = Achievement(
        name="COM", slug="com", type="community", requirement_value="2"
    )
    ach_session = Achievement(
        name="S", slug="s", type="session", requirement_value="15"
    )
    ach_trade = Achievement(name="T", slug="t", type="trade", requirement_value="2")

    db.session.add_all([ach_chat, ach_community, ach_session, ach_trade])
    db.session.commit()

    m1 = Message(user_id=sample_user.id, content="Hi")
    m2 = Message(user_id=sample_user.id, content="Hello")
    db.session.add_all([m1, m2])
    db.session.commit()
    assert check_achievement(sample_user, ach_chat) is True

    # Make sure we use a unique helper name that is case insensitive
    cl1 = ChallengeLog(
        user_id=999,
        domain="x",
        challenge_slug="slug1",
        helper=sample_user.username.upper(),
    )
    cl2 = ChallengeLog(
        user_id=999,
        domain="x",
        challenge_slug="slug2",
        helper=sample_user.username.lower(),
    )
    db.session.add_all([cl1, cl2])
    db.session.commit()
    assert check_achievement(sample_user, ach_community) is True

    slog = SessionLog(
        user_id=sample_user.id,
        start_time=datetime.utcnow() - timedelta(minutes=20),
        end_time=datetime.utcnow(),
    )
    db.session.add(slog)
    db.session.commit()
    assert check_achievement(sample_user, ach_session) is True

    tlog1 = DuckTradeLog(
        user_id=sample_user.id,
        status="completed",
        digital_ducks=1,
        bit_ducks=[],
        byte_ducks=[],
    )
    tlog2 = DuckTradeLog(
        user_id=sample_user.id,
        status="completed",
        digital_ducks=1,
        bit_ducks=[],
        byte_ducks=[],
    )
    db.session.add_all([tlog1, tlog2])
    db.session.commit()
    assert check_achievement(sample_user, ach_trade) is True


def test_get_achievement_progress(init_db, sample_user):
    ach = Achievement(name="D", slug="d", type="ducks", requirement_value="50")
    db.session.add(ach)
    db.session.commit()

    sample_user.earned_ducks = 35
    val, req = get_achievement_progress(sample_user, ach)
    assert val == 35
    assert req == 50

    ach.requirement_value = "invalid"
    db.session.commit()
    val, req = get_achievement_progress(sample_user, ach)
    assert req == 0

    ach.type = "unknown"
    db.session.commit()
    val, req = get_achievement_progress(sample_user, ach)
    assert val == 0


def test_calculate_consistency(init_db, sample_user):
    # No logs
    assert _calculate_consistency(sample_user.id) == 0

    # isocalendar returns (year, week, weekday)
    # Let's generate dates in specific ISO weeks
    # Week 1, 2025: 2025-01-01 (is Wednesday, week 1)
    # Week 2, 2025: 2025-01-08
    # Week 4, 2025: 2025-01-22
    dt_w1 = datetime(2025, 1, 1)
    dt_w2 = datetime(2025, 1, 8)
    dt_w4 = datetime(2025, 1, 22)

    cl1 = ChallengeLog(
        user_id=sample_user.id, domain="x", challenge_slug="a", timestamp=dt_w1
    )
    cl2 = ChallengeLog(
        user_id=sample_user.id, domain="x", challenge_slug="b", timestamp=dt_w2
    )
    cl3 = ChallengeLog(
        user_id=sample_user.id, domain="x", challenge_slug="c", timestamp=dt_w4
    )
    db.session.add_all([cl1, cl2, cl3])
    db.session.commit()

    # Streak should be 2 (week 1 and 2), best_streak is 2
    assert _calculate_consistency(sample_user.id) == 2

    # Let's test year transition
    # Week 52, 2025: 2025-12-24
    # Week 1, 2026: 2026-01-01 (is Thursday, week 1)
    dt_w52 = datetime(2025, 12, 24)
    dt_w1_2026 = datetime(2026, 1, 1)

    cl4 = ChallengeLog(
        user_id=sample_user.id, domain="x", challenge_slug="d", timestamp=dt_w52
    )
    cl5 = ChallengeLog(
        user_id=sample_user.id, domain="x", challenge_slug="e", timestamp=dt_w1_2026
    )
    db.session.add_all([cl4, cl5])
    db.session.commit()

    # The entire sorted weeks set:
    # (2025, 1), (2025, 2), (2025, 4), (2025, 52), (2026, 1)
    # Streaks:
    # (2025, 1) -> (2025, 2) [streak = 2]
    # (2025, 2) -> (2025, 4) [reset, streak = 1]
    # (2025, 4) -> (2025, 52) [reset, streak = 1]
    # (2025, 52) -> (2026, 1) [streak = 2]
    assert _calculate_consistency(sample_user.id) == 2


def test_evaluate_user(init_db, sample_user):
    # Non-existent user
    assert evaluate_user(User(id=9999)) == []

    # Setup achievements
    ach1 = Achievement(
        name="D1", slug="d1", type="ducks", requirement_value="10", reward=5
    )
    ach2 = Achievement(
        name="D2", slug="d2", type="ducks", requirement_value="20", reward=10
    )
    db.session.add_all([ach1, ach2])
    db.session.commit()

    sample_user.earned_ducks = 11
    sample_user.duck_balance = 0
    db.session.commit()

    # First evaluation should award ach1 (11 >= 10)
    awards = evaluate_user(sample_user)
    assert len(awards) == 1
    assert awards[0].slug == "d1"
    assert sample_user.duck_balance == 5  # 5 reward
    assert sample_user.last_achievement_evaluation is not None

    from application.models.duck_transaction import DuckTransaction

    txs = DuckTransaction.query.filter_by(user_id=sample_user.id).all()
    assert len(txs) == 1
    assert txs[0].reason == "Achievement: D1"

    # Throttling test: evaluating again within 1 hour should return []
    awards = evaluate_user(sample_user)
    assert awards == []

    # Using force=True should evaluate again
    sample_user.earned_ducks = 25
    db.session.commit()
    awards = evaluate_user(sample_user, force=True)
    assert len(awards) == 1
    assert awards[0].slug == "d2"
    assert sample_user.duck_balance == 15  # 5 + 10 reward

    txs = (
        DuckTransaction.query.filter_by(user_id=sample_user.id)
        .order_by(DuckTransaction.id.asc())
        .all()
    )
    assert len(txs) == 2
    assert txs[1].reason == "Achievement: D2"


def test_longest_session_minutes(init_db, sample_user):
    # No logs
    assert longest_session_minutes(sample_user.id) == 0

    # Logs
    s1 = SessionLog(
        user_id=sample_user.id,
        start_time=datetime.utcnow() - timedelta(minutes=10),
        end_time=datetime.utcnow(),
    )
    s2 = SessionLog(
        user_id=sample_user.id,
        start_time=datetime.utcnow() - timedelta(minutes=30),
        end_time=None,
    )  # end_time=None uses utcnow
    db.session.add_all([s1, s2])
    db.session.commit()

    assert longest_session_minutes(sample_user.id) >= 29.9
