import logging
from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
from application.extensions import db
from application.models.achievements import Achievement, UserAchievement
from application.models.challenge_log import ChallengeLog
from application.models.duck_trade import DuckTradeLog
from application.models.message import Message
from application.models.project import Project
from application.models.session_log import SessionLog
from application.models.user import User
from application.models.user_certificate import UserCertificate
from sqlalchemy.exc import IntegrityError
from tests.factories import AchievementFactory, UserFactory


@pytest.fixture
def test_user(init_db):
    user = UserFactory()
    db.session.commit()
    return user

@pytest.fixture
def test_achievement(init_db):
    ach = AchievementFactory(type="ducks", requirement_value="100")
    db.session.commit()
    return ach

from application.services import achievement_engine
from application.services.achievement_engine import (
    _calculate_consistency,
    _current_value,
    _parse_requirement,
    check_achievement,
    compute_user_stats,
    evaluate_user,
    get_achievement_progress,
    longest_session_minutes,
)


@pytest.fixture(autouse=True)
def _reset_requirement_warnings():
    achievement_engine._warned_requirements.clear()
    yield
    achievement_engine._warned_requirements.clear()


def test_check_achievement_requirement_parsing(init_db, test_user):
    achievement = Achievement(
        name="Invalid Requirement",
        slug="invalid-req",
        type="ducks",
        reward=10,
        requirement_value="abc",  # ValueError
    )
    db.session.add(achievement)
    db.session.commit()

    # A mis-typed requirement must never unlock for everyone
    test_user.earned_ducks = 5
    assert check_achievement(test_user, achievement) is False

    achievement.requirement_value = None  # TypeError
    db.session.commit()
    assert check_achievement(test_user, achievement) is False

    achievement.requirement_value = ""
    db.session.commit()
    assert check_achievement(test_user, achievement) is False

    # An explicit, valid requirement still works (including an explicit 0)
    achievement.requirement_value = "5"
    db.session.commit()
    assert check_achievement(test_user, achievement) is True
    achievement.requirement_value = "0"
    db.session.commit()
    assert check_achievement(test_user, achievement) is True


def test_invalid_requirement_is_logged_once(init_db, test_user, caplog):
    achievement = Achievement(
        name="Broken", slug="broken-req", type="chat", requirement_value="ten"
    )
    db.session.add(achievement)
    db.session.commit()

    with caplog.at_level(logging.WARNING, logger=achievement_engine.logger.name):
        assert _parse_requirement(achievement) is None
        assert _parse_requirement(achievement) is None

    warnings = [r for r in caplog.records if "broken-req" in r.getMessage()]
    assert len(warnings) == 1
    assert "'ten'" in warnings[0].getMessage()
    assert "chat" in warnings[0].getMessage()


def test_certificate_without_requirement_needs_an_approved_certificate(
    init_db, test_user
):
    other = UserFactory()
    cert_ach = Achievement(
        name="Cert", slug="cert-null", type="certificate", requirement_value=None
    )
    blank_cert_ach = Achievement(
        name="Cert2", slug="cert-blank", type="certificate", requirement_value="  "
    )
    db.session.add_all([cert_ach, blank_cert_ach])
    db.session.commit()

    assert _parse_requirement(cert_ach) == 1
    assert _parse_requirement(blank_cert_ach) == 1

    # Not unlocked for a user without an approved certificate
    assert check_achievement(test_user, cert_ach) is False
    assert check_achievement(test_user, blank_cert_ach) is False
    assert get_achievement_progress(test_user, cert_ach) == (0, 1)

    db.session.add(
        UserCertificate(
            user_id=test_user.id,
            achievement_id=cert_ach.id,
            url="http://example.com/cert.pdf",
            status="approved",
        )
    )
    db.session.commit()
    assert check_achievement(test_user, cert_ach) is True
    assert get_achievement_progress(test_user, cert_ach) == (1, 1)
    # ...and still not for anyone else
    assert check_achievement(other, cert_ach) is False

    # A non-numeric certificate requirement is a mistake, not "no requirement"
    cert_ach.requirement_value = "abc"
    db.session.commit()
    assert _parse_requirement(cert_ach) is None
    assert check_achievement(test_user, cert_ach) is False


