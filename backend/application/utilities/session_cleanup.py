from datetime import timedelta

from application.extensions import db
from application.models.session_log import SessionLog
from application.models.user import User
from application.utilities.helper_functions import utcnow_naive
from sqlalchemy import exists


def close_stale_sessions(timeout_minutes=10):
    """Close open sessions that stopped showing signs of life; return how many.

    A session is stale when its last_seen is older than the timeout. Everything is
    done with bulk statements: no log or user is loaded for the common case.
    """
    # Imported lazily: this module is loaded while the app package is still importing
    from application.socket_events import connected_user_ids

    now = utcnow_naive()
    cutoff = now - timedelta(minutes=timeout_minutes)
    # Users with an open socket are present even when no HTTP heartbeat reaches
    # us (admin pages and kiosks send none), so their current session is not stale
    connected = list(connected_user_ids())

    if connected:
        needing_refresh = (
            db.session.query(SessionLog.user_id)
            .filter(
                SessionLog.end_time.is_(None),
                SessionLog.last_seen < cutoff,
                SessionLog.user_id.in_(connected),
            )
            .distinct()
            .all()
        )
        for (user_id,) in needing_refresh:
            # Only the newest open session is live: older ones are orphans, which
            # are still closed below at their own last_seen rather than stretched
            # to now
            SessionLog.touch(user_id, now=now, commit=False)

    # Close every open session that stopped heartbeating: it ended when it was
    # last seen. A bulk UPDATE, so no log is loaded and no heartbeat can be lost
    # between a read and a write.
    closed = SessionLog.query.filter(
        SessionLog.end_time.is_(None), SessionLog.last_seen < cutoff
    ).update({SessionLog.end_time: SessionLog.last_seen}, synchronize_session=False)

    # Mark offline every user without an open session left. This covers users whose
    # last session was just closed above and ghosts (marked online with no open
    # session, e.g. after a server crash). A user who still has a fresh open
    # session stays online, and so does anyone with an open socket.
    offline = User.query.filter(
        User.is_online.is_(True),
        ~exists().where(SessionLog.user_id == User.id, SessionLog.end_time.is_(None)),
    )
    if connected:
        offline = offline.filter(User.id.not_in(connected))
    offline.update({User.is_online: False}, synchronize_session=False)

    db.session.commit()
    return closed
