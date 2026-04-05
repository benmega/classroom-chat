"""
File: general_routes.py
Type: py
Summary: Flask routes for general routes functionality.
"""

from flask import Blueprint, session, redirect, url_for, render_template

general = Blueprint("general", __name__)


@general.route("/", defaults={"path": ""}, endpoint="index")
@general.route("/<path:path>")
def index(path):
    """
    Catch-all route to serve the React index.html for client-side routing.
    In production, this allows React Router to take over for non-API paths.
    """
    return render_template("index.html")
