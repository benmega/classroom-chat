# routes.py
import re

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

CERT_URL_REGEX = r"https://codecombat\.com/certificates/[\w\d]+\?.*course=([\w\d-]+)"


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
    user_id = session.get('user')
    current_user = User.query.filter_by(id=user_id).first()
    if not current_user:
        return jsonify({'success': False, 'error': 'User not found!'}), 404

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
***REMOVED***
        db.session.add(ach)
        db.session.commit()
        flash(f"Achievement '{name}' added", "success")
        return redirect(url_for("achievements.achievements_page"))

    return render_template("add_achievement.html")




@achievements.route("/submit_certificate", methods=["GET", "POST"])
def submit_certificate():
    user_id = session.get("user")
    current_user = User.query.filter_by(id=user_id).first()
    if not current_user:
        return jsonify({"success": False, "error": "User not found!"}), 400

    message, success = None, False

    if request.method == "POST":
        url = request.form.get("certificate_url")
        file = request.files.get("certificate_file")

        # check URL
        match = re.search(CERT_URL_REGEX, url or "")
        if not match:
            return render_template("submit_certificate.html", message="Invalid certificate URL.", success=False)

        course_slug = match.group(1)
        achievement = Achievement.query.filter_by(slug=course_slug).first()
        if not achievement:
            return render_template("submit_certificate.html", message="No matching achievement found for this course.", success=False)

        # file validation
        if not file or file.filename == "":
            return render_template("submit_certificate.html", message="Certificate file is required.", success=False)

        if not allowed_file(file.filename):
            return render_template("submit_certificate.html", message="Invalid file type. Only PDF is allowed.", success=False)

        # save file
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)

        filename = secure_filename(f"{current_user.username}_{achievement.slug}.pdf")
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        # create or update cert entry
        cert = UserCertificate.query.filter_by(
            user_id=current_user.id, achievement_id=achievement.id
***REMOVED***.first()
        if not cert:
            cert = UserCertificate(
                user_id=current_user.id,
                achievement_id=achievement.id,
                url=url,
                file_path=filepath,
    ***REMOVED***
            db.session.add(cert)
        else:
            cert.url = url
            cert.file_path = filepath

        db.session.commit()

        # success message
        message, success = "Certificate submitted successfully.", True

    return render_template("submit_certificate.html", message=message, success=success)


from flask import send_from_directory

@achievements.route("/view_certificate/<int:cert_id>")
@local_only
def view_certificate(cert_id):
    cert = UserCertificate.query.get_or_404(cert_id)
    full_path = os.path.abspath(cert.file_path)
    directory = os.path.dirname(full_path)
    filename = os.path.basename(full_path)

    if not os.path.exists(full_path):
        flash("Certificate file not found.", "error")
        return redirect(url_for("achievements.admin_certificates"))

    return send_from_directory(directory, filename, mimetype="application/pdf")


@achievements.route("/admin/certificates")
@local_only
def admin_certificates():
    certs = (
        db.session.query(UserCertificate)
        .join(User)
        .join(Achievement)
        .add_entity(User)
        .add_entity(Achievement)
        .all()
    )
    return render_template("admin_certificates.html", certs=certs)
