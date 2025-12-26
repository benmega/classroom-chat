# application/utilities/session_cleanup.py
from datetime import datetime, timedelta

from application.extensions import db
from application.models.session_log import SessionLog


def close_stale_sessions(timeout_minutes=30):
    print("checking for stale sessions")
    cutoff = datetime.utcnow() - timedelta(minutes=timeout_minutes)
    stale = SessionLog.query.filter(
        SessionLog.end_time is None, SessionLog.last_seen < cutoff
    ).all()

    for log in stale:
        log.end_time = log.last_seen
    db.session.commit()
    return len(stale)
