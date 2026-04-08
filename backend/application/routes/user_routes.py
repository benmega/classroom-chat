"""
File: user_routes.py
Type: py
Summary: Flask routes for user identity, profile management, and project portfolio.
"""

import os
import re
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
from application.extensions import db, limiter, csrf
from application.models.conversation import Conversation
from application.models.project import Project
from application.models.skill import Skill
from application.models.user import User
from application.utilities.helper_functions import allowed_file
from application.decorators.api_response import api_response


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


@csrf.exempt
@user.route("/login", methods=["GET", "POST"])
def login():
    form = LoginForm()
    if request.is_json:
        data = request.get_json()
        username = data.get("username", "").lower()
        password = data.get("password", "")
    else:
        if form.validate_on_submit():
            username = form.username.data.lower()
            password = form.password.data
        else:
            username = None
            password = None

    if username and password:
        user_obj = User.query.filter_by(username=username).first()

        if user_obj and user_obj.check_password(password):
            if not user_obj.is_approved and not user_obj.is_admin:
                if request.is_json:
                    return {"error": "Your account is awaiting admin approval.", "is_approved": False}, 403
                flash("Your account is awaiting admin approval.", "warning")
                return redirect(url_for("user.login"))

            session["user"] = user_obj.id
            session.permanent = True
            User.set_online(user_obj.id)

            awarded = user_obj.award_daily_duck(amount=1)
            
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

            if request.is_json:
                return {"user": user_obj.to_dict(), "awarded_duck": awarded}, 200
            
            flash("Login successful!", "success")
            if awarded:
                flash("Welcome! Daily duck awarded.", "success")
            return redirect(url_for("general.index"))
        else:
            if request.is_json:
                return "Invalid username or password.", 401
            flash("Invalid username or password.", "error")

    if request.is_json:
        return "Authentication required.", 400
    return render_template("auth/login.html", form=form)


@user.route("/api/auth/status")
@api_response
def auth_status():
    user_id = session.get("user")
    if user_id:
        user_obj = User.query.get(user_id)
        if user_obj:
            return {"logged_in": True, "user": user_obj.to_dict()}
    return {"logged_in": False}, 200



@user.route("/logout")
def logout():
    user_id = session.get("user")
    if user_id:
        User.set_online(user_id, False)

    session.pop("user", None)
    if request.is_json:
        return jsonify({"status": "success", "message": "Logged out"}), 200
    flash("You have been logged out.", "success")
    return redirect(url_for("user.login"))




@csrf.exempt
@user.route("/signup", methods=["POST"])
@api_response
def signup():
    data = request.get_json()
    username = data.get("username", "").strip().lower()
    password = data.get("password", "")

    if not username or not password:
        return "Username and password are required.", 400

    if not re.fullmatch(r"[a-z0-9_]{3,30}", username):
        return "Username must be 3-30 chars: lowercase letters, numbers, or underscores only.", 400

    if User.query.filter_by(username=username).first():
        return "Username already exists.", 409

    try:
        new_user = User(username=username, is_approved=False)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        return {"message": "Account created! Awaiting admin approval."}, 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error during signup: {e}")
        return "An error occurred during registration.", 500




# --- Profile & Settings Routes ---
@user.route("/profile", methods=["GET"])
@require_login
@api_response
def profile():
    user_id = session.get("user")
    user_obj = User.query.get(user_id)
    if not user_obj:
        return "User not found", 404

    if request.accept_mimetypes.best == "application/json" or request.is_json:
        return {"target": user_obj.to_dict(), "viewer": user_obj.to_dict()}
    
    # When viewing your own profile, target and viewer are the same
    return render_template("user/profile.html", target=user_obj, viewer=user_obj)


@user.route("/profile/<slug>", methods=["GET"])
@api_response
def view_user_profile(slug):
    # Use slug column for the lookup
    target_profile = User.query.filter_by(slug=slug).first_or_404()

    # Determine who is looking at the page
    viewer_id = session.get("user")
    viewer = User.query.get(viewer_id) if viewer_id else None

    if request.accept_mimetypes.best == "application/json" or request.is_json:
        return {
            "target": target_profile.to_dict(),
            "viewer": viewer.to_dict() if viewer else None
        }

    return render_template("user/profile.html", target=target_profile, viewer=viewer)



