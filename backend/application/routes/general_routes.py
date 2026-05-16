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
        path.startswith("api/")
        or request.path.startswith("/api/")
        or path.startswith("achievements/")
        or request.path.startswith("/achievements/")
    ):
        from flask import jsonify

        return jsonify({"error": "Route not found"}), 404

    from flask import render_template, g

    username = g.user.username if hasattr(g, "user") and g.user else None
    return render_template("index.html", username=username)
