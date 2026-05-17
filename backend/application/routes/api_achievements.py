"""
File: api_achievements.py
Type: py
Summary: Flask routes for api achievements functionality.
"""

from flask import Blueprint, session, jsonify, url_for

from application.models.user import User
from application.services.achievement_engine import evaluate_user
from .achievement_routes import (
    get_achievements_json, 
    submit_certificate, 
    add_achievement,
    admin_certificates,
    mark_reviewed,
    view_certificate,
    download_certificate
)

achievements_api = Blueprint(
    "achievements_api", __name__, url_prefix="/api/achievements"
)


@achievements_api.route("/all", methods=["GET"])
def all_achievements():
    return get_achievements_json()


@achievements_api.route("/submit_certificate", methods=["POST"])
def api_submit_certificate():
    return submit_certificate()


@achievements_api.route("/add", methods=["POST"])
def api_add_achievement():
    return add_achievement()


@achievements_api.route("/admin/certificates", methods=["GET"])
def api_admin_certificates():
    return admin_certificates()


@achievements_api.route("/admin/certificates/reviewed/<int:cert_id>", methods=["POST"])
def api_mark_reviewed(cert_id):
    return mark_reviewed(cert_id)


@achievements_api.route("/view_certificate/<int:cert_id>", methods=["GET"])
def api_view_certificate(cert_id):
    return view_certificate(cert_id)


@achievements_api.route("/download_certificate/<int:cert_id>", methods=["GET"])
def api_download_certificate(cert_id):
    return download_certificate(cert_id)


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
        # Also update user skills progress
        from application.services.skill_service import evaluate_user_skills

        evaluate_user_skills(user)
    except Exception:
        return (
            jsonify({"success": False, "error": "Failed to evaluate achievements"}),
            500,
        )

    payload = [
        {
            "id": a.id,
            "name": a.name,
            "badge": url_for(
                "static",
                filename=f"images/achievement_badges/{a.slug}.png",
                _external=False,
            ),
        }
        for a in new_awards
    ]
    return jsonify({"success": True, "new_awards": payload})
