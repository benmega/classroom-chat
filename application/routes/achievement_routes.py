# routes.py
import re

from flask import Blueprint, render_template, jsonify, session, flash, redirect, url_for, request

from application.extensions import db
from application.models.user import User
from application.models.achievements import Achievement, UserAchievement
from application.models.user_certificate import UserCertificate
from application.services.achievement_engine import evaluate_user

achievements = Blueprint('achievements', __name__)



# Return all achievements with user's status
@achievements.route("/")
def achievements_page():
    user_id = session.get('user')
    current_user = User.query.filter_by(username=user_id).first()
    if not current_user:
        return jsonify({'success': False, 'error': 'User not found!'}), 404

    user_achievements = {ua.achievement_id for ua in current_user.achievements}
    all_achievements = Achievement.query.all()
    return render_template(
        "achievements.html",
        achievements=all_achievements,
        user_achievements=user_achievements
    )

# # API route for frontend JS if you want live updates
# @achievements.route("/api/achievements")
# def achievements_api():
#     user_id = session.get('user')
#     current_user = User.query.filter_by(username=user_id).first()
#     if not current_user:
#         return jsonify({'success': False, 'error': 'User not found!'}), 404
#
#     user_achievements = {ua.achievement_id for ua in current_user.user_achievements}
#     all_achievements = Achievement.query.all()
#     return jsonify([
#         {
#             "id": a.id,
#             "name": a.name,
#             "description": a.description,
#             "earned": a.id in user_achievements
#         }
#         for a in all_achievements
#     ])



@achievements.route("/add", methods=["GET", "POST"])
def add_achievement():
    user_id = session.get('user')
    current_user = User.query.filter_by(username=user_id).first()
    if not current_user:
        return jsonify({'success': False, 'error': 'User not found!'}), 404

    # Only admin users
    # if not current_user.is_admin:
    #     flash("Access denied", "error")
    #     return redirect(url_for("achievements.achievements_page"))

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
***REMOVED***
        db.session.add(ach)
        db.session.commit()
        flash(f"Achievement '{name}' added", "success")
        return redirect(url_for("achievements.achievements_page"))

    return render_template("add_achievement.html")



CERT_URL_REGEX = r"https://codecombat\.com/certificates/[\w\d]+.*course=([\w\d]+)"

@achievements.route("/submit_certificate", methods=["GET", "POST"])
def submit_certificate():
    user_id = session.get('user')
    current_user = User.query.filter_by(username=user_id).first()
    if not current_user:
        return jsonify({'success': False, 'error': 'User not found!'}), 404

    message = None
    if request.method == "POST":
        url = request.form.get("certificate_url")
        match = re.search(CERT_URL_REGEX, url)
        if match:
            course_slug = match.group(1)  # course identifier from URL
            achievement = Achievement.query.filter_by(slug=course_slug).first()
            if achievement:
                cert = UserCertificate.query.filter_by(user_id=current_user.id, achievement_id=achievement.id).first()
                if not cert:
                    cert = UserCertificate(user_id=current_user.id, achievement_id=achievement.id, url=url)
                    db.session.add(cert)
                    db.session.commit()
                # # mark as submitted
                # ua = UserAchievement.query.filter_by(user_id=current_user.id, achievement_id=achievement.id).first()
                # if not ua:
                #     ua = UserAchievement(user_id=current_user.id, achievement_id=achievement.id)
                #     db.session.add(ua)
                # db.session.commit()

                # update achievement engine
                new_awards = evaluate_user(current_user)

                if new_awards:
                    message = f"Certificate submitted! Achievement '{achievement.name}' awarded."
                else:
                    message = "Certificate submitted, but no new achievement earned."
            else:
                message = "No matching achievement found for this course."
        else:
            message = "Invalid certificate URL."

    return render_template("submit_certificate.html", message=message)