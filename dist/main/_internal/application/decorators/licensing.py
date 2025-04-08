# licensing.py
from functools import wraps
from flask import abort, current_app

def premium_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_app.config.get("IS_PREMIUM", False):
            abort(403)
        return f(*args, **kwargs)
    return decorated_function
