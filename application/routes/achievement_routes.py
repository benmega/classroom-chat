# routes.py
import re
from datetime import datetime

from flask import Blueprint, render_template, jsonify, session, flash, redirect, url_for, request
from sqlalchemy.orm import joinedload

from application.extensions import db
from application.models.user import User
from application.models.achievements import Achievement, UserAchievement
from application.models.user_certificate import UserCertificate
from application.routes.admin_routes import local_only
import os
from werkzeug.utils import secure_filename

achievements = Blueprint('achievements', __name__)

# Updated to allow codecombat.com and ozaria.com (with optional www)
CERT_URL_REGEX = r"https://(?:www\.)?(?:codecombat|ozaria)\.com/certificates/[\w\d]+\?.*course=([\w\d-]+)"


UPLOAD_FOLDER = "certificates"
ALLOWED_EXTENSIONS = {"pdf"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# Return all achievements with user's status
@achievements.route("/")
def achievements_page():
    user_id = session.get('user')
    # current_user = User.query.filter_by(username=user_id).first()
    current_user = (
        User.query.options(joinedload(User.achievements))
        .filter_by(id=user_id)
        .first()
    )
    if not current_user:
        return jsonify({'success': False, 'error': 'User not found!'}), 404

    user_achievements = {ua.achievement_id for ua in current_user.achievements}
    all_achievements = Achievement.query.all()
    return render_template(
        "achievements.html",
        achievements=all_achievements,
        user_achievements=user_achievements
    )


@achievements.route("/add", methods=["GET", "POST"])
@local_only
def add_achievement():
    if request.method == "POST":
        name = request.form.get("name")
        slug = request.form.get("slug")
        description = request.form.get("description")
        requirement_value = request.form.get("requirement_value") or None

        ach = Achievement(
            name=name,
            slug=slug,
            type=request.form.get("type"),
            reward=int(request.form.get("reward") or 1),
            description=description,
            requirement_value=requirement_value,
            source=request.form.get("source")
)
        db.session.add(ach)
        db.session.commit()
        flash(f"Achievement '{name}' added", "success")
        return redirect(url_for("achievements.achievements_page"))

    return render_template("admin/add_achievement.html")


@achievements.route("/submit_certificate", methods=["GET", "POST"])
def submit_certificate():
    user_id = session.get("user")
    current_user = User.query.filter_by(id=user_id).first()
    if not current_user:
        # Check if AJAX request
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({"success": False, "error": "User not found!"}), 400
        return jsonify({"success": False, "error": "User not found!"}), 400

    message, success = None, False

    if request.method == "POST":
        is_xhr = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        url = request.form.get("certificate_url")
        file = request.files.get("certificate_file")

        # 1. Check URL
        match = re.search(CERT_URL_REGEX, url or "")
        if not match:
            msg = "Invalid certificate URL."
            if is_xhr: return jsonify({"success": False, "error": msg})
            return render_template("submit_certificate.html", message=msg, success=False)

        course_slug = match.group(1)
        achievement = Achievement.query.filter_by(slug=course_slug).first()
        if not achievement:
            msg = "No matching achievement found for this course."
            if is_xhr: return jsonify({"success": False, "error": msg})
            return render_template("submit_certificate.html", message=msg, success=False)

        # 2. File validation
        if not file or file.filename == "":
            msg = "Certificate file is required."
            if is_xhr: return jsonify({"success": False, "error": msg})
            return render_template("submit_certificate.html", message=msg, success=False)

        if not allowed_file(file.filename):
            msg = "Invalid file type. Only PDF is allowed."
            if is_xhr: return jsonify({"success": False, "error": msg})
            return render_template("submit_certificate.html", message=msg, success=False)

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
            return jsonify({"success": True, "message": "Certificate submitted successfully."})

        return render_template("submit_certificate.html", message="Certificate submitted successfully.", success=True)

    return render_template("submit_certificate.html")

from flask import send_from_directory

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
@local_only
def admin_certificates():
    certs = (
        db.session.query(UserCertificate)
        .filter_by(reviewed=False)
        .join(User)
        .join(Achievement)
        .add_entity(User)
        .add_entity(Achievement)
        .all()
    )
    return render_template("admin/admin_certificates.html", certs=certs)

@achievements.route("/admin/certificates/reviewed/<int:cert_id>", methods=["POST"])
@local_only
def mark_reviewed(cert_id):
    cert = UserCertificate.query.get_or_404(cert_id)
    cert.reviewed = True
    cert.reviewed_at = datetime.utcnow()
    db.session.commit()
    flash("Marked as reviewed.", "success")
    return redirect(url_for("achievements.admin_certificates"))
