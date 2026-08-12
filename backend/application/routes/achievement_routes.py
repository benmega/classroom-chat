import io
import os
import re
import subprocess
import sys
import zipfile
from datetime import datetime
from typing import Any

from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response
from application.extensions import db
from application.models.achievements import Achievement
from application.models.user import User
from application.models.user_certificate import UserCertificate
from application.utilities.helper_functions import allowed_file
from flask import (
    Blueprint,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    send_file,
    send_from_directory,
    session,
    url_for,
)
from sqlalchemy.orm import joinedload
from werkzeug.utils import secure_filename

achievements = Blueprint("achievements", __name__)

# Updated to allow codecombat.com and ozaria.com (with optional www)
CERT_URL_REGEX = r"https://(?:www\.)?(?:codecombat|ozaria)\.com/certificates/[\w\d]+\?.*course=([\w\d-]+)"


ALLOWED_EXTENSIONS = {"pdf"}


# API for the achievements data
@achievements.route("/all")
def get_achievements_json():
    """API endpoint to get all achievements and user's earned ones"""
    user_id = session.get("user")
    current_user = (
        User.query.options(joinedload(User.achievements)).filter_by(id=user_id).first()
    )

    if not current_user:
        return jsonify({"success": False, "error": "User not found!"}), 404

    # Automatically check for new achievements when visiting the page
    from application.models.challenge_log import ChallengeLog
    from application.models.duck_trade import DuckTradeLog
    from application.models.message import Message
    from application.services.achievement_engine import (
        _calculate_consistency,
        evaluate_user,
        get_achievement_progress,
        longest_session_minutes,
    )
    from sqlalchemy import func

    evaluate_user(current_user)

    # Pre-calculate stats for speed
    stats = {
        "chat_count": db.session.query(func.count(Message.id))
        .filter(Message.user_id == current_user.id)
        .scalar(),
        "consistency_streak": _calculate_consistency(current_user.id),
        "community_count": db.session.query(func.count(ChallengeLog.id))
        .filter(func.lower(ChallengeLog.helper) == current_user.username.lower())
        .scalar(),
        "max_session": longest_session_minutes(current_user.id),
        "trade_count": db.session.query(func.count(DuckTradeLog.id))
        .filter(DuckTradeLog.user_id == current_user.id)
        .scalar(),
    }

    user_achievements = {ua.achievement_id for ua in current_user.achievements}
    all_achievements = Achievement.query.all()

    achievements_data = []
    for a in all_achievements:
        d = a.to_dict()
        curr, req = get_achievement_progress(current_user, a, stats=stats)
        d["current_progress"] = int(curr) if isinstance(curr, (int, float)) else curr
        d["requirement_value"] = req
        achievements_data.append(d)

    return jsonify(
        {
            "status": "success",
            "data": {
                "achievements": achievements_data,
                "user_achievements": list(user_achievements),
            },
        }
    )


# Legacy SSR page for achievements
@achievements.route("/")
@achievements.route("/view")
def achievements_page():
    if request.is_json or request.accept_mimetypes.accept_json:
        return get_achievements_json()

    user_id = session.get("user")
    current_user = User.query.filter_by(id=user_id).first()
    if not current_user:
        return jsonify({"success": False, "error": "User not found!"}), 404

    return render_template("achievements.html", user=current_user)


