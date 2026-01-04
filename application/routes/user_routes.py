"""
File: user_routes.py
Type: py
Summary: Flask routes for user identity, profile management, and project portfolio.
"""

import os
import uuid
from functools import wraps

import boto3
from PIL import Image
from flask import Blueprint, jsonify, send_from_directory, current_app, abort
from flask import render_template, request, redirect, url_for, session, flash
from flask_wtf import FlaskForm
from werkzeug.utils import secure_filename
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired

from application.config import Config
from application.extensions import db, limiter
from application.models.conversation import Conversation
from application.models.project import Project
from application.models.skill import Skill
from application.models.user import User
from application.utilities.helper_functions import allowed_file

user = Blueprint("user", __name__)

S3_UPLOAD_BUCKET = "youtube-upload-source-classroom-chat"

s3_client = boto3.client(
    "s3",
    aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
    region_name=os.environ.get("AWS_REGION", "ap-southeast-1"),
)
# --- Decorators ---


def require_login(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        user_id = session.get("user")
        if not user_id:
            flash("Please log in to access your profile.", "warning")
            return redirect(url_for("user.login"))
        return view(*args, **kwargs)

    return wrapper


# --- Forms ---


class LoginForm(FlaskForm):
    username = StringField(
        "Username",
        validators=[DataRequired()],
        render_kw={"id": "username", "required": "required"},
    )
    password = PasswordField(
        "Password",
        validators=[DataRequired()],
        render_kw={"id": "password", "required": "required"},
    )
    submit = SubmitField("Login", render_kw={"class": "login-button"})


# --- Auth Routes ---


@user.route("/login", methods=["GET", "POST"])
def login():
    form = LoginForm()

    if form.validate_on_submit():
        username = (
            form.username.data.lower()
        )  # Convert to lowercase for case-insensitive comparison
        password = form.password.data

        user_obj = User.query.filter_by(username=username).first()

        if user_obj and user_obj.check_password(password):
            session["user"] = user_obj.id
            session.permanent = True
            user_obj.set_online(user_obj.id)

            awarded = user_obj.award_daily_duck(amount=1)
            if awarded:
                flash("Welcome! Daily duck awarded.", "success")

            # Link to recent conversation or create session context
            recent_conversation = Conversation.query.order_by(
                Conversation.created_at.desc()
            ).first()

            if recent_conversation:
                if user_obj not in recent_conversation.users:
                    recent_conversation.users.append(user_obj)
                    db.session.commit()
                session["conversation_id"] = recent_conversation.id
            else:
                session["conversation_id"] = None

            flash("Login successful!", "success")
            return redirect(url_for("general.index"))
        else:
            flash("Invalid username or password.", "error")

    return render_template("auth/login.html", form=form)


@user.route("/logout")
def logout():
    user_id = session.get("user")
    user_obj = User.query.get(user_id)
    if user_obj:
        user_obj.set_online(user_obj.id, False)
        db.session.commit()

    session.pop("user", None)
    flash("You have been logged out.", "success")
    return redirect(url_for("user.login"))


@user.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username = request.form.get(
            "username"
        ).lower()  # Convert to lowercase for storage
        password = request.form.get("password")

        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash("Username already taken, please choose another.", "error")
            return render_template("auth/signup.html")

        new_user = User(username=username, ip_address=request.remote_addr)
        new_user.set_password(password)

        db.session.add(new_user)
        db.session.commit()

        flash("Signup successful! Please log in.", "success")
        return redirect(url_for("user.login"))

    return render_template("auth/signup.html")


# --- Profile & Settings Routes ---
@user.route("/profile", methods=["GET"])
@require_login
def profile():
    user_id = session.get("user")
    user_obj = User.query.get(user_id)
    if not user_obj:
        return redirect(url_for("user.login"))

    # When viewing your own profile, target and viewer are the same
    return render_template("user/profile.html", target=user_obj, viewer=user_obj)


@user.route("/profile/<username>", methods=["GET"])
def view_user_profile(username):
    # Use _username column for the lookup
    target_profile = User.query.filter_by(_username=username).first_or_404()

    # Determine who is looking at the page
    viewer_id = session.get("user")
    viewer = User.query.get(viewer_id) if viewer_id else None

    return render_template("user/profile.html", target=target_profile, viewer=viewer)


@user.route("/edit_profile", methods=["GET", "POST"])
@require_login
def edit_profile():
    user_id = session.get("user")
    user_obj = User.query.get(user_id)

    if request.method == "POST":
        try:
            # 1. Update Basic Info (Password, IP, Online Status)
            update_basic_user_info(user_obj)

            # 2. Update Skills (Clear and Re-add)
            clear_user_skills(user_obj)
            add_user_skills(user_obj, request.form.getlist("skills[]"))

            # 3. Handle Profile Picture (if uploaded via this form)
            handle_profile_picture_upload(user_obj)

            db.session.commit()
            flash("Account settings updated successfully!", "success")
            return redirect(url_for("user.profile"))

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error during profile update: {e}")
            flash("An error occurred while updating the profile.", "danger")

    return render_template("user/edit_profile.html", user=user_obj)


# --- Project Management Routes ---
@user.route("/project/new", methods=["GET", "POST"])
@require_login
def new_project():
    user_id = session.get("user")
    user_obj = User.query.get(user_id)

    if request.method == "POST":
        action = request.form.get("action")

        if action == "save":
            name = request.form.get("name")
            if not name:
                flash("Project name is required.", "error")
                return render_template(
                    "user/manage_project.html", project=None, user=user_obj
                )

            # Check if user is an admin and act accordingly
            target_user_id = user_id  # default to current user
            if getattr(user_obj, 'is_admin', False):
                target_user_id = request.form.get('student_id') or user_id

            # Ensure valid student ID is provided
            target_user = User.query.get(target_user_id)
            if not target_user:
                flash('Invalid student selection.', 'error')
                return render_template('user/manage_project.html', project=None, user=user_obj)

            # Create the project, assigned under the student
            new_proj = Project(
                name=name,
                description=request.form.get('description'),
                link=request.form.get('link'),
                github_link=request.form.get('github_link'),
                video_url=request.form.get('video_url'),
                code_snippet=request.form.get('code_snippet'),
                teacher_comment=request.form.get('teacher_comment') if getattr(user_obj, 'is_admin', False) else None,
                user_id=target_user.id  # Assign to the selected student
            )

            db.session.add(new_proj)
            db.session.flush()

            # Handle Project Thumbnail Upload
            if "project_image" in request.files:
                filename = handle_project_image_upload(request.files["project_image"])
                if filename:
                    new_proj.image_url = f"images/projects/{filename}"

            if "project_video" in request.files:
                video_file = request.files["project_video"]
                if video_file.filename != "":
                    success = handle_video_s3_upload(video_file, user_obj, name, project_id=new_proj.id)
                    if success:
                        flash(
                            "Video uploading! It will appear on your project in a few minutes.",
                            "info",
                        )
                    else:
                        flash("Invalid video format or upload failed.", "warning")

            db.session.add(new_proj)
            db.session.commit()
            flash("Project created successfully!", "success")
            return redirect(url_for("user.profile"))

    # Pass the user_obj and potentially list of students if the user is an admin
    student_list = User.query.all() if getattr(user_obj, 'is_admin', False) else None
    return render_template('user/manage_project.html', project=None, user=user_obj, students=student_list)


@user.route("/project/edit/<int:project_id>", methods=["GET", "POST"])
@require_login
def edit_project(project_id):
    user_id = session.get("user")
    # Fetch the current user object to check admin status
    current_user = User.query.get(user_id)
    project = Project.query.get_or_404(project_id)

    # Security: Ensure ownership (Admins can usually edit anything, but strictly following your code:)
    if project.user_id != user_id and not getattr(current_user, "is_admin", False):
        flash("You do not have permission to edit this project.", "danger")
        return redirect(url_for("user.profile"))

    if request.method == "POST":
        action = request.form.get("action")

        if action == "delete":
            db.session.delete(project)
            db.session.commit()
            flash("Project deleted.", "success")
            return redirect(url_for("user.profile"))

        elif action == "save":
            project.name = request.form.get("name")
            project.description = request.form.get("description")
            project.link = request.form.get("link")
            project.github_link = request.form.get("github_link")
            project.video_url = request.form.get("video_url")
            project.code_snippet = request.form.get("code_snippet")

            # SECURITY: Only update teacher_comment if user is admin
            if getattr(current_user, "is_admin", False):
                project.teacher_comment = request.form.get("teacher_comment")

            # Handle Image Replacement
            if "project_image" in request.files:
                file = request.files["project_image"]
                if file and file.filename != "":
                    filename = handle_project_image_upload(file)
                    if filename:
                        project.image_url = f"images/projects/{filename}"

            if "project_video" in request.files:
                video_file = request.files["project_video"]
                if video_file.filename != "":
                    # Use current project name for the slug
                    success = handle_video_s3_upload(
                        video_file, current_user, project.name, project_id=project.id
                    )
                    if success:
                        flash(
                            "Video uploading! It will appear on your project in a few minutes.",
                            "info",
                        )

            db.session.commit()
            flash("Project updated successfully!", "success")
            return redirect(url_for("user.profile"))

    # Pass user=current_user so the template can check permissions
    return render_template(
        "user/manage_project.html", project=project, user=current_user
    )


# --- Image & File Handling Routes ---


@user.route("/edit_profile_picture", methods=["POST"])
@require_login
def edit_profile_picture():
    user_id = session.get("user")
    user_obj = User.query.get(user_id)

    if "profile_picture" not in request.files:
        return jsonify({"success": False, "error": "No file part"}), 400

    file = request.files["profile_picture"]
    if file.filename == "":
        return jsonify({"success": False, "error": "No selected file"}), 400

    try:
        # Save as [username]_avatar.png for simplicity, or use UUID
        filename = f"{user_obj.username}_avatar.png"
        secure_path = os.path.join(
            current_app.config["UPLOAD_FOLDER"], "profile_pictures", filename
        )

        # Ensure directory exists
        os.makedirs(os.path.dirname(secure_path), exist_ok=True)

        img = Image.open(file)
        img.save(secure_path)

        user_obj.profile_picture = filename
        db.session.commit()

        new_url = url_for("user.profile_picture", filename=filename)
        return jsonify({"success": True, "new_url": new_url})

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating profile picture: {e}")
        return jsonify({"success": False, "error": "Server error."}), 500


@user.route("/delete_profile_picture", methods=["POST"])
@require_login
def delete_profile_picture():
    user_id = session.get("user")
    user_obj = User.query.get(user_id)

    if user_obj.profile_picture:
        filepath = os.path.join(
            Config.UPLOAD_FOLDER, "profile_pictures", user_obj.profile_picture
        )
        if os.path.exists(filepath):
            os.remove(filepath)

        user_obj.profile_picture = None
        db.session.commit()

    flash("Profile picture removed.", "success")
    return redirect(url_for("user.profile"))


@limiter.limit("50 per minute")
@user.route("/profile_pictures/<path:filename>")
def profile_picture(filename):
    if filename == "Default_pfp.jpg":
        PROFILE_PICTURE_FOLDER = os.path.join(Config.STATIC_FOLDER, "images")
        return send_from_directory(PROFILE_PICTURE_FOLDER, filename)

    PROFILE_PICTURE_FOLDER = os.path.join(Config.UPLOAD_FOLDER, "profile_pictures")

    safe_path = os.path.normpath(filename)
    if os.path.isabs(safe_path) or safe_path.startswith(".."):
        abort(400)

    try:
        return send_from_directory(PROFILE_PICTURE_FOLDER, safe_path)
    except FileNotFoundError:
        abort(404)


# --- API / Utility Routes ---


@user.route("/get_users", methods=["GET"])
def get_users():
    users = User.query.all()
    users_data = [{"id": u.id, "username": u.username} for u in users]
    return jsonify(users_data)


@user.route("/get_user_id", methods=["GET"])
def get_user_id():
    user_id = session.get("user")
    if user_id:
        return jsonify({"user_id": user_id})
    return jsonify({"user_id": None}), 404


@user.route("/remove_skill/<int:skill_id>", methods=["POST"])
@require_login
def remove_skill(skill_id):
    user_id = session.get("user")
    user_obj = User.query.get(user_id)
    user_obj.remove_skill(skill_id)
    return jsonify(success=True)


# --- Helper Functions ---


def update_basic_user_info(user_obj):
    """Updates basic user settings (IP, Online Status, Password)."""
    ip_address = request.form.get("ip_address")
    user_obj.ip_address = ip_address if ip_address else user_obj.ip_address
    user_obj.is_online = request.form.get("is_online") == "true"

    password = request.form.get("password")
    confirm_password = request.form.get("confirm_password")

    if password:
        if password != confirm_password:
            flash("Passwords do not match!", "danger")
            return redirect(url_for("user.edit_profile"))
        user_obj.set_password(password)


def clear_user_skills(user_obj):
    """Clears all skills for the user."""
    with db.session.no_autoflush:
        for skill in user_obj.skills:
            db.session.delete(skill)


def add_user_skills(user_obj, skills):
    """Adds new skills to the user."""
    user_obj.skills = []
    for skill_name in skills:
        skill_name = skill_name.strip()
        if skill_name:
            user_obj.skills.append(Skill(name=skill_name))


def handle_profile_picture_upload(user_obj):
    """Handles uploading and saving a user profile picture."""
    if "profile_picture" in request.files:
        file = request.files["profile_picture"]
        if file and allowed_file(file.filename):
            filename = f"{uuid.uuid4().hex}.{file.filename.rsplit('.', 1)[1].lower()}"
            filepath = os.path.join(Config.UPLOAD_FOLDER, "profile_pictures", filename)

            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            file.save(filepath)

            user_obj.profile_picture = filename


def handle_project_image_upload(file):
    """
    Saves a project image and returns the filename.
    Assumes storage in static/images/projects/
    """
    if file and allowed_file(file.filename):
        filename = f"{uuid.uuid4().hex}.{file.filename.rsplit('.', 1)[1].lower()}"
        # Adjust path as per your static folder structure
        upload_path = os.path.join(Config.STATIC_FOLDER, "images", "projects")

        os.makedirs(upload_path, exist_ok=True)
        file.save(os.path.join(upload_path, filename))

        return filename
    return None


def handle_video_s3_upload(file, user_obj, project_name, project_id):
    if not file or not getattr(file, "filename", ""):
        return False

    if "." not in file.filename:
        return False

    ext = file.filename.rsplit(".", 1)[1].lower()
    allowed_exts = {"mp4", "mov", "avi", "wmv", "mkv", "webm"}
    if ext not in allowed_exts:
        return False

    project_slug = secure_filename(project_name).replace("_", "-").lower()
    s3_filename = f"{user_obj.username}-{project_slug}.{ext}"

    try:
        # Ensure full file is uploaded even if it was previously read
        file.seek(0)

        s3_client.upload_fileobj(
            file,
            S3_UPLOAD_BUCKET,
            s3_filename,
            ExtraArgs={
                "ContentType": file.content_type or "video/mp4",
                "Metadata": {
                    "project-id": str(project_id)
                }
            },
        )
        return True
    except Exception as e:
        print(f"S3 Upload Error: {e}")
        return False
#
# def handle_video_s3_upload(file, user_obj, project_name):
#     """
#     Renames file to 'username-project-slug.ext' and uploads to S3.
#     """
#     if not file or file.filename == "":
#         return False
#
#     # 1. Generate Filename: "ben-space-invaders.mp4"
#     ext = file.filename.rsplit(".", 1)[1].lower()
#     if ext not in ["mp4", "mov", "avi", "wmv", "mkv", "webm"]:
#         return False
#
#     # Create slug from project name (Space Invaders -> space-invaders)
#     project_slug = secure_filename(project_name).replace("_", "-").lower()
#     s3_filename = f"{user_obj.username}-{project_slug}.{ext}"
#
#     # 2. Upload to S3
#     try:
#         s3_client.upload_fileobj(
#             file,
#             S3_UPLOAD_BUCKET,
#             s3_filename,
#             ExtraArgs={"ContentType": file.content_type},
#         )
#         return True
#     except Exception as e:
#         print(f"S3 Upload Error: {e}")
#         return False
