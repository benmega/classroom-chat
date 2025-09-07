# challenge_routes.py
# Blueprint: Handles challenge submissions separate from chat

from flask import Blueprint, request, session, render_template, redirect, url_for, flash

from application import Configuration
from application.extensions import db
from application.utilities.db_helpers import get_user
from application.utilities.validation_helpers import detect_and_handle_challenge_url

challenge = Blueprint("challenge", __name__, url_prefix="/challenge")


@challenge.route("/submit", methods=["GET", "POST"])
def submit_challenge():
    session_username = session.get("user", None)
    if not session_username:
        flash("No session username found", "error")
        return redirect(url_for("auth.login"))

    user = get_user(session_username)
    if not user:
        flash("Unknown user", "error")
        return redirect(url_for("auth.login"))

    config = Configuration.query.first()
    if not config:
        flash("Configuration missing", "error")
        return redirect(url_for("index"))

    if request.method == "POST":
        url = request.form.get("url")
        helpers = request.form.get("helpers", "").strip()
        notes = request.form.get("notes", "").strip()

        if not url:
            flash("Challenge URL is required", "error")
            return redirect(url_for("challenge.submit_challenge"))

        # Process challenge
        duck_multiplier = config.duck_multiplier
        challenge_check = detect_and_handle_challenge_url(url, user.username, duck_multiplier)

        if challenge_check.get("handled") and challenge_check["details"].get("success"):
            db.session.commit()  # Persist any changes made
            return render_template(
                "submit_challenge.html",
                success=True,
                message=f"Congrats {user.username}, you earned {duck_multiplier} ducks!",
    ***REMOVED***

        msg = challenge_check.get("details", {}).get("message", "Challenge could not be validated")
        return render_template("submit_challenge.html", success=False, message=msg)

    return render_template("submit_challenge.html")
