"""
Unit tests for session cleanup utility.
"""

from datetime import datetime, timedelta
from unittest.mock import patch

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
