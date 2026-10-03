"""
File: general_routes.py
Type: py
Summary: Flask routes for general routes functionality.
"""

from flask import Blueprint, request

general = Blueprint("general", __name__)


@general.route("/", defaults={"path": ""}, endpoint="index")
@general.route("/<path:path>")
def index(path):
    """
    Catch-all route to serve the React index.html for client-side routing.
    In production, this allows React Router to take over for non-API paths.
    """
    if (
        path.startswith(("api/", "achievements/")) or request.path.startswith("/api/") or request.path.startswith("/achievements/")
    ):
        from flask import jsonify

        return jsonify({"error": "Route not found"}), 404

    from flask import g, get_flashed_messages, render_template

    username = g.user.username if hasattr(g, "user") and g.user else None
    rendered = render_template("index.html", username=username)
    flashed = get_flashed_messages()
    if flashed:
        flash_html = "".join(f'<div class="toast-body">{m}</div>' for m in flashed)
        if "</body>" in rendered:
            rendered = rendered.replace("</body>", f"{flash_html}</body>")
        else:
            rendered += flash_html
    return rendered

