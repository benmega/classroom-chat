# application/utilities/session_cleanup.py
from datetime import datetime, timedelta

from application.extensions import db
from application.models.session_log import SessionLog


from application.models.user import User


def close_stale_sessions(timeout_minutes=10):
    print("checking for stale sessions")
    cutoff = datetime.utcnow() - timedelta(minutes=timeout_minutes)
    stale = SessionLog.query.filter(
        SessionLog.end_time == None, SessionLog.last_seen < cutoff
    ).all()

    for log in stale:
        log.end_time = log.last_seen
        # Also mark the user as offline
        user = User.query.get(log.user_id)
        if user:
            user.is_online = False
            
    # Ghost cleanup: Any user marked online but with no open session logs
    # is likely a remnant of a previous server crash or bug.
    all_online_users = User.query.filter_by(is_online=True).all()
    for user in all_online_users:
        if not SessionLog.query.filter_by(user_id=user.id, end_time=None).first():
            user.is_online = False

    db.session.commit()
    return len(stale)
