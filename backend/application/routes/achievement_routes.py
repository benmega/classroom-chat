import os
import re
from datetime import datetime

from flask import (
    Blueprint,
    render_template,
    jsonify,
    session,
    flash,
    redirect,
    url_for,
    request,
    send_from_directory,
)
from sqlalchemy.orm import joinedload
from werkzeug.utils import secure_filename

from application.extensions import db
from application.models.achievements import Achievement
from application.models.user import User
from application.models.user_certificate import UserCertificate
from application.routes.admin_routes import admin_only

achievements = Blueprint("achievements", __name__)

# Updated to allow codecombat.com and ozaria.com (with optional www)
CERT_URL_REGEX = r"https://(?:www\.)?(?:codecombat|ozaria)\.com/certificates/[\w\d]+\?.*course=([\w\d-]+)"


UPLOAD_FOLDER = "certificates"
ALLOWED_EXTENSIONS = {"pdf"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# Return all achievements with user's status
@achievements.route("/")
def achievements_page():
    user_id = session.get("user")
    # current_user = User.query.filter_by(username=user_id).first()
    current_user = (
        User.query.options(joinedload(User.achievements)).filter_by(id=user_id).first()
    )
    if not current_user:
        return jsonify({"success": False, "error": "User not found!"}), 404

    user_achievements = {ua.achievement_id for ua in current_user.achievements}
    all_achievements = Achievement.query.all()

    if request.is_json or request.accept_mimetypes.accept_json:
        return jsonify({
            "status": "success",
            "data": {
                "achievements": [a.to_dict() for a in all_achievements],
                "user_achievements": list(user_achievements)
            }
        })

    return render_template(
        "achievements.html",
        achievements=all_achievements,
        user_achievements=user_achievements,
    )


@achievements.route("/add", methods=["GET", "POST"])
@admin_only
def add_achievement():
    if request.method == "POST":
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form

        name = data.get("name")
        slug = data.get("slug")
        description = data.get("description")
        achievement_type = data.get("type", "ducks")
        reward = int(data.get("reward") or 1)
        requirement_value = data.get("requirement_value") or None
        source = data.get("source")

        if not name or not slug:
            if request.is_json:
                return jsonify({"status": "error", "message": "Name and Slug are required."}), 400
            flash("Name and Slug are required.", "error")
            return render_template("admin/add_achievement.html")

        # Check for existing slug
        existing = Achievement.query.filter_by(slug=slug).first()
        if existing:
            if request.is_json:
                return jsonify({"status": "error", "message": "Achievement with this slug already exists."}), 400
            flash("Achievement with this slug already exists.", "error")
            return render_template("admin/add_achievement.html")

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

        if request.is_json or request.headers.get("X-Requested-With") == "XMLHttpRequest":
            return jsonify({"status": "success", "message": f"Achievement '{name}' added successfully!"})

        flash(f"Achievement '{name}' added", "success")
        return redirect(url_for("achievements.achievements_page"))

    return render_template("admin/add_achievement.html")


@achievements.route("/submit_certificate", methods=["GET", "POST"])
def submit_certificate():
    user_id = session.get("user")
    current_user = User.query.filter_by(id=user_id).first()
    if not current_user:
        # Check if AJAX request
        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
            return jsonify({"success": False, "error": "User not found!"}), 400
        return jsonify({"success": False, "error": "User not found!"}), 400

    _message, _success = None, False

    if request.method == "POST":
        is_xhr = request.headers.get("X-Requested-With") == "XMLHttpRequest"
        url = request.form.get("certificate_url")
        file = request.files.get("certificate_file")

        # 1. Check URL
        match = re.search(CERT_URL_REGEX, url or "")
        if not match:
            msg = "Invalid certificate URL."
            if is_xhr:
                return jsonify({"success": False, "error": msg}), 400
            return render_template(
                "submit_certificate.html", message=msg, success=False
            ), 400

        course_slug = match.group(1)
        achievement = Achievement.query.filter_by(slug=course_slug).first()
        if not achievement:
            msg = "No matching achievement found for this course."
            if is_xhr:
                return jsonify({"success": False, "error": msg}), 400
            return render_template(
                "submit_certificate.html", message=msg, success=False
            ), 400

        # 2. File validation
        if not file or file.filename == "":
            msg = "Certificate file is required."
            if is_xhr:
                return jsonify({"success": False, "error": msg}), 400
            return render_template(
                "submit_certificate.html", message=msg, success=False
            ), 400

        if not allowed_file(file.filename):
            msg = "Invalid file type. Only PDF is allowed."
            if is_xhr:
                return jsonify({"success": False, "error": msg}), 400
            return render_template(
                "submit_certificate.html", message=msg, success=False
            ), 400

        # 3. Save file
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        filename = secure_filename(f"{current_user.username}_{achievement.slug}.pdf")
        filepath = os.path.join(UPLOAD_FOLDER, filename)
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
        if is_xhr:
            return jsonify(
                {"success": True, "message": "Certificate submitted successfully."}
            )

        return render_template(
            "submit_certificate.html",
            message="Certificate submitted successfully.",
            success=True,
        )

    return render_template("submit_certificate.html")

@achievements.route("/view_certificate/<int:cert_id>")
def view_certificate(cert_id):
    cert = UserCertificate.query.get_or_404(cert_id)
    full_path = os.path.abspath(cert.file_path)
    directory = os.path.dirname(full_path)
    filename = os.path.basename(full_path)

    if not os.path.exists(full_path):
        flash("Certificate file not found on the server.", "error")
        return "File Not Found", 404  # Returns a 404 status code

    return send_from_directory(directory, filename, mimetype="application/pdf")


@achievements.route("/admin/certificates")
@admin_only
def admin_certificates():
    # Only show unreviewed certificates by default, matching the template
    certs = (
        db.session.query(UserCertificate)
        .filter_by(reviewed=False)
        .join(User)
        .join(Achievement)
        .all()
    )
    
    if request.is_json or request.accept_mimetypes.accept_json:
        return jsonify({
            "status": "success",
            "data": {
                "certificates": [c.to_dict() for c in certs]
            }
        })

    return render_template("admin/admin_certificates.html", certs=certs)


@achievements.route("/admin/certificates/reviewed/<int:cert_id>", methods=["POST"])
@admin_only
def mark_reviewed(cert_id):
    cert = UserCertificate.query.get_or_404(cert_id)
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
    cert = UserCertificate.query.get_or_404(cert_id)
    full_path = os.path.abspath(cert.file_path)
    directory = os.path.dirname(full_path)
    filename = os.path.basename(full_path)

    if not os.path.exists(full_path):
        flash("Certificate file not found on the server.", "error")
        return redirect(request.referrer or url_for('achievements.achievements_page'))

    # Helper to construct a nice filename for the download
    download_name = f"{cert.user.nickname}_{cert.achievement.name}.pdf"

    return send_from_directory(
        directory,
        filename,
        as_attachment=True,
        download_name=download_name
    )