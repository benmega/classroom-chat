from functools import wraps

from flask import jsonify, session


def require_login(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        user_id = session.get("user")
        if not user_id:
            return jsonify({"error": "Authentication required. Please log in."}), 401
        return view(*args, **kwargs)

    return wrapper
