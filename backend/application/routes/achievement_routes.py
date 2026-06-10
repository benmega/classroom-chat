import os
import re
from datetime import datetime

from flask import (
    Blueprint,
    jsonify,
    session,
    flash,
    redirect,
    url_for,
    request,
    send_from_directory,
    render_template,
    send_file,
)
from sqlalchemy.orm import joinedload
from werkzeug.utils import secure_filename
import zipfile
import io

from application.extensions import db
from application.models.achievements import Achievement
from application.models.user import User
from application.models.user_certificate import UserCertificate
from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response
from application.utilities.helper_functions import allowed_file

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
    from application.services.achievement_engine import (
        evaluate_user,
        get_achievement_progress,
        longest_session_minutes,
        _calculate_consistency,
    )
    from application.models.message import Message
    from application.models.challenge_log import ChallengeLog
    from application.models.duck_trade import DuckTradeLog
    from sqlalchemy import func

    evaluate_user(current_user)

    # Pre-calculate stats for speed
    stats = {
        "chat_count": db.session.query(func.count(Message.id))
        .filter(Message.user_id == current_user.id)
        .scalar(),
        "consistency_streak": _calculate_consistency(current_user.username),
        "community_count": db.session.query(func.count(ChallengeLog.id))
        .filter(func.lower(ChallengeLog.helper) == current_user.username.lower())
        .scalar(),
        "max_session": longest_session_minutes(current_user.id),
        "trade_count": db.session.query(func.count(DuckTradeLog.id))
        .filter(func.lower(DuckTradeLog.username) == current_user.username.lower())
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
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

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
            current_app.static_folder, "images", "achievement_badges"
        )
        os.makedirs(badge_dir, exist_ok=True)

        ext = badge_file.filename.rsplit(".", 1)[1].lower()
        filename = f"{slug}.{ext}"
        filepath = os.path.join(badge_dir, filename)
        badge_file.save(filepath)

        # Trigger sprite sheet rebuild
        try:
            import subprocess
            import sys

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


@achievements.route("/submit_certificate", methods=["GET", "POST"])
def submit_certificate():
    user_id = session.get("user")
    current_user = User.query.filter_by(id=user_id).first()
    if not current_user:
        return jsonify({"success": False, "error": "User not found!"}), 400

    if request.method == "POST":
        url = request.form.get("certificate_url")
        file = request.files.get("certificate_file")

        # 1. Check URL
        match = re.search(CERT_URL_REGEX, url or "")
        if not match:
            return jsonify({"success": False, "error": "Invalid certificate URL."}), 200

        course_slug = match.group(1)
        achievement = Achievement.query.filter_by(slug=course_slug).first()
        if not achievement:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "No matching achievement found for this course.",
                    }
                ),
                200,
            )

        # 2. File validation
        if not file or file.filename == "":
            return (
                jsonify({"success": False, "error": "Certificate file is required."}),
                200,
            )

        if not allowed_file(file.filename, ALLOWED_EXTENSIONS):
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Invalid file type. Only PDF is allowed.",
                    }
                ),
                200,
            )

        # 3. Save file
        from flask import current_app

        cert_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "certificates")
        os.makedirs(cert_dir, exist_ok=True)
        filename = secure_filename(f"{current_user.username}_{achievement.slug}.pdf")
        filepath = os.path.join(cert_dir, filename)
        file.save(filepath)

        # 4. Create or update cert entry
        cert = UserCertificate.query.filter_by(
            user_id=current_user.id, achievement_id=achievement.id
        ).first()

        if not cert:
            cert = UserCertificate(
                user_id=current_user.id,
                achievement_id=achievement.id,
                url=url,
                file_path=filepath,
            )
            db.session.add(cert)
        else:
            cert.url = url
            cert.file_path = filepath

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
    # Only show unreviewed certificates by default, matching the template
    certs = (
        db.session.query(UserCertificate)
        .filter_by(reviewed=False)
        .join(User)
        .join(Achievement)
        .all()
    )

    return {"certificates": [c.to_dict() for c in certs]}


@achievements.route("/admin/certificates/reviewed/<int:cert_id>", methods=["POST"])
@admin_only
def mark_reviewed(cert_id):
    cert = db.get_or_404(UserCertificate, cert_id)
    cert.reviewed = True
    cert.reviewed_at = datetime.utcnow()
    db.session.commit()

    msg = "Certificate marked as reviewed."

    if request.is_json or request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return jsonify({"status": "success", "message": msg})

    flash(msg, "success")
    return redirect(url_for("achievements.admin_certificates"))


@achievements.route("/download_certificate/<int:cert_id>")
def download_certificate(cert_id):
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
    certs = db.session.query(UserCertificate).filter_by(reviewed=False).all()
    now = datetime.utcnow()
    for cert in certs:
        cert.reviewed = True
        cert.reviewed_at = now
    db.session.commit()

    msg = f"{len(certs)} certificates marked as reviewed."

    if request.is_json or request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return jsonify({"status": "success", "message": msg})

    flash(msg, "success")
    return redirect(url_for("achievements.admin_certificates"))


@achievements.route("/admin/certificates/download_all")
@admin_only
def download_all_certificates():
    certs = db.session.query(UserCertificate).filter_by(reviewed=False).join(User).join(Achievement).all()

    if not certs:
        flash("No certificates to download.", "error")
        return redirect(request.referrer or url_for("achievements.admin_certificates"))

    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
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
        download_name="all_pending_certificates.zip"
    )



