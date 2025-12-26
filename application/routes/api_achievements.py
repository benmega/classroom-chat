"""
File: api_achievements.py
Type: py
Summary: Flask routes for api achievements functionality.
"""

from flask import Blueprint, session, jsonify, url_for
from application.models.user import User
from application.services.achievement_engine import evaluate_user

achievements_api = Blueprint("achievements_api", __name__, url_prefix="/api/achievements")


@achievements_api.route("/check", methods=["GET"])
def check_achievements():
    user_id = session.get("user")
    if not user_id:
        return jsonify({"success": False, "error": "Not logged in"}), 401

    user = User.query.filter_by(id=user_id).first()
    if not user:
        return jsonify({"success": False, "error": "User not found"}), 404

    try:
        new_awards = evaluate_user(user)
    except Exception:
        return jsonify({"success": False, "error": "Failed to evaluate achievements"}), 500

    payload = [
        {
            "id": a.id,
            "name": a.name,
            "badge": url_for(
                "static",
                filename=f"images/achievement_badges/{a.slug}.png",
                _external=False
            )
        }
        for a in new_awards
    ]
    return jsonify({"success": True, "new_awards": payload})
