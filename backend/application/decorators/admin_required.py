from functools import wraps
from flask import session, jsonify, render_template, request
from application.models.user import User

def admin_only(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user_id = session.get("user")
        if not user_id:
            if request.is_json or request.accept_mimetypes.accept_json:
                return jsonify({"error": "Authentication required"}), 401
            return render_template("index.html")

        user = User.query.get(user_id)
        if not user or not user.is_admin:
            if request.is_json or request.accept_mimetypes.accept_json:
                return jsonify({"error": "Admin access required"}), 403
            return render_template("index.html")

        return f(*args, **kwargs)
    return wrapper