@achievements.route("/add", methods=["GET", "POST"])
@admin_only
def add_achievement():
    data = request.get_json() if request.is_json else request.form

    if request.method == "GET":
        if request.is_json or request.accept_mimetypes.accept_json:
            return jsonify({"status": "ready"}), 200
        return render_template("add_achievement.html"), 200

    name = data.get("name")
    slug = data.get("slug")
    description = data.get("description")
    achievement_type = data.get("type", "ducks")
    reward = int(data.get("reward") or 1)
    requirement_value = data.get("requirement_value") or None
    source = data.get("source")

    if not name or not slug:
        return (
            jsonify({"status": "error", "message": "Name and Slug are required."}),
            400,
        )

    # Check for existing slug
    existing = Achievement.query.filter_by(slug=slug).first()
    if existing:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Achievement with this slug already exists.",
                }
            ),
            400,
        )

    # Handle Badge Upload
    badge_file = request.files.get("badge")
    if badge_file and badge_file.filename != "":
        allowed_badge_ext = {"png", "jpg", "jpeg", "webp"}
        if not allowed_file(badge_file.filename, allowed_badge_ext):
            return (
                jsonify({"status": "error", "message": "Invalid badge file type."}),
                200,
            )

        from flask import current_app

        # We save to frontend/static/images/achievement_badges/
        # which is current_app.static_folder / "images" / "achievement_badges"
        badge_dir = os.path.join(
            str(current_app.static_folder), "images", "achievement_badges"
        )
        os.makedirs(badge_dir, exist_ok=True)

        ext = (badge_file.filename or "").rsplit(".", 1)[1].lower()
        filename = f"{slug}.{ext}"
        filepath = os.path.join(badge_dir, filename)
        badge_file.save(filepath)

        # Trigger sprite sheet rebuild
        try:
            tools_dir = os.path.join(current_app.config["BASE_DIR"], "backend", "tools")
            script_path = os.path.join(tools_dir, "make_sprite_sheet.py")
            subprocess.run(
                [sys.executable, script_path],
                check=True,
                capture_output=True,
                text=True,
            )
        except subprocess.CalledProcessError as e:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": f"Sprite sheet rebuild failed: {e.stderr}",
                    }
                ),
                500,
            )
        except Exception as e:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": f"Error rebuilding sprite sheet: {e}",
                    }
                ),
                500,
            )

    ach = Achievement(
        name=name,
        slug=slug,
        type=achievement_type,
        reward=reward,
        description=description,
        requirement_value=requirement_value,
        source=source,
    )
    db.session.add(ach)
    db.session.commit()

    return jsonify(
        {"status": "success", "message": f"Achievement '{name}' added successfully!"}
    )

@achievements.route("/edit/<int:id>", methods=["PUT"])
@admin_only
def edit_achievement(id):
    ach = Achievement.query.get(id)
    if not ach:
        return jsonify({"status": "error", "message": "Achievement not found."}), 404

    data = request.form
    name = data.get("name")
    slug = data.get("slug")
    description = data.get("description")
    achievement_type = data.get("type")
    reward = data.get("reward")
    requirement_value = data.get("requirement_value")
    source = data.get("source")

    if name: ach.name = name
    if slug:
        existing = Achievement.query.filter(Achievement.slug == slug, Achievement.id != id).first()
        if existing:
            return jsonify({"status": "error", "message": "Achievement with this slug already exists."}), 400
        ach.slug = slug
    if description is not None: ach.description = description
    if achievement_type: ach.type = achievement_type
    if reward: ach.reward = int(reward)
    if requirement_value is not None: ach.requirement_value = requirement_value
    if source is not None: ach.source = source

    badge_file = request.files.get("badge")
    if badge_file and badge_file.filename != "":
        allowed_badge_ext = {"png", "jpg", "jpeg", "webp"}
        if not allowed_file(badge_file.filename, allowed_badge_ext):
            return jsonify({"status": "error", "message": "Invalid badge file type."}), 400

        from flask import current_app
        badge_dir = os.path.join(str(current_app.static_folder), "images", "achievement_badges")
        os.makedirs(badge_dir, exist_ok=True)

        ext = (badge_file.filename or "").rsplit(".", 1)[1].lower()
        filename = f"{ach.slug}.{ext}"
        filepath = os.path.join(badge_dir, filename)
        badge_file.save(filepath)

        try:
            tools_dir = os.path.join(current_app.config["BASE_DIR"], "backend", "tools")
            script_path = os.path.join(tools_dir, "make_sprite_sheet.py")
            subprocess.run([sys.executable, script_path], check=True, capture_output=True, text=True)
        except Exception as e:
            return jsonify({"status": "error", "message": f"Error rebuilding sprite sheet: {e}"}), 500

    db.session.commit()
    return jsonify({"status": "success", "message": f"Achievement '{ach.name}' updated successfully!"})

