"""
File: dev_login_routes.py
Type: py
Summary: Local-only development shortcut login routes.
         Blocked in production and from non-localhost addresses.
         Agents should POST {"role": "admin"} to /api/dev-login for authentication
         during normal tasks. GET /dev-login and GET /api/dev-login log in from a
         browser tab and show a helper page that forwards to the Vite dev server.
         The Vite dev server proxies /api/* to Flask, so /api/dev-login works on
         both ports; /dev-login is only Flask's (the Vite server's own /dev-login
         is the React DevLogin page, which POSTs to /api/dev-login).

WARNING: This route must NEVER be enabled in production.
         It bypasses the standard password-based login flow.
"""

import os

from application.models.user import User
from application.utilities.spa import VITE_DEV_URL
from flask import (
    Blueprint,
    current_app,
    jsonify,
    render_template,
    request,
    session,
)

dev_login = Blueprint("dev_login", __name__)

# The only hosts considered "local". Extend only if you have a specific need.
_LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost"}

# Canonical agent accounts — username only, no passwords stored here.
_AGENT_ROLES = {
    "admin": "ben",
    "student": "blossomstudent01",
    "parent": "test_parent",
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
    Defaults to 'admin' if omitted. A role that is not a string is returned as its
    text, so it is reported as an unknown role instead of raising.
    """
    if request.method == "GET":
        role = request.args.get("role")
    else:
        data = request.get_json(silent=True)
        role = data.get("role") if isinstance(data, dict) else None
    return "admin" if role is None else str(role).lower()


def _guard_response():
    """Return a 403 JSON response unless this is a local request in development."""
    if not _is_dev_environment():
        return jsonify({"error": "dev-login is disabled in production"}), 403
    if not _is_local_request():
        return jsonify({"error": "dev-login is only accessible from localhost"}), 403
    return None


def _redirect_url_for(role: str) -> str:
    """Vite dev-server page to open once logged in as ``role``."""
    redirect_url = f"{VITE_DEV_URL}/"
    if role == "admin":
        redirect_url += "admin/dashboard"
    elif role == "parent":
        redirect_url += "parent/dashboard"
    else:
        redirect_url += "chat"
    return redirect_url


def _render_dev_login(role: str, error=None):
    """Render the browser landing page that forwards to the Vite dev server."""
    return render_template(
        "dev_login.html", role=role, error=error, redirect_url=_redirect_url_for(role)
    )


def _perform_login(user_obj: User):
    """Internal helper to establish the session for a user."""
    session["user"] = user_obj.id
    session.permanent = True
    User.set_online(user_obj.id)

    from application.services.achievement_engine import evaluate_user
    evaluate_user(user_obj)


@dev_login.route("/dev-login", methods=["GET"])
def browser_dev_login():
    """
    Browser-facing dev-login: log in, then show the helper page that forwards to
    the Vite dev server (GET /dev-login?role=admin).

    This is Flask's page (e.g. http://localhost:8000/dev-login). On the Vite dev
    server itself /dev-login is the React DevLogin page, not this route.
    """
    blocked = _guard_response()
    if blocked:
        return blocked

    role = _resolve_role()
    username = _AGENT_ROLES.get(role)
    error = None

    if not username:
        error = f"Unknown role '{role}'. Accepted: {list(_AGENT_ROLES.keys())}"
    else:
        user_obj = User.query.filter_by(username=username).first()
        if not user_obj:
            error = f"Agent user '{username}' not found in DB."
        else:
            _perform_login(user_obj)

    # In development, redirect to the Vite dev server to ensure the 'main app' loads.
    # If the user is already on the Vite server, this just brings them to /.
    return _render_dev_login(role, error)


@dev_login.route("/api/dev-login", methods=["GET", "POST"])
def agent_dev_login():
    """
    Local-only authentication shortcut for agent/automated tasks.

    POST (programmatic):       /api/dev-login, body { "role": "admin" | "student" | "parent" }
    GET  (browser navigation): /api/dev-login?role=admin, shows the same helper
                               page as GET /dev-login

    Both methods apply the same security guards. Fails closed on any
    non-local request, production environment, or unrecognised role.
    """
    # Guards: production is always blocked, and the request must be from localhost.
    blocked = _guard_response()
    if blocked:
        return blocked

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

    _perform_login(user_obj)

    # For browser navigation (GET), show the helper page that forwards to Vite.
    if request.method == "GET":
        return _render_dev_login(role)

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
