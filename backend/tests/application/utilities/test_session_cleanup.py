"""
Unit tests for session cleanup utility.
"""

from datetime import datetime, timedelta
from unittest.mock import patch

from application import socket_events
from application.extensions import db
from application.models.session_log import SessionLog
from application.models.user import User
from application.utilities.session_cleanup import close_stale_sessions
from sqlalchemy import event
from tests.factories import UserFactory


def test_close_stale_sessions_no_stale(test_app, init_db):
    with test_app.app_context():
        stale_count = close_stale_sessions(timeout_minutes=10)
        assert stale_count == 0


def test_close_stale_sessions_with_stale_user(test_app, sample_user):
    with test_app.app_context():
        user = db.session.get(User, sample_user.id)
        user.is_online = True

        old_time = datetime.utcnow() - timedelta(minutes=30)
        session_log = SessionLog(
            user_id=user.id,
            start_time=old_time,
            last_seen=old_time,
            end_time=None,
        )
        db.session.add(session_log)
        db.session.commit()

        stale_count = close_stale_sessions(timeout_minutes=10)
        assert stale_count == 1

        updated_log = db.session.get(SessionLog, session_log.id)
        assert updated_log.end_time is not None

        updated_user = db.session.get(User, user.id)
        assert updated_user.is_online is False


def test_close_stale_sessions_stale_missing_user(test_app, sample_user):
    with test_app.app_context():
        user = db.session.get(User, sample_user.id)
        user.is_online = True

        old_time = datetime.utcnow() - timedelta(minutes=30)
        session_log = SessionLog(
            user_id=user.id,
            start_time=old_time,
            last_seen=old_time,
            end_time=None,
        )
        db.session.add(session_log)
        db.session.commit()

        log_id = session_log.id

        # Mock db.session.get so it returns None when looking up the User
        with patch.object(db.session, "get", return_value=None):
            stale_count = close_stale_sessions(timeout_minutes=10)
            assert stale_count == 1

        updated_log = db.session.get(SessionLog, log_id)
        assert updated_log.end_time is not None


def test_close_stale_sessions_ghost_user(test_app, sample_user):
    with test_app.app_context():
        user = db.session.get(User, sample_user.id)
        user.is_online = True
        db.session.commit()

        stale_count = close_stale_sessions(timeout_minutes=10)
        assert stale_count == 0

        updated_user = db.session.get(User, user.id)
        assert updated_user.is_online is False


def test_close_stale_sessions_active_user_kept(test_app, sample_user):
    with test_app.app_context():
        user = db.session.get(User, sample_user.id)
        user.is_online = True
        now = datetime.utcnow()
        session_log = SessionLog(
            user_id=user.id,
            start_time=now,
            last_seen=now,
            end_time=None,
        )
        db.session.add(session_log)
        db.session.commit()

        stale_count = close_stale_sessions(timeout_minutes=10)
        assert stale_count == 0

        updated_user = db.session.get(User, user.id)
        assert updated_user.is_online is True


def _open_log(user_id, minutes_ago):
    seen = datetime.utcnow() - timedelta(minutes=minutes_ago)
    log = SessionLog(user_id=user_id, start_time=seen, last_seen=seen, end_time=None)
    db.session.add(log)
    return log


def test_close_stale_sessions_closes_log_at_last_seen(test_app, sample_user):
    with test_app.app_context():
        user = db.session.get(User, sample_user.id)
        user.is_online = True
        log = _open_log(user.id, 30)
        db.session.commit()
        last_seen = log.last_seen

        assert close_stale_sessions(timeout_minutes=10) == 1

        assert db.session.get(SessionLog, log.id).end_time == last_seen


def test_close_stale_sessions_timeout_is_configurable(test_app, sample_user):
    with test_app.app_context():
        user = db.session.get(User, sample_user.id)
        user.is_online = True
        log = _open_log(user.id, 30)
        db.session.commit()

        # 30 minutes idle is within a 60 minute timeout: nothing happens
        assert close_stale_sessions(timeout_minutes=60) == 0
        assert db.session.get(SessionLog, log.id).end_time is None
        assert db.session.get(User, user.id).is_online is True

        assert close_stale_sessions(timeout_minutes=5) == 1
        assert db.session.get(SessionLog, log.id).end_time is not None
        assert db.session.get(User, user.id).is_online is False


