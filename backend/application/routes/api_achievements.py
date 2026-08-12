"""
File: api_achievements.py
Type: py
Summary: Flask routes for api achievements functionality.
"""

from application.models.user import User
from application.services.achievement_engine import evaluate_user
from flask import Blueprint, jsonify, session, url_for

from .achievement_routes import (
    add_achievement,
    admin_certificate_templates,
    admin_certificate_templates_test_generate,
    admin_certificate_templates_upload,
    admin_certificate_templates_view,
    admin_certificates,
    download_all_certificates,
    download_certificate,
    get_achievements_json,
    mark_all_reviewed,
    mark_reviewed,
    reject_certificate,
    submit_certificate,
    view_certificate,
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


@achievements_api.route("/admin/certificates/reviewed/all", methods=["POST"])
def api_mark_all_reviewed():
    return mark_all_reviewed()


@achievements_api.route("/admin/certificates/reject/<int:cert_id>", methods=["POST"])
def api_reject_certificate(cert_id):
    return reject_certificate(cert_id)


@achievements_api.route("/admin/certificates/download_all", methods=["GET"])
def api_download_all_certificates():
    return download_all_certificates()


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

@achievements_api.route("/admin/certificate_templates", methods=["GET"])
def api_admin_certificate_templates():
    return admin_certificate_templates()

@achievements_api.route("/admin/certificate_templates/<course_id>/view", methods=["GET"])
def api_admin_certificate_templates_view(course_id):
    return admin_certificate_templates_view(course_id)

@achievements_api.route("/admin/certificate_templates/<course_id>/upload", methods=["POST"])
def api_admin_certificate_templates_upload(course_id):
    return admin_certificate_templates_upload(course_id)

@achievements_api.route("/admin/certificate_templates/<course_id>/test_generate", methods=["POST"])
def api_admin_certificate_templates_test_generate(course_id):
    return admin_certificate_templates_test_generate(course_id)

