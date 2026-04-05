"""
File: general_routes.py
Type: py
Summary: Flask routes for general routes functionality.
"""

from flask import Blueprint, session, redirect, url_for, render_template

general = Blueprint("general", __name__)


@general.route("/")
def index():
    if "user" not in session:
        return redirect(url_for("user.login"))
    return render_template("index.html")