def test_close_stale_sessions_mixed_users(test_app, init_db):
    with test_app.app_context():
        stale = UserFactory(is_online=True)
        fresh = UserFactory(is_online=True)
        ghost = UserFactory(is_online=True)
        offline = UserFactory(is_online=False)
        stale_log = _open_log(stale.id, 45)
        fresh_log = _open_log(fresh.id, 1)
        db.session.commit()
        ids = (stale.id, fresh.id, ghost.id, offline.id)
        stale_log_id, fresh_log_id = stale_log.id, fresh_log.id

        assert close_stale_sessions(timeout_minutes=10) == 1

        online = {i: db.session.get(User, i).is_online for i in ids}
        assert online == {
            stale.id: False,
            fresh.id: True,
            ghost.id: False,
            offline.id: False,
        }
        assert db.session.get(SessionLog, stale_log_id).end_time is not None
        assert db.session.get(SessionLog, fresh_log_id).end_time is None


def test_close_stale_sessions_keeps_user_with_fresh_session_online(test_app, sample_user):
    with test_app.app_context():
        user = db.session.get(User, sample_user.id)
        user.is_online = True
        stale_log = _open_log(user.id, 30)
        fresh_log = _open_log(user.id, 0)
        db.session.commit()
        stale_log_id, fresh_log_id = stale_log.id, fresh_log.id

        assert close_stale_sessions(timeout_minutes=10) == 1

        # The orphaned log is closed but the live one still counts the user online
        assert db.session.get(SessionLog, stale_log_id).end_time is not None
        assert db.session.get(SessionLog, fresh_log_id).end_time is None
        assert db.session.get(User, user.id).is_online is True


def test_close_stale_sessions_already_closed_logs_untouched(test_app, sample_user):
    with test_app.app_context():
        user = db.session.get(User, sample_user.id)
        old = datetime.utcnow() - timedelta(hours=3)
        closed_at = old + timedelta(minutes=5)
        log = SessionLog(
            user_id=user.id, start_time=old, last_seen=old, end_time=closed_at
        )
        db.session.add(log)
        db.session.commit()

        assert close_stale_sessions(timeout_minutes=10) == 0

        assert db.session.get(SessionLog, log.id).end_time == closed_at


def test_close_stale_sessions_uses_a_constant_number_of_statements(test_app, init_db):
    with test_app.app_context():
        for _ in range(15):
            user = UserFactory(is_online=True)
            _open_log(user.id, 30)
        for _ in range(5):
            UserFactory(is_online=True)  # ghosts
        db.session.commit()

        statements = []

        def count(conn, cursor, statement, parameters, context, executemany):
            statements.append(statement)

        event.listen(db.engine, "before_cursor_execute", count)
        try:
            assert close_stale_sessions(timeout_minutes=10) == 15
        finally:
            event.remove(db.engine, "before_cursor_execute", count)

        # One bulk UPDATE for the logs and one for the users: no per-user queries
        verbs = [s.split(None, 1)[0].upper() for s in statements]
        assert verbs == ["UPDATE", "UPDATE"]
        assert User.query.filter_by(is_online=True).count() == 0


def test_close_stale_sessions_stays_bulk_with_open_sockets(
    test_app, init_db, monkeypatch
):
    with test_app.app_context():
        connected_ids = []
        for _ in range(10):
            user = UserFactory(is_online=True)
            _open_log(user.id, 1)  # fresh: nothing to refresh for these users
            connected_ids.append(user.id)
        stale_user = UserFactory(is_online=True)
        _open_log(stale_user.id, 30)
        db.session.commit()
        for user_id in connected_ids:
            monkeypatch.setitem(socket_events._active_sessions, user_id, {f"sid-{user_id}"})

        statements = []

        def count(conn, cursor, statement, parameters, context, executemany):
            statements.append(statement)

        event.listen(db.engine, "before_cursor_execute", count)
        try:
            assert close_stale_sessions(timeout_minutes=10) == 1
        finally:
            event.remove(db.engine, "before_cursor_execute", count)

        # One lookup of connected users with a stale session (none) plus the two
        # bulk UPDATEs: the socket-aware path adds no per-user queries
        verbs = [s.split(None, 1)[0].upper() for s in statements]
        assert verbs == ["SELECT", "UPDATE", "UPDATE"]
        assert User.query.filter_by(is_online=True).count() == len(connected_ids)


