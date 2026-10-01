"""
File: test_user.py
Type: py
Summary: Unit tests for user model.
"""

from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from application.extensions import db
from application.models.challenge_log import ChallengeLog
from application.models.duck_transaction import DuckTransaction
from application.models.project import Project
from application.models.session_log import SessionLog
from application.models.user import User, save_new_user
from sqlalchemy import event, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.orm.attributes import set_committed_value
from tests.factories import AchievementFactory, ChallengeFactory, UserFactory


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


# ── atomic balance updates and the daily duck ─────────────────────────────────
# The test database is a single shared connection, so true parallelism cannot be
# reproduced; instead a second Session commits a change that this session's
# already-loaded (stale) instance knows nothing about, which is exactly the
# state two overlapping requests leave behind.


def _commit_from_another_session(user_id, **values):
    with Session(db.engine) as other:
        other.execute(update(User).where(User.id == user_id).values(**values))
        other.commit()


def _stored_balances(user_id):
    with Session(db.engine) as other:
        row = other.execute(
            select(User.duck_balance, User.earned_ducks).where(User.id == user_id)
        ).one()
    return tuple(row)


def test_add_ducks_does_not_overwrite_a_concurrent_update(add_sample_user):
    user = add_sample_user("lost_update", "pwd")
    assert user.duck_balance == 0  # load the copy that is about to go stale
    user_id = user.id

    # Another request credits the same user and commits first.
    _commit_from_another_session(user_id, duck_balance=7, earned_ducks=7)

    assert user.add_ducks(5, reason="mine") is True
    # The instance already shows the real totals, before any commit.
    assert (user.duck_balance, user.earned_ducks) == (12, 12)
    db.session.commit()

    assert _stored_balances(user_id) == (12, 12)
    assert DuckTransaction.query.filter_by(user_id=user_id).count() == 1


def test_add_ducks_deduction_is_applied_to_the_stored_balance(add_sample_user):
    user = add_sample_user("lost_debit", "pwd", earned_ducks=10)
    assert user.duck_balance == 10
    user_id = user.id

    _commit_from_another_session(user_id, duck_balance=4)  # spent elsewhere

    user.add_ducks(-3, reason="debit")
    db.session.commit()

    # Applied to the stored 4, not to the stale 10 the instance still held.
    assert _stored_balances(user_id) == (1, 10)


def test_add_ducks_min_balance_refuses_an_overdraw(add_sample_user):
    user = add_sample_user("min_balance", "pwd", earned_ducks=10)

    assert user.add_ducks(-11, reason="too much", min_balance=0) is False
    assert (user.duck_balance, user.earned_ducks) == (10, 10)
    assert DuckTransaction.query.filter_by(user_id=user.id).count() == 0

    # Spending down to exactly the floor is allowed.
    assert user.add_ducks(-10, reason="all of it", min_balance=0) is True
    db.session.commit()
    assert (user.duck_balance, user.earned_ducks) == (0, 10)
    assert DuckTransaction.query.filter_by(user_id=user.id).count() == 1


def test_add_ducks_min_balance_checks_the_stored_balance_not_a_stale_copy(
    add_sample_user,
):
    user = add_sample_user("stale_overdraw", "pwd", earned_ducks=10)
    assert user.duck_balance == 10  # stale copy says there is enough
    user_id = user.id

    _commit_from_another_session(user_id, duck_balance=0)  # spent in the meantime

    assert user.add_ducks(-10, reason="trade", min_balance=0) is False
    db.session.commit()

    assert _stored_balances(user_id) == (0, 10)
    assert DuckTransaction.query.filter_by(user_id=user_id).count() == 0


