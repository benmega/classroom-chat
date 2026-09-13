"""
File: test_user.py
Type: py
Summary: Unit tests for user model.
"""


def test_user_creation(add_sample_user):
    user = add_sample_user("testuser", "hashed_pwd")
    assert user.username == "testuser"
    assert user.duck_balance == 0


def test_user_duck_update(add_sample_user):
    user = add_sample_user("testuser", "hashed_pwd")
    user.add_ducks(5)
    # Access the correct `db` instance from your app
    from application import db

    db.session.commit()
    assert user.duck_balance == 5


def test_user_query(add_sample_user, init_db):
    add_sample_user("testuser", "hashed_pwd")
    from application import db
    from application.models.user import User

    queried_user = db.session.query(User).filter_by(username="testuser").first()
    assert queried_user is not None
    assert queried_user.username == "testuser"


def test_user_repr(add_sample_user):
    user = add_sample_user("testuser_repr", "pwd")
    assert repr(user) == "<User testuser_repr>"


def test_user_to_dict_auth(add_sample_user, init_db):
    user = add_sample_user("testuser_auth", "pwd")
    data = user.to_dict_auth()
    assert data["username"] == "testuser_auth"


def test_user_to_dict_summary_precomputed(add_sample_user, init_db):
    user = add_sample_user("testuser_summ", "pwd")
    precomputed = {
        ("testuser_summ", "codecombat.com"): 5,
        ("testuser_summ", "www.ozaria.com"): 2,
    }
    data = user.to_dict_summary(precomputed_progress=precomputed)
    assert data["username"] == "testuser_summ"


def test_user_connection_code(add_sample_user):
    user = add_sample_user("testuser_cc", "pwd")
    code = user.get_connection_code()
    assert code is not None
    assert len(code) == 6
    code2 = user.get_connection_code()
    assert code == code2  # Cached


def test_user_set_online(add_sample_user, init_db):
    user = add_sample_user("testuser_online", "pwd")
    from application.models.user import User

    User.set_online(user.id, True)
    assert user.is_online is True

    User.set_online(user.id, False)
    assert user.is_online is False

    # Non existent
    User.set_online(9999, True)


def test_user_projects(add_sample_user, init_db):
    user = add_sample_user("testuser_proj", "pwd")
    user.add_project("test_proj", "desc", "link")
    assert len(user.projects) == 1
    proj_id = user.projects[0].id
    user.remove_project(proj_id)
    assert len(user.projects) == 0


def test_user_ducks_parent(add_sample_user, init_db):
    user = add_sample_user("testuser_parent", "pwd")
    user.role = "parent"
    from application import db

    db.session.commit()

    user.add_ducks(10)
    assert user.duck_balance == 0
    assert user.award_daily_duck() is False


def test_user_ducks_double(add_sample_user, init_db):
    user = add_sample_user("testuser_dd", "pwd")
    user.has_double_duck = True
    user.award_daily_duck(1)
    assert user.duck_balance == 2


def test_user_get_contribution_data_with_logs(add_sample_user, init_db):
    user = add_sample_user("testuser_contrib", "pwd")
    from datetime import datetime, timedelta

    from application import db
    from application.models.challenge_log import ChallengeLog

    today = datetime.now()
    logs = []

    # level 1 (1 log)
    logs.append(
        ChallengeLog(
            user_id=user.id,
            domain="codecombat.com",
            challenge_slug="a",
            timestamp=today,
        )
    )
    # level 2 (2 logs)
    logs.extend(
        [
            ChallengeLog(
                user_id=user.id,
                domain="codecombat.com",
                challenge_slug="b",
                timestamp=today - timedelta(days=1),
            )
            for _ in range(2)
        ]
    )
    # level 3 (5 logs)
    logs.extend(
        [
            ChallengeLog(
                user_id=user.id,
                domain="codecombat.com",
                challenge_slug="c",
                timestamp=today - timedelta(days=2),
            )
            for _ in range(5)
        ]
    )
    # level 4 (7 logs)
    logs.extend(
        [
            ChallengeLog(
                user_id=user.id,
                domain="codecombat.com",
                challenge_slug="d",
                timestamp=today - timedelta(days=3),
            )
            for _ in range(7)
        ]
    )

    for log in logs:
        db.session.add(log)
    db.session.commit()

    data = user.get_contribution_data()
    assert "months" in data
    assert "rows" in data

    # Also test get_completed_levels
    levels = user.get_completed_levels()
    assert "a" in levels
    assert "b" in levels


