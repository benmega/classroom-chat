from functools import wraps
from flask import session, jsonify, request, redirect, url_for, flash


def require_login(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        user_id = session.get("user")
        if not user_id:
            if request.is_json or request.accept_mimetypes.accept_json:
                return (
                    jsonify({"error": "Authentication required. Please log in."}),
                    401,
                )
            flash("Please log in to access this page.", "warning")
            return redirect(url_for("user.login"))
        return view(*args, **kwargs)

    return wrapper