@user.route("/edit_profile", methods=["GET", "POST"])
@require_login
@api_response
def edit_profile():
    user_id = session.get("user")
    user_obj = User.query.get(user_id)

    if request.method == "POST":
        try:
            data = request.get_json() if request.is_json else request.form
            # 1. Update Basic Info (Password, IP, Online Status)
            update_basic_user_info(user_obj, data)

            # 2. Update Skills (Clear and Re-add)
            clear_user_skills(user_obj)
            add_user_skills(user_obj, data.getlist("skills[]") if hasattr(data, 'getlist') else data.get("skills", []))

            # 3. Handle Profile Picture (if uploaded via this form, currently only form-data)
            if not request.is_json:
                handle_profile_picture_upload(user_obj)

            db.session.commit()
            if request.is_json:
                return {"message": "Account settings updated successfully!"}, 200
            
            flash("Account settings updated successfully!", "success")
            return redirect(url_for("user.profile"))

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error during profile update: {e}")
            if request.is_json:
                return "An error occurred while updating the profile.", 500
            flash("An error occurred while updating the profile.", "danger")

    if request.accept_mimetypes.best == "application/json" or request.is_json:
        return {"user": user_obj.to_dict()}
    return render_template("user/edit_profile.html", user=user_obj)



# --- Project Management Routes ---
@user.route("/project/new", methods=["GET", "POST"])
@require_login
@api_response
def new_project():
    user_id = session.get("user")
    user_obj = User.query.get(user_id)

    if request.method == "POST":
        data = request.form # Using form because of file uploads
        name = data.get("name")
        
        if not name:
            return "Project name is required.", 400

        target_user_id = user_id
        if getattr(user_obj, 'is_admin', False):
            target_user_id = data.get('student_id') or user_id

        target_user = User.query.get(target_user_id)
        if not target_user:
            return 'Invalid student selection.', 400

        new_proj = Project(
            name=name,
            description=data.get('description'),
            link=data.get('link'),
            github_link=data.get('github_link'),
            video_url=data.get('video_url'),
            code_snippet=data.get('code_snippet'),
            teacher_comment=data.get('teacher_comment') if getattr(user_obj, 'is_admin', False) else None,
            user_id=target_user.id
        )

        db.session.add(new_proj)
        db.session.flush()

        if "project_image" in request.files:
            filename = handle_project_image_upload(request.files["project_image"])
            if filename:
                new_proj.image_url = f"images/projects/{filename}"

        if "project_video" in request.files:
            video_file = request.files["project_video"]
            if video_file.filename != "":
                handle_video_s3_upload(video_file, user_obj, name, project_id=new_proj.id)

        db.session.commit()
        
        if request.is_json or request.headers.get("X-Requested-With") == "XMLHttpRequest":
            return {"message": "Project created successfully!", "project_id": new_proj.id}
        
        flash("Project created successfully!", "success")
        return redirect(url_for("user.profile"))

    # GET logic
    if request.is_json or request.accept_mimetypes.accept_json:
        student_list = [u.to_dict() for u in User.query.all()] if getattr(user_obj, 'is_admin', False) else None
        return {"students": student_list}

    student_list = User.query.all() if getattr(user_obj, 'is_admin', False) else None
    return render_template('user/manage_project.html', project=None, user=user_obj, students=student_list)


@user.route("/project/edit/<int:project_id>", methods=["GET", "POST"])
@require_login
@api_response
def edit_project(project_id):
    user_id = session.get("user")
    current_user = User.query.get(user_id)
    project = Project.query.get_or_404(project_id)

    if project.user_id != user_id and not getattr(current_user, "is_admin", False):
        if request.is_json or request.accept_mimetypes.accept_json:
            return "You do not have permission to edit this project.", 403
        flash("You do not have permission to edit this project.", "danger")
        return redirect(url_for("user.profile"))

    if request.method == "POST":
        data = request.form # Using form because of file uploads
        action = data.get("action")

        if action == "delete":
            db.session.delete(project)
            db.session.commit()
            if request.is_json or request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return {"message": "Project deleted successfully."}
            flash("Project deleted.", "success")
            return redirect(url_for("user.profile"))

        # Default action is save
        project.name = data.get("name")
        project.description = data.get("description")
        project.link = data.get("link")
        project.github_link = data.get("github_link")
        project.video_url = data.get("video_url")
        project.code_snippet = data.get("code_snippet")

        if getattr(current_user, "is_admin", False):
            project.teacher_comment = data.get("teacher_comment")

        if "project_image" in request.files:
            file = request.files["project_image"]
            if file and file.filename != "":
                filename = handle_project_image_upload(file)
                if filename:
                    project.image_url = f"images/projects/{filename}"

        if "project_video" in request.files:
            video_file = request.files["project_video"]
            if video_file.filename != "":
                handle_video_s3_upload(video_file, current_user, project.name, project_id=project.id)

        db.session.commit()
        
        if request.is_json or request.headers.get("X-Requested-With") == "XMLHttpRequest":
            return {"message": "Project updated successfully!", "project": project.to_dict()}
            
        flash("Project updated successfully!", "success")
        return redirect(url_for("user.profile"))

    # GET logic
    if request.is_json or request.accept_mimetypes.accept_json:
        return {"project": project.to_dict()}
        
    return render_template("user/manage_project.html", project=project, user=current_user)


