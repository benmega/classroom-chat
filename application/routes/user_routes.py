import os
import uuid

from flask import Blueprint, jsonify, send_from_directory, current_app, abort
from flask import render_template, request, redirect, url_for, session, flash
from application.extensions import db, limiter
from application.models.conversation import Conversation
from application.models.project import Project
from application.models.skill import Skill
from application.models.user import User
from application.services.achievement_engine import evaluate_user
from application.utilities.helper_functions import allowed_file
from application.config import Config
from PIL import Image
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired

user = Blueprint('user', __name__)



class LoginForm(FlaskForm):
    username = StringField(
        'Username',
        validators=[DataRequired()],
        render_kw={"id": "username", "required": "required"}
    )
    password = PasswordField(
        'Password',
        validators=[DataRequired()],
        render_kw={"id": "password", "required": "required"}
    )
    submit = SubmitField('Login', render_kw={"class": "login-button"})


@user.route('/get_users', methods=['GET'])
def get_users():
    users = User.query.all()
    users_data = [{'id': user.id, 'username': user.username, 'email': user.email} for user in users]
    return jsonify(users_data)


@user.route('/get_user_id', methods=['GET'])
def get_user_id():
    user_username = session.get('user')
    if user_username:
        user = User.query.filter_by(username=user_username).first()
        if user:
            return jsonify({'user_id': user.id})
    return jsonify({'user_id': None}), 404


@user.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()

    if form.validate_on_submit():  # Automatically handles CSRF
        username = form.username.data
        password = form.password.data

        # Find the user by username
        user = User.query.filter_by(username=username).first()

        # Validate credentials
        if user and user.check_password(password):
            session['user'] = user.username
            session.permanent = True  # Make the session permanent
            user.set_online(user.id)  # Mark the user as online

            # Fetch the most recent conversation
            recent_conversation = (
                Conversation.query
                .order_by(Conversation.created_at.desc())
                .first()
            )

            if recent_conversation:
                # Add the user to the conversation if not already a participant
                if user not in recent_conversation.users:
                    recent_conversation.users.append(user)
                    db.session.commit()

                session['conversation_id'] = recent_conversation.id
            else:
                session['conversation_id'] = None  # Or handle new conversation creation

            # from application.services.achievement_engine import evaluate_user
            # new_awards = evaluate_user(user) # Check for achievements

            flash('Login successful!', 'success')
            return redirect(url_for('general.index'))

        else:
            flash('Invalid username or password.', 'error')

    return render_template('auth/login.html', form=form)


@user.route('/logout')
def logout():
    # Get the current user from the session
    username = session.get('user')

    # Find the user in the database
    user = User.query.filter_by(username=username).first()

    if user:
        # Mark the user as offline
        user.set_online(user.id, False)
        db.session.commit()

    # Clear the session
    session.pop('user', None)

    flash('You have been logged out.', 'success')
    return redirect(url_for('user.login'))


@user.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        # Check if the username already exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash('Username already taken, please choose another.', 'error')
            return render_template('auth/signup.html')

        # Create a new user with the hashed password
        new_user = User(username=username, ip_address=request.remote_addr)
        new_user.set_password(password)

        # Save the new user to the database
        db.session.add(new_user)
        db.session.commit()

        flash('Signup successful! Please log in.', 'success')
        return redirect(url_for('user.login'))

    # Render the signup page on GET request
    return render_template('auth/signup.html')


@user.route('/update_profile', methods=['POST'])
def update_profile():
    user_id = session.get('user')
    user = User.query.get(user_id)

    if user:
        user.username = request.form['username']
        db.session.commit()
        flash('Profile updated successfully!', 'success')
    else:
        flash('User not found!', 'danger')

    return redirect(url_for('user.profile'))


@user.route('/edit_profile', methods=['GET', 'POST'])
def edit_profile():
    user_id = session.get('user')
    user = User.query.filter_by(username=user_id).first()

    if not user:
        flash('User not found!', 'danger')
        return redirect(url_for('user.profile'))

    if request.method == 'POST':
        try:
            # 1. Update basic fields
            update_basic_user_info(user)

            # 2. Remove existing skills and projects safely
            clear_user_skills_and_projects(user)

            # 3. Add new skills
            add_user_skills(user, request.form.getlist('skills[]'))

            # 4. Add new projects
            add_user_projects(
                user,
                request.form.getlist('project_names[]'),
                request.form.getlist('project_descriptions[]'),
                request.form.getlist('project_links[]'),
            )

            # 5. Handle profile picture upload
            handle_profile_picture_upload(user)

            # Commit changes to the database
            db.session.commit()

            # Check for achievements
            # evaluate_user(user)

            flash('Profile updated successfully!', 'success')
            return redirect(url_for('user.profile'))
        except Exception as e:
            db.session.rollback()  # Roll back any changes on error
            print(f"Error during profile update: {e}")
            flash('An error occurred while updating the profile.', 'danger')

    return render_template('user/edit_profile.html', user=user)



@user.route('/edit_profile_picture', methods=['POST'])
def edit_profile_picture():
    user_id = session.get('user')
    user = User.query.filter_by(username=user_id).first()
    if not user:
        return jsonify({'success': False, 'error': 'User not found!'}), 404

    if 'profile_picture' not in request.files:
        return jsonify({'success': False, 'error': 'No file part in the request'}), 400

    file = request.files['profile_picture']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400

    try:

        filename = f"{user.username}_avatar.png"
        secure_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'profile_pictures', filename)
        img = Image.open(file)
        img.save(secure_path)
        user.profile_picture = filename

        db.session.commit()

        new_url = url_for('user.profile_picture', filename=filename)

        return jsonify({
            'success': True,
            'message': 'Profile picture updated successfully!',
            'new_url': new_url
        })

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating profile picture: {e}")
        return jsonify({'success': False, 'error': 'Error updating profile picture.'}), 500