def test_user_get_course_progress_data(add_sample_user, init_db):
    user = add_sample_user("testuser_course", "pwd")
    from application import db
    from application.models.challenge import Challenge
    from application.models.challenge_log import ChallengeLog
    from application.models.course import Course

    course = Course(id="test-course-id", name="Test Course", domain="codecombat.com")
    db.session.add(course)
    db.session.commit()

    ch = Challenge(
        slug="test-chal", name="Test Chal", domain="codecombat.com", course_id=course.id
    )
    db.session.add(ch)
    db.session.commit()

    cl = ChallengeLog(
        user_id=user.id,
        challenge_slug="test-chal",
        domain="codecombat.com",
        course_id=course.id,
    )
    db.session.add(cl)
    db.session.commit()

    cl_missing = ChallengeLog(
        user_id=user.id,
        challenge_slug="missing-chal",
        domain="codecombat.com",
        course_id=course.id,
    )
    db.session.add(cl_missing)
    db.session.commit()

    data = user.get_course_progress_data()
    assert "codecombat" in data
    cc_data = data["codecombat"]
    assert "breakdown" in cc_data


# ── earned_ducks floor guard ──────────────────────────────────────────────────

def test_earned_ducks_never_go_negative_via_large_deduction(add_sample_user):
    """A large negative add_ducks call must not push earned_ducks below 0.
    earned_ducks stays at the highest it ever reached; duck_balance takes the full hit."""
    from application import db

    user = add_sample_user("duck_floor_user", "pwd")
    user.add_ducks(10)       # earned_ducks = 10, duck_balance = 10
    user.add_ducks(-9999)    # huge deduction — earned_ducks must stay >= duck_balance
    db.session.commit()

    assert user.earned_ducks == 10, (
        f"earned_ducks should remain 10 after large deduction, got {user.earned_ducks}"
    )
    assert user.duck_balance == 10 - 9999, (
        "duck_balance should still reflect the full deduction"
    )
    assert user.earned_ducks >= user.duck_balance, (
        "Invariant violated: earned_ducks must always be >= duck_balance"
    )


def test_earned_ducks_unaffected_by_negative_adjustment_on_fresh_user(add_sample_user):
    """A negative adjustment on a user with 0 earned_ducks must keep earned_ducks >= duck_balance."""
    from application import db

    user = add_sample_user("duck_floor_fresh", "pwd")
    assert user.earned_ducks == 0

    user.add_ducks(-50)
    db.session.commit()

    # duck_balance is now -50; earned_ducks must be >= duck_balance (and >= 0 since it never earned)
    assert user.earned_ducks == 0, (
        f"earned_ducks should be 0 (never earned anything), got {user.earned_ducks}"
    )
    assert user.earned_ducks >= user.duck_balance, (
        "Invariant violated: earned_ducks must always be >= duck_balance"
    )


def test_earned_ducks_only_increase_on_positive_amounts(add_sample_user):
    """Repeated positive and negative transactions: earned_ducks only grows, invariant always holds."""
    from application import db

    user = add_sample_user("duck_monotonic", "pwd")
    user.add_ducks(20)
    user.add_ducks(-5)
    user.add_ducks(10)
    user.add_ducks(-3)
    db.session.commit()

    assert user.earned_ducks == 30, (
        f"earned_ducks should be 30 (sum of positive only: 20+10), got {user.earned_ducks}"
    )
    assert user.duck_balance == 22, (
        f"duck_balance should be 22 (20-5+10-3), got {user.duck_balance}"
    )
    assert user.earned_ducks >= user.duck_balance, (
        "Invariant violated: earned_ducks must always be >= duck_balance"
    )


def test_earned_ducks_invariant_with_legacy_balance(add_sample_user):
    """Simulates a user whose duck_balance was set via legacy migration (no transaction log).
    If duck_balance > earned_ducks, the next add_ducks call should bring earned_ducks up."""
    from application import db

    user = add_sample_user("duck_legacy", "pwd")
    # Simulate a legacy DB migration that set balance directly, bypassing add_ducks
    user.duck_balance = 500
    user.earned_ducks = 10  # lower than balance — invariant currently violated
    db.session.commit()

    # The next add_ducks call should detect the violation and correct earned_ducks
    user.add_ducks(1, reason="Daily Duck")
    db.session.commit()

    assert user.earned_ducks >= user.duck_balance, (
        f"Invariant violated after add_ducks: earned={user.earned_ducks}, balance={user.duck_balance}"
    )