def test_close_stale_sessions_prints_nothing(test_app, init_db, capsys):
    with test_app.app_context():
        close_stale_sessions(timeout_minutes=10)

    assert capsys.readouterr().out == ""


def _open_stale_session(user, minutes=30, online=True):
    user.is_online = online
    old_time = datetime.utcnow() - timedelta(minutes=minutes)
    session_log = SessionLog(
        user_id=user.id, start_time=old_time, last_seen=old_time, end_time=None
    )
    db.session.add(session_log)
    db.session.commit()
    return session_log


def test_close_stale_sessions_keeps_session_of_user_with_open_socket(
    test_app, sample_user, monkeypatch
):
    # An admin on /admin/* pages has a socket but sends no HTTP heartbeat
    with test_app.app_context():
        session_log = _open_stale_session(db.session.get(User, sample_user.id))
        monkeypatch.setitem(socket_events._active_sessions, sample_user.id, {"sid-1"})

        stale_count = close_stale_sessions(timeout_minutes=10)

        assert stale_count == 0
        kept = db.session.get(SessionLog, session_log.id)
        assert kept.end_time is None
        # Still open, and no longer about to be closed on the next run either
        assert kept.last_seen > datetime.utcnow() - timedelta(minutes=1)
        assert db.session.get(User, sample_user.id).is_online is True


def test_close_stale_sessions_closes_session_once_the_socket_is_gone(
    test_app, sample_user, monkeypatch
):
    with test_app.app_context():
        session_log = _open_stale_session(db.session.get(User, sample_user.id))
        monkeypatch.setitem(socket_events._active_sessions, sample_user.id, {"sid-1"})
        assert close_stale_sessions(timeout_minutes=10) == 0

        socket_events._active_sessions.pop(sample_user.id)
        db.session.get(SessionLog, session_log.id).last_seen = datetime.utcnow() - timedelta(minutes=30)
        db.session.commit()

        assert close_stale_sessions(timeout_minutes=10) == 1
        assert db.session.get(SessionLog, session_log.id).end_time is not None
        assert db.session.get(User, sample_user.id).is_online is False


def test_close_stale_sessions_only_spares_users_with_sockets(
    test_app, sample_user, sample_admin, monkeypatch
):
    with test_app.app_context():
        student_log = _open_stale_session(db.session.get(User, sample_user.id))
        admin_log = _open_stale_session(db.session.get(User, sample_admin.id))
        monkeypatch.setitem(socket_events._active_sessions, sample_admin.id, {"sid-1"})

        assert close_stale_sessions(timeout_minutes=10) == 1

        assert db.session.get(SessionLog, student_log.id).end_time is not None
        assert db.session.get(SessionLog, admin_log.id).end_time is None
        assert db.session.get(User, sample_user.id).is_online is False
        assert db.session.get(User, sample_admin.id).is_online is True


def test_close_stale_sessions_ghost_pass_spares_user_with_open_socket(
    test_app, sample_user, monkeypatch
):
    with test_app.app_context():
        user = db.session.get(User, sample_user.id)
        user.is_online = True
        db.session.commit()
        monkeypatch.setitem(socket_events._active_sessions, sample_user.id, {"sid-1"})

        assert close_stale_sessions(timeout_minutes=10) == 0

        assert db.session.get(User, sample_user.id).is_online is True


def test_close_stale_sessions_still_closes_orphans_of_a_connected_user(
    test_app, sample_user, monkeypatch
):
    # Only the newest open session is the live one; an older one stopped getting
    # heartbeats long ago and must end at its own last_seen, not at now
    with test_app.app_context():
        user = db.session.get(User, sample_user.id)
        orphan = _open_stale_session(user, minutes=300)
        orphan_seen = orphan.last_seen
        current = _open_stale_session(user, minutes=30)
        monkeypatch.setitem(socket_events._active_sessions, sample_user.id, {"sid-1"})

        assert close_stale_sessions(timeout_minutes=10) == 1

        closed = db.session.get(SessionLog, orphan.id)
        assert closed.end_time == orphan_seen
        kept = db.session.get(SessionLog, current.id)
        assert kept.end_time is None
        assert kept.last_seen > datetime.utcnow() - timedelta(minutes=1)
        # Closing the orphan does not take the connected user offline
        assert db.session.get(User, sample_user.id).is_online is True
