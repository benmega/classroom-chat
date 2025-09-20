# application/routes/session_routes.py

from flask import Blueprint, jsonify
from datetime import datetime


from application.extensions import db
from flask import Blueprint, jsonify, request, session as flask_session
from application.models.session_log import SessionLog

session = Blueprint('session', __name__)

@session.route('/heartbeat', methods=['POST'])
def heartbeat():
    username = flask_session.get('user')
    if not username:
        return jsonify(success=False, error="Missing username"), 400
    from application import User # TODO refactor to avoid circular import
    current_user = User.query.filter_by(username=username).first()
    user_id = current_user.id

    log = SessionLog.query.filter_by(user_id=user_id, end_time=None) \
                          .order_by(SessionLog.start_time.desc()) \
                          .first()
    if log:
        log.last_seen = datetime.utcnow()
        db.session.commit()
    else:
        print(f"No log found for {user_id}")
    return jsonify(success=True, timestamp=datetime.utcnow().isoformat())
