from flask import Blueprint, jsonify
from flask import render_template, request, redirect, url_for, session, flash

from application import db
from application.models.conversation import Conversation
from application.models.user import User


user_bp = Blueprint('user_bp', __name__)

@user_bp.route('/get_users', methods=['GET'])
def get_users():
    users = User.query.all()
    users_data = [{'id': user.id, 'username': user.username, 'email': user.email} for user in users]
    return jsonify(users_data)

@user_bp.route('/get_user_id', methods=['GET'])
def get_user_id():
    user_username = session.get('user')
    if user_username:
        user = User.query.filter_by(username=user_username).first()
        if user:
            return jsonify({'user_id': user.id})
    return jsonify({'user_id': None}), 404


@user_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

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

            flash('Login successful!', 'success')
            return redirect(url_for('general_bp.index'))

        else:
            flash('Invalid username or password.', 'error')
            return render_template('login.html')

    return render_template('login.html')


@user_bp.route('/logout')
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
    return redirect(url_for('user_bp.login'))


@user_bp.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        # Check if the username already exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash('Username already taken, please choose another.', 'error')
            return render_template('signup.html')

        # Create a new user with the hashed password
        new_user = User(username=username, ip_address=request.remote_addr)
        new_user.set_password(password)

        # Save the new user to the database
        db.session.add(new_user)
        db.session.commit()

        flash('Signup successful! Please log in.', 'success')
        return redirect(url_for('user_bp.login'))

    # Render the signup page on GET request
    return render_template('signup.html')

@user_bp.route('/update_profile', methods=['POST'])
def update_profile():
    user_id = session.get('user')
    user = User.query.get(user_id)

    if user:
        user.username = request.form['username']
        db.session.commit()
        flash('Profile updated successfully!', 'success')
    else:
        flash('User not found!', 'danger')

    return redirect(url_for('user_bp.profile'))

# @user_bp.route('/edit_profile', methods=['GET', 'POST'])
# def edit_profile():
#     user_id = session.get('user')  # Get the logged-in user's ID from the session
#     user = User.query.filter_by(username=user_id).first()
#
#     if not user:
#         flash('User not found!', 'danger')
#         return redirect(url_for('user_bp.profile'))
#
#     if request.method == 'POST':
#         # Handle profile update logic
#         user.username = request.form['username']
#         # Add logic for updating additional fields if needed
#         db.session.commit()
#         flash('Profile updated successfully!', 'success')
#         return redirect(url_for('user_bp.profile'))
#
#     return render_template('edit_profile.html', user=user)

@user_bp.route('/edit_profile', methods=['GET', 'POST'])
def edit_profile():
    user_id = session.get('user')
    user = User.query.filter_by(username=user_id).first()

    if not user:
        flash('User not found!', 'danger')
        return redirect(url_for('user_bp.profile'))

    if request.method == 'POST':
        # Update basic fields
        user.username = request.form['username']
        ip_address = request.form.get('ip_address')
        user.ip_address = ip_address if ip_address else user.ip_address
        user.is_online = request.form.get('is_online') == 'true'

        # Update password if provided
        password = request.form.get('password')
        if password:
            user.set_password(password)

        # Update skills
        # user.skills = []
        # for skill_name in request.form.getlist('skills[]'):
        #     if skill_name.strip():
        #         user.skills.append(Skill(name=skill_name.strip()))
        #
        # # Update projects
        # user.projects = []
        # project_names = request.form.getlist('project_names[]')
        # project_descriptions = request.form.getlist('project_descriptions[]')
        # project_links = request.form.getlist('project_links[]')
        # for name, desc, link in zip(project_names, project_descriptions, project_links):
        #     if name.strip():
        #         user.projects.append(Project(name=name.strip(), description=desc.strip(), link=link.strip()))

        db.session.commit()
        flash('Profile updated successfully!', 'success')
        return redirect(url_for('user_bp.profile'))

    return render_template('edit_profile.html', user=user)


@user_bp.route('/change_password', methods=['POST'])
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

    return redirect(url_for('user_bp.profile'))


@user_bp.route('/profile', methods=['GET'])
def profile():
    user_id = session.get('user')
    if not user_id:
        flash('Please log in to access your profile.', 'warning')
        return redirect(url_for('user_bp.login'))

    user = User.query.filter_by(username=user_id).first()
    if not user:
        flash('User not found!', 'danger')
        return redirect(url_for('user_bp.login'))

    return render_template('profile.html', user=user)
