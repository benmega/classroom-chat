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