@user.route("/remove_skill/<int:skill_id>", methods=["POST"])
def remove_skill(skill_id):
    user_id = session.get('user')
    user = User.query.filter_by(username=user_id).first()
    if not user:
        return jsonify({'success': False, 'error': 'User not found!'}), 404

    user.remove_skill(skill_id)
    return jsonify(success=True)

# Helper Functions
def update_basic_user_info(user):
    """Updates basic user information from the form."""
    ip_address = request.form.get('ip_address')
    user.ip_address = ip_address if ip_address else user.ip_address
    user.is_online = request.form.get('is_online') == 'true'

    password = request.form.get('password')
    confirm_password = request.form.get('confirm_password')

    if password and password != confirm_password:
        flash('Passwords do not match!', 'danger')
        return redirect(url_for('user.edit_profile'))

    if password:
        user.set_password(password)

def clear_user_skills_and_projects(user):
    """Clears all skills and projects for the user."""
    with db.session.no_autoflush:
        for skill in user.skills:
            db.session.delete(skill)
        for project in user.projects:
            db.session.delete(project)


def add_user_skills(user, skills):
    """Adds new skills to the user."""
    user.skills = []
    for skill_name in skills:
        skill_name = skill_name.strip()
        if skill_name:
            user.skills.append(Skill(name=skill_name))


def add_user_projects(user, project_names, project_descriptions, project_links):
    """Adds new projects to the user."""
    user.projects = []
    for name, desc, link in zip(project_names, project_descriptions, project_links):
        name = name.strip()
        if name:
            user.projects.append(Project(name=name, description=desc.strip(), link=link.strip()))


def handle_profile_picture_upload(user):
    """Handles uploading and saving a profile picture."""
    if 'profile_picture' in request.files:
        file = request.files['profile_picture']
        if file and allowed_file(file.filename):
            # Generate a unique filename
            filename = f"{uuid.uuid4().hex}.{file.filename.rsplit('.', 1)[1].lower()}"
            filepath = os.path.join(Config.UPLOAD_FOLDER, 'profile_pictures', filename)

            # Save the file and update user profile
            file.save(filepath)
            user.profile_picture = filename
            print(f"Profile picture uploaded: {filename}")
        else:
            print("Invalid file type or no file selected.")


@user.route('/change_password', methods=['POST'])
def change_password():
    user_id = session.get('user')
    user = User.query.get(user_id)

    current_password = request.form['current_password']
    new_password = request.form['new_password']
    confirm_password = request.form['confirm_password']

    if not user.check_password(current_password):
        flash('Incorrect current password!', 'danger')
    elif new_password != confirm_password:
        flash('Passwords do not match!', 'danger')
    else:
        user.set_password(new_password)
        db.session.commit()
        flash('Password updated successfully!', 'success')

    return redirect(url_for('user.profile'))


@user.route('/profile', methods=['GET'])
def profile():
    user_id = session.get('user')
    if not user_id:
        flash('Please log in to access your profile.', 'warning')
        return redirect(url_for('user.login'))

    user = User.query.filter_by(username=user_id).first()
    if not user:
        flash('User not found!', 'danger')
        return redirect(url_for('user.login'))

    return render_template('user/profile.html', user=user)


@user.route('/delete_profile_picture', methods=['POST'])
def delete_profile_picture():
    user_id = session.get('user')
    user = User.query.filter_by(username=user_id).first()

    if user.profile_picture:
        # Remove the file from storage
        filepath = os.path.join(Config.UPLOAD_FOLDER, 'profile_pictures', user.profile_picture)
        if os.path.exists(filepath):
            os.remove(filepath)

        # Remove the reference in the database
        user.profile_picture = None
        db.session.commit()

    flash('Profile picture removed successfully!', 'success')
    return redirect(url_for('profile'))


@user.route('/upload_profile_picture', methods=['POST'])
def upload_profile_picture():
    user_id = session.get('user')
    user = User.query.filter_by(username=user_id).first()

    if 'profile_picture' not in request.files:
        flash('No file part', 'error')
        return redirect(url_for('user.profile'))

    file = request.files['profile_picture']
    if file.filename == '':
        flash('No selected file', 'error')
        return redirect(url_for('user.profile'))

    if file and allowed_file(file.filename):
        filename = f"{uuid.uuid4().hex}_{file.filename.rsplit('.', 1)[1].lower()}"
        filepath = os.path.join(Config.UPLOAD_FOLDER, 'profile_pictures' , filename)
        file.save(filepath)

        # Update the user's profile picture
        if user.profile_picture:
            # Remove old profile picture
            old_filepath = os.path.join(Config.UPLOAD_FOLDER, 'profile_pictures', user.profile_picture)
            if os.path.exists(old_filepath):
                os.remove(old_filepath)

        user.profile_picture = filename
        db.session.commit()

        flash('Profile picture updated successfully!', 'success')
    else:
        flash('Invalid file type', 'error')

    return redirect(url_for('user.profile'))


@limiter.limit("50 per minute")
@user.route('/profile_pictures/<path:filename>')
def profile_picture(filename):
    PROFILE_PICTURE_FOLDER = os.path.join(Config.UPLOAD_FOLDER, 'profile_pictures')

    # prevent path traversal (../../ attacks)
    safe_path = os.path.normpath(filename)
    if os.path.isabs(safe_path) or safe_path.startswith(".."):
        abort(400)

    try:
        return send_from_directory(PROFILE_PICTURE_FOLDER, safe_path)
    except FileNotFoundError:
        abort(404)