def test_evaluate_user_skips_achievement_with_invalid_requirement(init_db, test_user):
    db.session.add_all(
        [
            Achievement(
                name="Bad", slug="bad", type="ducks", reward=5, requirement_value="abc"
            ),
            Achievement(
                name="Missing", slug="missing", type="chat", reward=5,
                requirement_value=None,
            ),
            Achievement(
                name="Good", slug="good", type="ducks", reward=5, requirement_value="1"
            ),
        ]
    )
    test_user.earned_ducks = 3
    db.session.commit()

    awards = evaluate_user(test_user, force=True)

    assert [a.slug for a in awards] == ["good"]


def test_check_achievement_types_with_stats(init_db, test_user):
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

    test_user.earned_ducks = 10
    assert check_achievement(test_user, ach_ducks) is True

    # Project type
    proj1 = Project(name="Proj1", user_id=test_user.id)
    proj2 = Project(name="Proj2", user_id=test_user.id)
    db.session.add_all([proj1, proj2])
    db.session.commit()
    assert check_achievement(test_user, ach_project) is True

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
    assert check_achievement(test_user, ach_chat, stats=stats) is True
    assert check_achievement(test_user, ach_consistency, stats=stats) is True
    assert check_achievement(test_user, ach_community, stats=stats) is True
    assert check_achievement(test_user, ach_session, stats=stats) is True
    assert check_achievement(test_user, ach_trade, stats=stats) is True

    # Certificate type
    cert = UserCertificate(
        user_id=test_user.id,
        achievement_id=ach_cert.id,
        url="http://example.com/cert.pdf",
        status="approved",
    )
    db.session.add(cert)
    db.session.commit()
    assert check_achievement(test_user, ach_cert) is True

    # Unknown type should return False (or True if requirement is 0)
    assert check_achievement(test_user, ach_default) is False


def test_check_achievement_types_no_stats(init_db, test_user):
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

    m1 = Message(user_id=test_user.id, content="Hi")
    m2 = Message(user_id=test_user.id, content="Hello")
    db.session.add_all([m1, m2])
    db.session.commit()
    assert check_achievement(test_user, ach_chat) is True

    # Make sure we use a unique helper name that is case insensitive
    cl1 = ChallengeLog(
        user_id=999,
        domain="x",
        challenge_slug="slug1",
        helper=test_user.username.upper(),
    )
    cl2 = ChallengeLog(
        user_id=999,
        domain="x",
        challenge_slug="slug2",
        helper=test_user.username.lower(),
    )
    db.session.add_all([cl1, cl2])
    db.session.commit()
    assert check_achievement(test_user, ach_community) is True

    slog = SessionLog(
        user_id=test_user.id,
        start_time=datetime.utcnow() - timedelta(minutes=20),
        end_time=datetime.utcnow(),
    )
    db.session.add(slog)
    db.session.commit()
    assert check_achievement(test_user, ach_session) is True

    tlog1 = DuckTradeLog(
        user_id=test_user.id,
        status="completed",
        digital_ducks=1,
        bit_ducks=[],
        byte_ducks=[],
    )
    tlog2 = DuckTradeLog(
        user_id=test_user.id,
        status="completed",
        digital_ducks=1,
        bit_ducks=[],
        byte_ducks=[],
    )
    db.session.add_all([tlog1, tlog2])
    db.session.commit()
    assert check_achievement(test_user, ach_trade) is True


def test_get_achievement_progress(init_db, test_user):
    ach = Achievement(name="D", slug="d", type="ducks", requirement_value="50")
    db.session.add(ach)
    db.session.commit()

    test_user.earned_ducks = 35
    val, req = get_achievement_progress(test_user, ach)
    assert val == 35
    assert req == 50

    # An unusable requirement reports 0 so the UI shows no progress bar
    ach.requirement_value = "invalid"
    db.session.commit()
    val, req = get_achievement_progress(test_user, ach)
    assert (val, req) == (35, 0)

    ach.requirement_value = None
    db.session.commit()
    assert get_achievement_progress(test_user, ach) == (35, 0)

    ach.type = "unknown"
    db.session.commit()
    val, req = get_achievement_progress(test_user, ach)
    assert val == 0


