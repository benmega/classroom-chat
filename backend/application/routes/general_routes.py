"""
File: general_routes.py
Type: py
Summary: Flask routes for general routes functionality.
"""

from flask import Blueprint, session, redirect, url_for

general = Blueprint("general", __name__)


@general.route("/", defaults={"path": ""}, endpoint="index")
@general.route("/<path:path>")
def index(path):
    """
    Catch-all route to serve the React index.html for client-side routing.
    In production, this allows React Router to take over for non-API paths.
    """
    if path.startswith('api/') or request.path.startswith('/api/'):
        from flask import jsonify
        return jsonify({"error": "API route not found"}), 404
        
    from flask import render_template
    return render_template("index.html")
