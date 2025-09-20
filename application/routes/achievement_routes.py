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

CERT_URL_REGEX = r"https://codecombat\.com/certificates/[\w\d]+.*course=([\w\d]+)"



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
        .filter_by(username=user_id)
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
    current_user = User.query.filter_by(username=user_id).first()
    if not current_user:
        return jsonify({'success': False, 'error': 'User not found!'}), 404

    if request.method == "POST":
        name = request.form.get("name")
        slug = request.form.get("slug")
        description = request.form.get("description")
        duck_req = request.form.get("duck_requirement") or None

        ach = Achievement(
            name=name,
            slug=slug,
            description=description,
            duck_requirement=int(duck_req) if duck_req else None
        )
        db.session.add(ach)
        db.session.commit()
        flash(f"Achievement '{name}' added", "success")
        return redirect(url_for("achievements.achievements_page"))

    return render_template("add_achievement.html")




@achievements.route("/submit_certificate", methods=["GET", "POST"])
def submit_certificate():
    user_id = session.get("user")
    current_user = User.query.filter_by(username=user_id).first()
    if not current_user:
        return jsonify({"success": False, "error": "User not found!"}), 404

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

        # success message
        message, success = "Certificate submitted successfully.", True

    return render_template("submit_certificate.html", message=message, success=success)
