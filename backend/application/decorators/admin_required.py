from functools import wraps

from application.models.user import User
from application.utilities.spa import serve_spa_index
from flask import jsonify, request, session


def admin_only(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user_id = session.get("user")

        # Check if this is an API request
        is_api = (
            request.path.startswith("/api/")
            or request.is_json
            or request.accept_mimetypes.accept_json
        )

        if not user_id:
            if is_api:
                return jsonify({"error": "Authentication required"}), 401
            return serve_spa_index()

        from application.extensions import db

        user = db.session.get(User, user_id)
        if not user or user.role != 'admin':
            if is_api:
                return jsonify({"error": "Admin access required"}), 403
            return serve_spa_index()

        return f(*args, **kwargs)

    return wrapper