@achievements.route("/submit_certificate", methods=["GET", "POST"])
def submit_certificate():
    user_id = session.get("user")
    current_user = User.query.filter_by(id=user_id).first()
    if not current_user:
        return jsonify({"success": False, "error": "User not found!"}), 400

    if request.method == "POST":
        data = request.get_json(silent=True) or request.form
        url = data.get("certificate_url")

        # 1. Check URL
        match = re.search(CERT_URL_REGEX, url or "")
        if not match:
            return jsonify({"success": False, "error": "Invalid certificate URL."}), 200

        course_slug = match.group(1)

        from application.utilities.db_helpers import resolve_course_id
        db_course_id = resolve_course_id(course_slug)

        achievement = Achievement.query.filter(
            (Achievement.slug == course_slug) |
            (Achievement.source == course_slug) |
            (Achievement.slug == db_course_id) |
            (Achievement.source == db_course_id)
        ).first()

        is_auto_recommended = False
        recommendation_reason = "No matching achievement found for this course."
        if achievement:
            is_auto_recommended = True
            recommendation_reason = f"Valid certificate URL matching achievement '{achievement.name}'."
        else:
            return jsonify({
                "success": False,
                "error": "No matching achievement found for this course."
            }), 200

        # 2. Generate file
        from application.utilities.cert_generator import generate_certificate
        from flask import current_app

        cert_dir = os.path.join(current_app.config.get("UPLOAD_FOLDER", os.path.join(current_app.config["BASE_DIR"], "certificates")))
        os.makedirs(cert_dir, exist_ok=True)
        filename = secure_filename(f"{current_user.username}_{achievement.slug}.pdf")
        filepath = os.path.join(cert_dir, filename)

        # Use Alice_CS1.pdf as our template
        template_path = os.path.join(current_app.config["BASE_DIR"], "mockups", "Certificate_Samples", "CodeCombat", "Alice_CS1.pdf")
        student_name = current_user.nickname or current_user.username

        try:
            generate_certificate(template_path, filepath, student_name)
        except Exception as e:
            return jsonify({"success": False, "error": f"Failed to generate certificate: {e}"}), 500

        # 3. Create or update cert entry
        cert = UserCertificate.query.filter_by(
            user_id=current_user.id, achievement_id=achievement.id
        ).first()

        if not cert:
            cert = UserCertificate(
                user_id=current_user.id,
                achievement_id=achievement.id,
                url=url,
                file_path=filepath,
                status="pending",
                is_auto_recommended=is_auto_recommended,
                recommendation_reason=recommendation_reason

            )
            db.session.add(cert)
        else:
            cert.url = url
            cert.file_path = filepath
            # A resubmission always requires fresh admin review — never
            # auto-approve just because a prior submission existed.
            cert.status = "pending"
            cert.reviewed_at = None

        db.session.commit()

        # Success return
        return jsonify(
            {"success": True, "message": "Certificate submitted successfully."}
        )

    if request.is_json or request.accept_mimetypes.accept_json:
        return jsonify({"status": "ready"}), 200
    return render_template("submit_certificate.html"), 200


@achievements.route("/view_certificate/<int:cert_id>")
def view_certificate(cert_id):
    # Intentionally public: certificates are shareable achievements, and this
    # tradeoff is disclosed and accepted during onboarding.
    cert = db.get_or_404(UserCertificate, cert_id)
    full_path = os.path.abspath(cert.file_path)
    directory = os.path.dirname(full_path)
    filename = os.path.basename(full_path)

    if not os.path.exists(full_path):
        flash("Certificate file not found on the server.", "error")
        return "File Not Found", 404  # Returns a 404 status code

    return send_from_directory(directory, filename, mimetype="application/pdf")


@achievements.route("/admin/certificates")
@admin_only
@api_response
def admin_certificates():
    # Only show pending certificates by default, matching the template
    certs = (
        db.session.query(UserCertificate)
        .filter_by(status="pending")
        .join(User)
        .join(Achievement)
        .all()
    )

    return {"certificates": [c.to_dict() for c in certs]}


