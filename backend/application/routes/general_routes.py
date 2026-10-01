"""
File: general_routes.py
Type: py
Summary: Flask routes for general routes functionality.
"""

import os

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
    from flask import g

    username = g.user.username if hasattr(g, "user") and g.user else None
    return serve_spa_index(username=username)
