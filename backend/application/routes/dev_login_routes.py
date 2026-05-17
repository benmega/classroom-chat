"""
File: dev_login_routes.py
Type: py
Summary: Local-only development shortcut login route.
         Blocked in production and from non-localhost addresses.
         Agents should use /dev-login for authentication during normal tasks.

WARNING: This route must NEVER be enabled in production.
         It bypasses the standard password-based login flow.
"""

import os

from flask import (
    Blueprint,
    jsonify,
    request,
    session,
    current_app,
    render_template,
)
from application.models.user import User

dev_login = Blueprint("dev_login", __name__)

# The only hosts considered "local". Extend only if you have a specific need.
_LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost"}

# Canonical agent accounts — username only, no passwords stored here.
_AGENT_ROLES = {
    "admin": "ben",
    "student": "blossomstudent01",
}


def _is_local_request() -> bool:
    """Return True only if the request originates from the local machine."""
    remote = request.remote_addr or ""
    return remote in _LOCAL_HOSTS


def _is_dev_environment() -> bool:
    """Return True only in development mode (DEBUG=True, FLASK_ENV != production)."""
    flask_env = os.getenv("FLASK_ENV", "development").lower()
    is_debug = current_app.config.get("DEBUG", False)
    return flask_env != "production" and is_debug is True


def _resolve_role() -> str:
    """
    Read the role from whichever source is available:
      GET  → query param  ?role=admin
      POST → JSON body    {"role": "admin"}
    Defaults to 'admin' if omitted.
    """
    if request.method == "GET":
        return request.args.get("role", "admin").lower()
    data = request.get_json(silent=True) or {}
    return data.get("role", "admin").lower()


def _perform_login(user_obj: User, role: str):
    """Internal helper to establish the session for a user."""
    session["user"] = user_obj.id
    session.permanent = True
    User.set_online(user_obj.id)
    session["conversation_id"] = None


@dev_login.route("/dev-login", methods=["GET"])
def browser_dev_login():
    """
    Premium browser-facing shortcut for dev-login.
    Matches the 'main app' aesthetics while providing instant authentication.
    """
    if not _is_dev_environment():
        return jsonify({"error": "dev-login is disabled in production"}), 403
    if not _is_local_request():
        return jsonify({"error": "dev-login is only accessible from localhost"}), 403

    role = request.args.get("role", "admin").lower()
    username = _AGENT_ROLES.get(role)
    error = None

    if not username:
        error = f"Unknown role '{role}'. Accepted: {list(_AGENT_ROLES.keys())}"
    else:
        user_obj = User.query.filter_by(username=username).first()
        if not user_obj:
            error = f"Agent user '{username}' not found in DB."
        else:
            _perform_login(user_obj, role)

    # In development, redirect to the Vite dev server to ensure the 'main app' loads.
    # If the user is already on the Vite server, this just brings them to /.
    redirect_url = "http://localhost:5173/"

    return render_template(
        "dev_login.html", role=role, error=error, redirect_url=redirect_url
    )


@dev_login.route("/api/dev-login", methods=["GET", "POST"])
def agent_dev_login():
    """
    Local-only authentication shortcut for agent/automated tasks.

    GET  (browser navigation): /dev-login?role=admin
    POST (programmatic):       body { "role": "admin" | "student" }

    Both methods apply the same security guards. Fails closed on any
    non-local request, production environment, or unrecognised role.
    """
    # --- Guard 1: production is always blocked ---
    if not _is_dev_environment():
        return jsonify({"error": "dev-login is disabled in production"}), 403

    # --- Guard 2: must originate from localhost ---
    if not _is_local_request():
        return jsonify({"error": "dev-login is only accessible from localhost"}), 403

    role = _resolve_role()
    username = _AGENT_ROLES.get(role)
    if not username:
        return (
            jsonify(
                {
                    "error": f"Unknown role '{role}'. Accepted values: {list(_AGENT_ROLES.keys())}"
                }
            ),
            400,
        )

    user_obj = User.query.filter_by(username=username).first()
    if not user_obj:
        return (
            jsonify({"error": f"Agent user '{username}' not found in the database"}),
            404,
        )

    _perform_login(user_obj, role)

    # For browser navigation (GET), use the premium template or redirect.
    if request.method == "GET":
        redirect_url = "http://localhost:5173/"
        return render_template(
            "dev_login.html", role=role, error=None, redirect_url=redirect_url
        )

    return (
        jsonify(
            {
                "success": True,
                "user": user_obj.to_dict(),
                "role": role,
                "message": f"Dev-login successful as '{username}' ({role})",
            }
        ),
        200,
    )