def test_add_ducks_without_a_database_row_uses_plain_arithmetic():
    user = User(username="transient", password_hash="x", earned_ducks=0, duck_balance=0)

    assert user.add_ducks(3, reason="in memory") is True
    assert (user.duck_balance, user.earned_ducks) == (3, 3)

    assert user.add_ducks(-5, reason="too much", min_balance=0) is False
    assert (user.duck_balance, user.earned_ducks) == (3, 3)

    assert user.add_ducks(-2, reason="spend", min_balance=0) is True
    assert (user.duck_balance, user.earned_ducks) == (1, 3)
    db.session.rollback()  # drop the (user-less) transaction rows staged above


@pytest.mark.parametrize("amount", [float("nan"), float("inf"), float("-inf")])
def test_add_ducks_rejects_non_finite_amounts(add_sample_user, amount):
    user = add_sample_user("non_finite", "pwd", earned_ducks=5)

    with pytest.raises(ValueError):
        user.add_ducks(amount, reason="poison")
    db.session.commit()

    assert _stored_balances(user.id) == (5, 5)
    assert DuckTransaction.query.filter_by(user_id=user.id).count() == 0


def test_add_ducks_reports_that_parents_get_nothing(add_sample_user):
    user = add_sample_user("parent_noop", "pwd")
    user.role = "parent"
    db.session.commit()

    assert user.add_ducks(10, reason="x") is False
    assert user.duck_balance == 0


def test_award_daily_duck_only_awards_once_per_day(add_sample_user):
    user = add_sample_user("daily_once", "pwd")
    user_id = user.id

    assert user.award_daily_duck() is True
    db.session.commit()
    assert user.last_daily_duck == datetime.now(timezone.utc).date()
    assert user.duck_balance == 1

    # A copy that has not seen the award yet (a second tab / request) loses the
    # conditional claim instead of awarding again.
    set_committed_value(user, "last_daily_duck", None)
    assert user.award_daily_duck() is False
    db.session.commit()

    assert _stored_balances(user_id) == (1, 1)
    assert DuckTransaction.query.filter_by(user_id=user_id).count() == 1


def test_award_daily_duck_loses_the_race_to_a_concurrent_login(add_sample_user):
    user = add_sample_user("daily_race", "pwd")
    assert user.last_daily_duck is None  # stale: nothing awarded yet
    user_id = user.id

    # The other login awarded today's duck and committed first.
    _commit_from_another_session(
        user_id,
        last_daily_duck=datetime.now(timezone.utc).date(),
        duck_balance=1,
        earned_ducks=1,
    )

    assert user.award_daily_duck() is False
    db.session.commit()

    assert _stored_balances(user_id) == (1, 1)
    assert DuckTransaction.query.filter_by(user_id=user_id).count() == 0


def test_award_daily_duck_awards_again_the_next_day(add_sample_user):
    user = add_sample_user("daily_next", "pwd")
    user.last_daily_duck = datetime.now(timezone.utc).date() - timedelta(days=1)
    db.session.commit()

    assert user.award_daily_duck() is True
    db.session.commit()
    assert user.duck_balance == 1


def test_award_daily_duck_day_boundary_is_utc(add_sample_user):
    class FrozenDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2030, 1, 15, 23, 30, tzinfo=timezone.utc).astimezone(tz)

    user = add_sample_user("daily_utc", "pwd")

    with patch("application.models.user.datetime", FrozenDatetime):
        assert user.award_daily_duck() is True
    db.session.commit()

    # 23:30 UTC is already the 16th in any zone east of UTC+0:30; the stored day
    # must still be the UTC one.
    assert user.last_daily_duck == date(2030, 1, 15)


def test_award_daily_duck_for_an_unsaved_user_sets_the_day_in_memory():
    user = User(
        username="daily_transient", password_hash="x", earned_ducks=0, duck_balance=0
    )

    assert user.award_daily_duck() is True
    assert user.last_daily_duck == datetime.now(timezone.utc).date()
    assert user.duck_balance == 1
    db.session.rollback()  # drop the (user-less) transaction row staged above


# --- Helpers for the tests below ----------------------------------------------


