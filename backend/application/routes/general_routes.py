"""
File: general_routes.py
Type: py
Summary: Flask routes for general routes functionality.
"""

import os
from html import escape

from flask import Blueprint, current_app, request, send_from_directory

general = Blueprint("general", __name__)


@general.route("/static/sounds/<path:filename>")
def vite_public_static(filename):
    """
    Dev fallback: the Vite dev server proxies /static to Flask, but the
    sounds live in frontend/public/static (shipped in dist for S3/production).
    Serve them from there.
    """
    root = os.path.abspath(
        os.path.join(current_app.root_path, "..", "..", "frontend", "public", "static", "sounds")
    )
    return send_from_directory(root, filename)


@general.route("/", defaults={"path": ""}, endpoint="index")
@general.route("/<path:path>")
def index(path):
    """
    Catch-all route to serve the React index.html for client-side routing.
    In production, this allows React Router to take over for non-API paths.
    """
    if path.startswith("api/") or request.path.startswith("/api/"):
        from flask import jsonify

        return jsonify({"error": "Route not found"}), 404

    from application.utilities.spa import serve_spa_index
    from flask import g, get_flashed_messages

    username = g.user.username if hasattr(g, "user") and g.user else None
    rendered = serve_spa_index(username=username)
    if not isinstance(rendered, str):
        # Not served by Flask in this environment (JSON 404 response).
        return rendered

    # Surface server-side flash() messages (e.g. certificate download errors)
    # to the React app by appending them to the served page.
    flashed = get_flashed_messages()
    if flashed:
        flash_html = "".join(
            f'<div class="toast-body">{escape(m)}</div>' for m in flashed
        )
        if "</body>" in rendered:
            rendered = rendered.replace("</body>", f"{flash_html}</body>")
        else:
            rendered += flash_html
    return rendered
