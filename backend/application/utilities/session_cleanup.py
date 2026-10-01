from datetime import datetime, timedelta

from application.extensions import db
from application.models.session_log import SessionLog
from application.models.user import User


def close_stale_sessions(timeout_minutes=10):
    print("checking for stale sessions")
    # Imported lazily: this module is loaded while the app package is still importing
    from application.socket_events import connected_user_ids

    now = datetime.utcnow()
    cutoff = now - timedelta(minutes=timeout_minutes)
    # Users with an open socket are present even when no HTTP heartbeat reaches
    # us (admin pages and kiosks send none), so their current session is not stale
    connected = connected_user_ids()
    stale = SessionLog.query.filter(
        SessionLog.end_time.is_(None), SessionLog.last_seen < cutoff
    ).all()
    for user_id in {log.user_id for log in stale} & connected:
        # Only the newest open session is live: older ones are orphans, which are
        # still closed below at their own last_seen rather than stretched to now
        SessionLog.touch(user_id, now=now, commit=False)
    stale = [log for log in stale if log.last_seen < cutoff]

    for log in stale:
        log.end_time = log.last_seen
        user = db.session.get(User, log.user_id)
        if user and user.id not in connected:
            user.is_online = False

    # Ghost cleanup: Any user marked online but with no open session logs
    # is likely a remnant of a previous server crash or bug.
    all_online_users = User.query.filter_by(is_online=True).all()
    for user in all_online_users:
        if user.id in connected:
            continue
        if not SessionLog.query.filter_by(user_id=user.id, end_time=None).first():
            user.is_online = False

    db.session.commit()
    return len(stale)
