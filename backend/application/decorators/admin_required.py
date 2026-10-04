from functools import wraps

from application.models.user import User
from flask import jsonify, session


def admin_only(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user_id = session.get("user")

        if not user_id:
            return jsonify({"error": "Authentication required"}), 401

        from application.extensions import db

        user = db.session.get(User, user_id)
        if not user or user.role != 'admin':
            return jsonify({"error": "Admin access required"}), 403

        return f(*args, **kwargs)

    return wrapper