@achievements.route("/admin/certificates/reviewed/<int:cert_id>", methods=["POST"])
@admin_only
def mark_reviewed(cert_id):
    cert = db.get_or_404(UserCertificate, cert_id)
    cert.status = "approved"
    cert.reviewed_at = datetime.utcnow()
    db.session.commit()

    from application.socket_events import emit_activity_resolved

    emit_activity_resolved(cert.user_id, "certificate", cert.id, "approved")

    from application.services.achievement_engine import evaluate_user

    evaluate_user(cert.user, force=True)

    msg = "Certificate marked as reviewed."

    if request.is_json or request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return jsonify({"status": "success", "message": msg})

    flash(msg, "success")
    return redirect(url_for("achievements.admin_certificates"))


@achievements.route("/admin/certificates/reject/<int:cert_id>", methods=["POST"])
@admin_only
def reject_certificate(cert_id):
    cert = db.get_or_404(UserCertificate, cert_id)
    data = request.get_json(silent=True) or {}
    cert.status = "rejected"
    cert.review_note = data.get("review_note")
    cert.reviewed_at = datetime.utcnow()
    db.session.commit()

    from application.socket_events import emit_activity_resolved

    emit_activity_resolved(cert.user_id, "certificate", cert.id, "rejected")

    msg = "Certificate rejected."

    if request.is_json or request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return jsonify({"status": "success", "message": msg})

    flash(msg, "success")
    return redirect(url_for("achievements.admin_certificates"))


@achievements.route("/download_certificate/<int:cert_id>")
def download_certificate(cert_id):
    # Intentionally public — see view_certificate.
    cert = db.get_or_404(UserCertificate, cert_id)
    full_path = os.path.abspath(cert.file_path)
    directory = os.path.dirname(full_path)
    filename = os.path.basename(full_path)

    if not os.path.exists(full_path):
        flash("Certificate file not found on the server.", "error")
        return redirect(request.referrer or url_for("achievements.achievements_page"))

    # Helper to construct a nice filename for the download
    download_name = f"{cert.user.nickname}_{cert.achievement.name}.pdf"

    return send_from_directory(
        directory, filename, as_attachment=True, download_name=download_name
    )


@achievements.route("/admin/certificates/reviewed/all", methods=["POST"])
@admin_only
def mark_all_reviewed():
    certs = db.session.query(UserCertificate).filter_by(status="pending").all()
    now = datetime.utcnow()
    users_to_evaluate = set()
    for cert in certs:
        cert.status = "approved"
        cert.reviewed_at = now
        users_to_evaluate.add(cert.user)
    db.session.commit()

    from application.socket_events import emit_activity_resolved

    for cert in certs:
        emit_activity_resolved(cert.user_id, "certificate", cert.id, "approved")

    from application.services.achievement_engine import evaluate_user

    for user in users_to_evaluate:
        evaluate_user(user, force=True)

    msg = f"{len(certs)} certificates marked as reviewed."

    if request.is_json or request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return jsonify({"status": "success", "message": msg})

    flash(msg, "success")
    return redirect(url_for("achievements.admin_certificates"))


@achievements.route("/admin/certificates/download_all")
@admin_only
def download_all_certificates():
    certs = (
        db.session.query(UserCertificate)
        .filter_by(status="pending")
        .join(User)
        .join(Achievement)
        .all()
    )

    if not certs:
        flash("No certificates to download.", "error")
        return redirect(request.referrer or url_for("achievements.admin_certificates"))

    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, "w", zipfile.ZIP_DEFLATED) as zf:
        for cert in certs:
            full_path = os.path.abspath(cert.file_path)
            if os.path.exists(full_path):
                filename = f"{cert.user.nickname}_{cert.achievement.name}.pdf"
                zf.write(full_path, filename)

    memory_file.seek(0)
    return send_file(
        memory_file,
        mimetype="application/zip",
        as_attachment=True,
        download_name="all_pending_certificates.zip",
    )