# --- Image & File Handling Routes ---


@user.route("/api/profile-picture", methods=["POST"])
@require_login
@api_response
def api_edit_profile_picture():
    user_id = session.get("user")
    user_obj = User.query.get(user_id)

    if "profile_picture" not in request.files:
        return "No file part in request", 400

    file = request.files["profile_picture"]
    if file.filename == "":
        return "No file selected", 400

    if not allowed_file(file.filename):
        return "Invalid file format. Allowed: " + ", ".join(Config.ALLOWED_EXTENSIONS), 400

    # Limit size to 5MB
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    if file_size > 5 * 1024 * 1024:
        return "File too large. Maximum size is 5MB.", 400

    try:
        filename = f"{uuid.uuid4().hex}.{file.filename.rsplit('.', 1)[1].lower()}"
        secure_path = os.path.join(
            current_app.config["UPLOAD_FOLDER"], "profile_pictures", filename
        )

        os.makedirs(os.path.dirname(secure_path), exist_ok=True)
        
        # Open and resize/save with PIL for consistency
        img = Image.open(file)
        img.save(secure_path)

        # Cleanup old image if it exists
        if user_obj.profile_picture:
            old_path = os.path.join(current_app.config["UPLOAD_FOLDER"], "profile_pictures", user_obj.profile_picture)
            if os.path.exists(old_path):
                os.remove(old_path)

        user_obj.profile_picture = filename
        db.session.commit()

        new_url = url_for("user.profile_picture", filename=filename)
        return {"new_url": new_url, "filename": filename}

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating profile picture: {e}")
        return "Server error during image processing.", 500


@user.route("/api/project-image", methods=["POST"])
@require_login
@api_response
def api_upload_project_image():
    if "project_image" not in request.files:
        return "No image part in request", 400

    file = request.files["project_image"]
    if file.filename == "":
        return "No file selected", 400

    if not allowed_file(file.filename):
        return "Invalid file format.", 400

    # Limit size to 10MB for projects
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    if file_size > 10 * 1024 * 1024:
        return "File too large. Maximum size is 10MB.", 400

    try:
        filename = handle_project_image_upload(file)
        if not filename:
            return "Failed to process image.", 500
        
        # We don't link to a specific project yet, just return the URL/filename
        # The frontend will send the filename back when saving the project form
        new_url = url_for('static', filename=f'images/projects/{filename}')
        return {"new_url": new_url, "filename": filename}

    except Exception as e:
        current_app.logger.error(f"Error uploading project image: {e}")
        return "Server error during image upload.", 500


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
    static_images_folder = os.path.join(Config.STATIC_FOLDER, "images")
    
    if filename == "Default_pfp.jpg":
        return send_from_directory(static_images_folder, filename)

    upload_folder = os.path.join(Config.UPLOAD_FOLDER, "profile_pictures")
    safe_path = os.path.normpath(filename)
    
    if os.path.isabs(safe_path) or safe_path.startswith(".."):
        abort(400)

    full_path = os.path.join(upload_folder, safe_path)
    
    if os.path.exists(full_path) and os.path.isfile(full_path):
        return send_from_directory(upload_folder, safe_path)
    else:
        # Fallback to default if not found on disk
        return send_from_directory(static_images_folder, "Default_pfp.jpg")


# --- API / Utility Routes ---


@user.route("/get_users", methods=["GET"])
def get_users():
    users = User.query.all()
    users_data = [{"id": u.id, "username": u.username} for u in users]
    return jsonify(users_data)


@user.route("/api/users/search", methods=["GET"])
@api_response
def search_users():
    query = request.args.get("q", "").strip()
    if not query:
        return {"users": []}

    # Search by username or nickname (case-insensitive)
    users = (
        User.query.filter(
            db.or_(
                User._username.ilike(f"%{query}%"),
                User.nickname.ilike(f"%{query}%")
            )
        )
        .limit(10)
        .all()
    )

    return {
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "nickname": u.nickname,
                "slug": u.slug,
                "profile_picture_url": f"/user/profile_pictures/{u.profile_picture}" if u.profile_picture else "/static/images/Default_pfp.jpg",
            }
            for u in users
        ]
    }


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


def update_basic_user_info(user_obj, data):
    """Updates basic user settings (IP, Online Status, Password)."""
    ip_address = data.get("ip_address")
    user_obj.ip_address = ip_address if ip_address else user_obj.ip_address
    user_obj.is_online = data.get("is_online") == "true" or data.get("is_online") is True

    password = data.get("password")
    confirm_password = data.get("confirm_password")

    if password:
        if password != confirm_password:
            return False  # Or raise an exception
        user_obj.set_password(password)
    return True



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