def test_calculate_consistency(init_db, test_user):
    # No logs
    assert _calculate_consistency(test_user.id) == 0

    # isocalendar returns (year, week, weekday)
    # Let's generate dates in specific ISO weeks
    # Week 1, 2025: 2025-01-01 (is Wednesday, week 1)
    # Week 2, 2025: 2025-01-08
    # Week 4, 2025: 2025-01-22
    dt_w1 = datetime(2025, 1, 1)
    dt_w2 = datetime(2025, 1, 8)
    dt_w4 = datetime(2025, 1, 22)

    cl1 = ChallengeLog(
        user_id=test_user.id, domain="x", challenge_slug="a", timestamp=dt_w1
    )
    cl2 = ChallengeLog(
        user_id=test_user.id, domain="x", challenge_slug="b", timestamp=dt_w2
    )
    cl3 = ChallengeLog(
        user_id=test_user.id, domain="x", challenge_slug="c", timestamp=dt_w4
    )
    db.session.add_all([cl1, cl2, cl3])
    db.session.commit()

    # Streak should be 2 (week 1 and 2), best_streak is 2
    assert _calculate_consistency(test_user.id) == 2

    # Let's test year transition
    # Week 52, 2025: 2025-12-24
    # Week 1, 2026: 2026-01-01 (is Thursday, week 1)
    dt_w52 = datetime(2025, 12, 24)
    dt_w1_2026 = datetime(2026, 1, 1)

    cl4 = ChallengeLog(
        user_id=test_user.id, domain="x", challenge_slug="d", timestamp=dt_w52
    )
    cl5 = ChallengeLog(
        user_id=test_user.id, domain="x", challenge_slug="e", timestamp=dt_w1_2026
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
    assert _calculate_consistency(test_user.id) == 2


def test_evaluate_user(init_db, test_user):
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

    test_user.earned_ducks = 11
    test_user.duck_balance = 0
    db.session.commit()

    # First evaluation should award ach1 (11 >= 10)
    awards = evaluate_user(test_user)
    assert len(awards) == 1
    assert awards[0].slug == "d1"
    assert test_user.duck_balance == 5  # 5 reward
    assert test_user.last_achievement_evaluation is not None

    from application.models.duck_transaction import DuckTransaction

    txs = DuckTransaction.query.filter_by(user_id=test_user.id).all()
    assert len(txs) == 1
    assert txs[0].reason == "Achievement: D1"

    # Throttling test: evaluating again within 1 hour should return []
    awards = evaluate_user(test_user)
    assert awards == []

    # Using force=True should evaluate again
    test_user.earned_ducks = 25
    db.session.commit()
    awards = evaluate_user(test_user, force=True)
    assert len(awards) == 1
    assert awards[0].slug == "d2"
    assert test_user.duck_balance == 15  # 5 + 10 reward

    txs = (
        DuckTransaction.query.filter_by(user_id=test_user.id)
        .order_by(DuckTransaction.id.asc())
        .all()
    )
    assert len(txs) == 2
    assert txs[1].reason == "Achievement: D2"


def test_longest_session_minutes(init_db, test_user):
    # No logs
    assert longest_session_minutes(test_user.id) == 0

    # Logs
    s1 = SessionLog(
        user_id=test_user.id,
        start_time=datetime.utcnow() - timedelta(minutes=10),
        end_time=datetime.utcnow(),
    )
    s2 = SessionLog(
        user_id=test_user.id,
        start_time=datetime.utcnow() - timedelta(minutes=30),
        end_time=None,
    )  # end_time=None uses utcnow
    db.session.add_all([s1, s2])
    db.session.commit()

    assert longest_session_minutes(test_user.id) >= 29.9


def test_evaluate_user_five_minute_throttle(init_db, test_user):
    """Test that evaluate_user enforces a 5-minute (300-second) throttle."""
    ach = Achievement(name="Throttle Duck", slug="throttle-duck", type="ducks", requirement_value="5", reward=1)
    db.session.add(ach)
    test_user.earned_ducks = 10
    db.session.commit()

    # Case 1: Last evaluation was 4 minutes ago (240s) -> Should be throttled
    test_user.last_achievement_evaluation = datetime.utcnow() - timedelta(seconds=240)
    db.session.commit()
    awards = evaluate_user(test_user)
    assert awards == []

    # Case 2: Last evaluation was 5.5 minutes ago (330s) -> Should evaluate
    test_user.last_achievement_evaluation = datetime.utcnow() - timedelta(seconds=330)
    db.session.commit()
    awards = evaluate_user(test_user)
    assert len(awards) == 1
    assert awards[0].slug == "throttle-duck"


@pytest.mark.parametrize(
    "dates, expected",
    [
        # 2026 has 53 ISO weeks: W52 (Dec 21) -> W53 (Dec 28) -> 2027-W1 (Jan 4)
        ([(2026, 12, 21), (2026, 12, 28), (2027, 1, 4)], 3),
        # 2020 has 53 ISO weeks: W53 (Dec 28) -> 2021-W1 (Jan 4)
        ([(2020, 12, 28), (2021, 1, 4)], 2),
        # 2032 has 53 ISO weeks too
        ([(2032, 12, 20), (2032, 12, 27), (2033, 1, 3)], 3),
        # Skipping W53 (W52 -> next year's W1) is a gap, not a streak
        ([(2020, 12, 21), (2021, 1, 4)], 1),
        ([(2026, 12, 21), (2027, 1, 4)], 1),
        # Any day of the week counts for its ISO week (Sunday 2027-01-03 is W53)
        ([(2026, 12, 21), (2027, 1, 3), (2027, 1, 4)], 3),
    ],
)
def test_calculate_consistency_53_week_years(init_db, test_user, dates, expected):
    for i, (year, month, day) in enumerate(dates):
        db.session.add(
            ChallengeLog(
                user_id=test_user.id,
                domain="x",
                challenge_slug=f"w-{i}",
                timestamp=datetime(year, month, day, 12),
            )
        )
    db.session.commit()

    assert _calculate_consistency(test_user.id) == expected


def test_value_getters_shared_by_check_and_progress(init_db, test_user):
    """check_achievement and get_achievement_progress read the same value."""
    stats = {
        "chat_count": 7,
        "consistency_streak": 4,
        "community_count": 3,
        "max_session": 45,
        "trade_count": 2,
    }
    test_user.earned_ducks = 12
    cases = [
        ("ducks", 12),
        ("chat", 7),
        ("consistency", 4),
        ("community", 3),
        ("session", 45),
        ("trade", 2),
        ("project", 0),
        ("unknown_type", 0),
    ]
    for ach_type, expected in cases:
        ach = Achievement(
            name=ach_type,
            slug=f"shared-{ach_type}",
            type=ach_type,
            requirement_value=str(expected),
        )
        assert _current_value(test_user, ach, stats) == expected
        assert get_achievement_progress(test_user, ach, stats) == (expected, expected)
        assert check_achievement(test_user, ach, stats) is True
        ach.requirement_value = str(expected + 1)
        assert check_achievement(test_user, ach, stats) is False


def test_compute_user_stats(init_db, test_user):
    other = UserFactory()
    db.session.add_all(
        [
            Message(user_id=test_user.id, content="a"),
            Message(user_id=test_user.id, content="b"),
            Message(user_id=other.id, content="c"),
            ChallengeLog(
                user_id=test_user.id,
                domain="x",
                challenge_slug="s1",
                timestamp=datetime(2025, 1, 1),
            ),
            ChallengeLog(
                user_id=other.id,
                domain="x",
                challenge_slug="s2",
                helper=test_user.username,
            ),
            DuckTradeLog(
                user_id=test_user.id,
                status="completed",
                digital_ducks=1,
                bit_ducks=[],
                byte_ducks=[],
            ),
        ]
    )
    db.session.commit()

    assert compute_user_stats(test_user) == {
        "chat_count": 2,
        "consistency_streak": 1,
        "community_count": 1,
        "max_session": 0,
        "trade_count": 1,
    }


def test_community_count_is_case_insensitive_and_ignores_own_logs(init_db):
    ben = UserFactory(_username="ben")
    friend = UserFactory()
    db.session.add_all(
        [
            # Helped by 'ben', typed in different cases, on someone else's log
            ChallengeLog(user_id=friend.id, domain="x", challenge_slug="a", helper="Ben"),
            ChallengeLog(user_id=friend.id, domain="x", challenge_slug="b", helper="BEN"),
            ChallengeLog(user_id=friend.id, domain="x", challenge_slug="c", helper="ben"),
            # ben's own logs never count toward his own community stat
            ChallengeLog(user_id=ben.id, domain="x", challenge_slug="d", helper="Ben"),
            ChallengeLog(user_id=ben.id, domain="x", challenge_slug="e", helper="BEN"),
            # someone else entirely
            ChallengeLog(
                user_id=friend.id, domain="x", challenge_slug="f", helper="benny"
            ),
        ]
    )
    db.session.commit()

    assert compute_user_stats(ben)["community_count"] == 3
    ach = Achievement(name="C", slug="c-case", type="community", requirement_value="3")
    assert check_achievement(ben, ach) is True  # lazy path, no stats
    ach.requirement_value = "4"
    assert check_achievement(ben, ach) is False


def test_evaluate_user_awards_chained_ducks_achievements_in_one_call(
    init_db, test_user
):
    """Awards that raise earned_ducks must not depend on definition order."""
    # Defined in the "wrong" order: the 40-duck tier comes before the 10-duck tier
    db.session.add_all(
        [
            Achievement(
                name="Forty",
                slug="forty",
                type="ducks",
                reward=5,
                requirement_value="40",
            ),
            Achievement(
                name="Ten", slug="ten", type="ducks", reward=50, requirement_value="10"
            ),
        ]
    )
    test_user.earned_ducks = 10
    test_user.duck_balance = 0
    db.session.commit()

    awards = evaluate_user(test_user, force=True)

    assert sorted(a.slug for a in awards) == ["forty", "ten"]
    assert test_user.duck_balance == 55
    assert UserAchievement.query.filter_by(user_id=test_user.id).count() == 2

    # Nothing left to award
    assert evaluate_user(test_user, force=True) == []


def test_evaluate_user_chained_awards_are_bounded(init_db, test_user, monkeypatch):
    db.session.add_all(
        [
            Achievement(
                name="Forty",
                slug="forty",
                type="ducks",
                reward=5,
                requirement_value="40",
            ),
            Achievement(
                name="Ten", slug="ten", type="ducks", reward=50, requirement_value="10"
            ),
        ]
    )
    test_user.earned_ducks = 10
    db.session.commit()
    monkeypatch.setattr(achievement_engine, "_MAX_AWARD_PASSES", 1)

    assert [a.slug for a in evaluate_user(test_user, force=True)] == ["ten"]
    # The next evaluation picks up the rest
    assert [a.slug for a in evaluate_user(test_user, force=True)] == ["forty"]


def _integrity_error():
    return IntegrityError(
        "INSERT INTO user_achievement",
        {},
        Exception(
            "UNIQUE constraint failed: user_achievement.user_id, "
            "user_achievement.achievement_id"
        ),
    )


def test_evaluate_user_retries_after_concurrent_award(init_db, test_user):
    """The loser of a concurrent evaluation rolls back and retries once."""
    ach = Achievement(
        name="Ten", slug="ten", type="ducks", reward=10, requirement_value="10"
    )
    db.session.add(ach)
    test_user.earned_ducks = 10
    test_user.duck_balance = 0
    db.session.commit()
    ach_id = ach.id

    real_commit = db.session.commit
    calls = {"n": 0}

    def flaky_commit():
        calls["n"] += 1
        if calls["n"] == 1:
            raise _integrity_error()
        return real_commit()

    with patch.object(db.session, "commit", side_effect=flaky_commit):
        awards = evaluate_user(test_user, force=True)

    assert calls["n"] == 2
    assert [a.id for a in awards] == [ach_id]
    assert UserAchievement.query.filter_by(user_id=test_user.id).count() == 1
    # The failed attempt's reward was rolled back: exactly one duck transaction
    from application.models.duck_transaction import DuckTransaction

    assert DuckTransaction.query.filter_by(user_id=test_user.id).count() == 1
    assert test_user.duck_balance == 10


def test_evaluate_user_skips_achievement_awarded_concurrently(init_db, test_user):
    """If another request already awarded one, only the remainder is awarded."""
    first = Achievement(
        name="First", slug="first", type="ducks", reward=10, requirement_value="1"
    )
    second = Achievement(
        name="Second", slug="second", type="ducks", reward=20, requirement_value="2"
    )
    db.session.add_all([first, second])
    test_user.earned_ducks = 5
    test_user.duck_balance = 0
    db.session.commit()
    first_id, second_id, user_id = first.id, second.id, test_user.id

    real_commit = db.session.commit
    calls = {"n": 0}

    def losing_commit():
        calls["n"] += 1
        if calls["n"] == 1:
            # Simulate the winning request committing "first" between our
            # snapshot of the earned ids and our commit.
            db.session.rollback()
            db.session.add(UserAchievement(user_id=user_id, achievement_id=first_id))
            real_commit()
            raise _integrity_error()
        return real_commit()

    with patch.object(db.session, "commit", side_effect=losing_commit):
        awards = evaluate_user(test_user, force=True)

    assert [a.id for a in awards] == [second_id]
    earned = {
        ua.achievement_id for ua in UserAchievement.query.filter_by(user_id=user_id)
    }
    assert earned == {first_id, second_id}


def test_evaluate_user_gives_up_quietly_on_persistent_integrity_error(
    init_db, test_user, caplog
):
    ach = Achievement(
        name="Ten", slug="ten", type="ducks", reward=10, requirement_value="10"
    )
    db.session.add(ach)
    test_user.earned_ducks = 10
    test_user.duck_balance = 0
    db.session.commit()

    with patch.object(db.session, "commit", side_effect=_integrity_error()):
        with caplog.at_level(logging.WARNING, logger=achievement_engine.logger.name):
            awards = evaluate_user(test_user, force=True)

    assert awards == []
    assert "concurrent evaluation" in caplog.text
    # Nothing was persisted and no reward was granted
    from application.models.duck_transaction import DuckTransaction

    assert UserAchievement.query.filter_by(user_id=test_user.id).count() == 0
    assert DuckTransaction.query.filter_by(user_id=test_user.id).count() == 0
    assert test_user.duck_balance == 0


def test_evaluate_user_recovers_from_a_real_concurrent_insert(init_db, test_user):
    """The winner commits on its own connection after our snapshot (no mocks).

    Our flush then hits the real UNIQUE(user_id, achievement_id) violation; the
    evaluation rolls back, re-reads what is earned and returns without error or
    a duplicate reward.
    """
    from application.models.duck_transaction import DuckTransaction

    ach = Achievement(
        name="Ten", slug="ten", type="ducks", reward=10, requirement_value="10"
    )
    db.session.add(ach)
    test_user.earned_ducks = 10
    test_user.duck_balance = 0
    db.session.commit()
    ach_id, user_id = ach.id, test_user.id

    real_award = achievement_engine._award_new_achievements
    raced = []

    def award_then_lose_race(user, all_achievements, stats):
        awards = real_award(user, all_achievements, stats)
        if not raced:
            raced.append(True)
            with db.engine.begin() as other_connection:
                other_connection.execute(
                    UserAchievement.__table__.insert().values(
                        user_id=user_id, achievement_id=ach_id
                    )
                )
        return awards

    with patch.object(
        achievement_engine, "_award_new_achievements", side_effect=award_then_lose_race
    ):
        awards = evaluate_user(test_user, force=True)

    assert raced
    assert awards == []
    assert UserAchievement.query.filter_by(user_id=user_id).count() == 1
    assert DuckTransaction.query.filter_by(user_id=user_id).count() == 0
    assert db.session.get(User, user_id).duck_balance == 0