@achievements.route("/admin/certificate_templates")
@admin_only
@api_response
def admin_certificate_templates():
    courses: list[dict[str, Any]] = [
        {"id": "cs-1", "name": "Computer Science 1"},
        {"id": "cs-2", "name": "Computer Science 2"},
        {"id": "cs-3", "name": "Computer Science 3"},
        {"id": "cs-4", "name": "Computer Science 4"},
        {"id": "cs-5", "name": "Computer Science 5"},
        {"id": "cs-6", "name": "Computer Science 6"},
        {"id": "gd-1", "name": "Game Development 1"},
        {"id": "gd-2", "name": "Game Development 2"},
        {"id": "gd-3", "name": "Game Development 3"},
        {"id": "wd-1", "name": "Web Development 1"},
        {"id": "wd-2", "name": "Web Development 2"},
        {"id": "oz-1", "name": "Ozaria 1"},
        {"id": "oz-2", "name": "Ozaria 2"},
        {"id": "oz-3", "name": "Ozaria 3"},
        {"id": "oz-4", "name": "Ozaria 4"}
    ]
    templates_dir = os.path.join(os.path.dirname(__file__), "..", "static", "certificate_templates")
    result = []
    for c in courses:
        path = os.path.join(templates_dir, f"{c['id']}.pdf")
        has_template = os.path.exists(path)
        c["has_template"] = has_template
        c["course_id"] = c["id"]
        c["course_name"] = c["name"]
        if has_template:
            c["preview_url"] = url_for("achievements.admin_certificate_templates_view", course_id=c["id"])
        else:
            c["preview_url"] = None
        result.append(c)
    return {"templates": result}

@achievements.route("/admin/certificate_templates/<course_id>/view")
@admin_only
def admin_certificate_templates_view(course_id):
    from application.utilities.cert_generator import generate_certificate
    from application.utilities.db_helpers import get_canonical_course_slug, resolve_course_id

    templates_dir = os.path.join(os.path.dirname(__file__), "..", "static", "certificate_templates")
    canonical_slug = get_canonical_course_slug(course_id)
    mongo_id = resolve_course_id(course_id)

    candidates = [course_id, canonical_slug, mongo_id]
    for c in candidates:
        if not c:
            continue
        file_path = os.path.join(templates_dir, f"{c}.pdf")
        if os.path.exists(file_path):
            return send_from_directory(templates_dir, f"{c}.pdf", mimetype="application/pdf")

    # Fallback: Dynamically generate sample preview PDF so iframe view NEVER returns 404
    try:
        pdf_bytes = generate_certificate(course_id, None, "Sample Student")
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=False,
            download_name=f"{course_id}_template_preview.pdf"
        )
    except Exception as e:
        return jsonify({"status": "error", "success": False, "error": str(e)}), 500


@achievements.route("/admin/certificate_templates/<course_id>/upload", methods=["POST"])
@admin_only
def admin_certificate_templates_upload(course_id):
    from application.utilities.db_helpers import get_canonical_course_slug, resolve_course_id

    file = request.files.get("template_file") or request.files.get("file")
    if not file or not file.filename:
        return jsonify({"status": "error", "success": False, "error": "No file uploaded"}), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"status": "error", "success": False, "error": "Only PDF files allowed"}), 400

    templates_dir = os.path.join(os.path.dirname(__file__), "..", "static", "certificate_templates")
    os.makedirs(templates_dir, exist_ok=True)

    canonical_slug = get_canonical_course_slug(course_id)
    mongo_id = resolve_course_id(course_id)

    file_bytes = file.read()
    save_names = {f"{course_id}.pdf", f"{canonical_slug}.pdf", f"{mongo_id}.pdf"}
    for fname in save_names:
        with open(os.path.join(templates_dir, fname), "wb") as f:
            f.write(file_bytes)

    return jsonify({
        "status": "success",
        "success": True,
        "message": "Template uploaded successfully."
    })


@achievements.route("/admin/certificate_templates/<course_id>/test_generate", methods=["POST"])
@admin_only
def admin_certificate_templates_test_generate(course_id):
    data = request.get_json(silent=True) or request.form
    student_name = data.get("student_name", "Test Student")

    from application.utilities.cert_generator import generate_certificate
    try:
        pdf_bytes = generate_certificate(course_id, None, student_name)
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"test_{course_id}.pdf"
        )
    except Exception as e:
        return jsonify({"status": "error", "success": False, "error": str(e)}), 500