@contextmanager
def _captured_sql():
    """Collect every SQL statement executed while the block runs."""
    statements = []

    def before(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    event.listen(db.engine, "before_cursor_execute", before)
    try:
        yield statements
    finally:
        event.remove(db.engine, "before_cursor_execute", before)


def _make_user(index):
    user = UserFactory(_username=f"batch{index}", nickname=f"Batch {index}")
    db.session.add(Project(name=f"Proj {index}", user_id=user.id))
    if index % 2 == 0:
        db.session.add(
            ChallengeLog(
                user_id=user.id,
                domain="codecombat.com",
                challenge_slug=f"slug-{index}",
            )
        )
    db.session.commit()
    return user


# --- Challenge totals / progress (T9a, T9c) -----------------------------------


def test_progress_percent_follows_challenge_changes(add_sample_user, init_db):
    """Adding challenges changes the percentage straight away (no process cache)."""
    user = add_sample_user("testuser_pct", "pwd")
    for i in range(2):
        ChallengeFactory(slug=f"pct-{i}", domain="codecombat.com")
    db.session.add(
        ChallengeLog(user_id=user.id, domain="codecombat.com", challenge_slug="pct-0")
    )
    db.session.commit()

    progress = User.build_progress_map([user])
    assert user.get_progress_percent("codecombat.com") == 50
    assert user.to_dict_summary(progress)["cc_percent"] == 50

    for i in range(2, 4):
        ChallengeFactory(slug=f"pct-{i}", domain="codecombat.com")

    assert user.get_progress_percent("codecombat.com") == 25
    assert user.to_dict_summary(progress)["cc_percent"] == 25


def test_build_progress_map(init_db):
    a, b, c = (_make_user(i) for i in range(3))
    db.session.add(
        ChallengeLog(user_id=a.id, domain="www.ozaria.com", challenge_slug="oz-1")
    )
    db.session.commit()

    assert User.build_progress_map([a, b, c]) == {
        ("batch0", "codecombat.com"): 1,
        ("batch0", "www.ozaria.com"): 1,
        ("batch2", "codecombat.com"): 1,
    }
    assert User.build_progress_map([]) == {}


def test_to_dict_summary_empty_precomputed_progress_skips_per_user_queries(
    add_sample_user, init_db
):
    """An empty map ("no logs on this page") must not fall back to COUNT queries."""
    user = add_sample_user("testuser_empty", "pwd")
    totals = {"codecombat.com": 0, "www.ozaria.com": 0}

    with _captured_sql() as statements:
        data = user.to_dict_summary({}, challenge_totals=totals, activity_user_ids=set())

    assert data["cc_levels"] == 0
    assert data["oz_levels"] == 0
    assert data["has_activity"] is False
    assert not [s for s in statements if "challenge_logs" in s]


def test_to_dict_summaries_query_count_does_not_grow_with_users(init_db):
    def measure():
        db.session.expire_all()
        with _captured_sql() as statements:
            users = User.query.options(selectinload(User.projects)).all()
            summaries = User.to_dict_summaries(users)
        return len(statements), summaries

    for i in range(2):
        _make_user(i)
    small_count, small = measure()

    for i in range(2, 9):
        _make_user(i)
    large_count, large = measure()

    assert len(small) == 2 and len(large) == 9
    assert large_count == small_count

    by_name = {d["username"]: d for d in large}
    assert by_name["batch2"]["cc_levels"] == 1
    assert by_name["batch3"]["cc_levels"] == 0
    assert by_name["batch3"]["has_activity"] is False
    assert by_name["batch4"]["has_activity"] is True
    assert by_name["batch4"]["recent_project"] == {"name": "Proj 4"}


def test_to_dict_summaries_empty(init_db):
    assert User.to_dict_summaries([]) == []


def test_batch_activity_matches_has_activity(init_db):
    from application.models.course_instance_request import CourseInstanceRequest
    from application.models.submission import Submission
    from application.models.user_certificate import UserCertificate

    logs, subs, certs, reqs, none = (UserFactory() for _ in range(5))
    db.session.add_all(
        [
            ChallengeLog(user_id=logs.id, domain="x", challenge_slug="s"),
            Submission(
                user_id=subs.id,
                original_filename="a.pdf",
                stored_path="submissions/a.pdf",
                file_size=1,
            ),
            UserCertificate(
                user_id=certs.id,
                achievement_id=AchievementFactory().id,
                url="http://example.com/c.pdf",
            ),
            CourseInstanceRequest(
                student_id=reqs.id, course_instance_id="ci", url="http://example.com"
            ),
        ]
    )
    db.session.commit()

    users = [logs, subs, certs, reqs, none]
    active = User._activity_user_ids(users)

    assert active == {u.id for u in users if u.has_activity}
    assert active == {logs.id, subs.id, certs.id, reqs.id}


# --- Slug races (T9b) ----------------------------------------------------------


def test_save_new_user_retries_when_slug_loses_a_race(init_db, monkeypatch):
    winner = UserFactory(_username="slugwinner", nickname="Sam")
    assert winner.slug == "sam"

    real_generate_slug = User.generate_slug
    calls = []

    def racy_generate_slug(self):
        # The first attempt computes a slug before the winner's commit is visible
        calls.append(1)
        if len(calls) == 1:
            self.slug = "sam"
            return self.slug
        return real_generate_slug(self)

    monkeypatch.setattr(User, "generate_slug", racy_generate_slug)

    loser = User(username="slugloser", nickname="Sam")
    loser.set_password("pwd")
    save_new_user(loser)

    assert len(calls) == 2
    assert loser.slug == "sam-1"
    assert db.session.get(User, loser.id).slug == "sam-1"
    assert db.session.get(User, winner.id).slug == "sam"


def test_save_new_user_commit_false_only_flushes(init_db):
    user = User(username="flushonly", nickname="Flush Only")
    user.set_password("pwd")

    save_new_user(user, commit=False)

    assert user.id is not None
    assert user.slug == "flush-only"
    db.session.rollback()
    assert User.query.filter_by(username="flushonly").first() is None


def test_save_new_user_other_integrity_errors_propagate(init_db):
    UserFactory(_username="dupename")
    clash = User(username="dupename")
    clash.set_password("pwd")

    with pytest.raises(IntegrityError):
        save_new_user(clash)
    db.session.rollback()

    assert User.query.filter_by(username="dupename").count() == 1


# --- Session logs (T9e, T9f) ---------------------------------------------------


def _open_logs(user_id):
    return SessionLog.query.filter_by(user_id=user_id, end_time=None).all()


def test_set_online_then_offline_leaves_one_closed_log(add_sample_user, init_db):
    user = add_sample_user("testuser_cycle", "pwd")

    User.set_online(user.id, True)
    assert user.is_online is True
    assert len(_open_logs(user.id)) == 1

    User.set_online(user.id, False)
    assert user.is_online is False
    logs = SessionLog.query.filter_by(user_id=user.id).all()
    assert len(logs) == 1
    assert logs[0].end_time is not None


def test_set_online_commits_once(add_sample_user, init_db):
    user = add_sample_user("testuser_once", "pwd")

    with patch.object(db.session, "commit", wraps=db.session.commit) as commit:
        User.set_online(user.id, True)
        assert commit.call_count == 1
        User.set_online(user.id, False)
        assert commit.call_count == 2


def test_set_online_rolls_back_session_log_when_commit_fails(add_sample_user, init_db):
    user = add_sample_user("testuser_fail", "pwd")
    user_id = user.id

    with patch.object(db.session, "commit", side_effect=RuntimeError("boom")):
        with pytest.raises(RuntimeError):
            User.set_online(user_id, True)

    # Neither the log nor is_online was persisted
    assert SessionLog.query.filter_by(user_id=user_id).count() == 0
    assert db.session.get(User, user_id).is_online is not True


def test_set_online_twice_keeps_a_single_open_session(add_sample_user, init_db):
    user = add_sample_user("testuser_twice", "pwd")

    User.set_online(user.id, True)
    User.set_online(user.id, True)

    assert len(_open_logs(user.id)) == 1


def test_start_session_is_idempotent(sample_user):
    first = SessionLog.start_session(sample_user.id)
    second = SessionLog.start_session(sample_user.id)

    assert second.id == first.id
    assert len(_open_logs(sample_user.id)) == 1

    # Once it has ended, a new start opens a fresh session
    SessionLog.end_session(sample_user.id)
    third = SessionLog.start_session(sample_user.id)
    assert third.id != first.id
    assert SessionLog.query.filter_by(user_id=sample_user.id).count() == 2


def test_end_session_closes_every_open_session(sample_user):
    now = datetime.utcnow()
    orphan_start = now - timedelta(hours=5)
    orphan_seen = now - timedelta(hours=4)
    older_orphan = SessionLog(
        user_id=sample_user.id,
        start_time=now - timedelta(hours=9),
        last_seen=now - timedelta(hours=8),
    )
    orphan = SessionLog(
        user_id=sample_user.id, start_time=orphan_start, last_seen=orphan_seen
    )
    current = SessionLog(
        user_id=sample_user.id, start_time=now - timedelta(minutes=5), last_seen=now
    )
    db.session.add_all([older_orphan, orphan, current])
    db.session.commit()
    ids = (older_orphan.id, orphan.id, current.id)

    closed = SessionLog.end_session(sample_user.id)

    assert closed.id == current.id
    assert _open_logs(sample_user.id) == []
    older_orphan, orphan, current = (db.session.get(SessionLog, i) for i in ids)
    # The newest ends now; orphans end when they were last seen, not now
    assert current.end_time >= now
    assert orphan.end_time == orphan_seen
    assert older_orphan.end_time == now - timedelta(hours=8)


def test_end_session_without_open_session_returns_none(sample_user):
    assert SessionLog.end_session(sample_user.id) is None


def test_touch_refreshes_last_seen_of_the_open_session(sample_user):
    log = SessionLog.start_session(sample_user.id)
    log.last_seen = datetime.utcnow() - timedelta(minutes=20)
    db.session.commit()
    now = datetime.utcnow()

    touched = SessionLog.touch(sample_user.id, now=now)

    assert touched.id == log.id
    assert db.session.get(SessionLog, log.id).last_seen == now
    assert db.session.get(SessionLog, log.id).end_time is None


def test_touch_without_open_session_does_nothing(sample_user):
    SessionLog.start_session(sample_user.id)
    SessionLog.end_session(sample_user.id)

    assert SessionLog.touch(sample_user.id) is None
    assert SessionLog.query.filter_by(user_id=sample_user.id).count() == 1


def test_touch_only_bumps_the_newest_open_session(sample_user):
    now = datetime.utcnow()
    orphan_seen = now - timedelta(hours=4)
    orphan = SessionLog(
        user_id=sample_user.id, start_time=now - timedelta(hours=5), last_seen=orphan_seen
    )
    current = SessionLog(
        user_id=sample_user.id,
        start_time=now - timedelta(minutes=30),
        last_seen=now - timedelta(minutes=20),
    )
    db.session.add_all([orphan, current])
    db.session.commit()

    SessionLog.touch(sample_user.id, now=now)

    assert db.session.get(SessionLog, current.id).last_seen == now
    assert db.session.get(SessionLog, orphan.id).last_seen == orphan_seen


def test_touch_can_leave_the_commit_to_the_caller(sample_user):
    log = SessionLog.start_session(sample_user.id)
    old = log.last_seen

    with patch.object(db.session, "commit") as commit:
        SessionLog.touch(sample_user.id, now=old + timedelta(minutes=1), commit=False)
        commit.assert_not_called()
