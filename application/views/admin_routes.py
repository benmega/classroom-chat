from flask import Blueprint, request, jsonify, render_template, redirect, url_for
from functools import wraps

from application.models.conversation import Conversation
from application.models.database import Configuration
from application.models.user import db, User

admin_bp = Blueprint('admin_bp', __name__)
adminPass = '1234'  # Global variable for admin password
adminUsername = 'Mr. Mega'

def check_auth(f):
    @wraps(f)
    def authenticate_and_execute(*args, **kwargs):
        username = request.args.get('username') if request.method == 'GET' else request.form['username']
        password = request.args.get('password') if request.method == 'GET' else request.form['password']
        if username != adminUsername or password != adminPass:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return authenticate_and_execute

@admin_bp.route('/users', methods=['GET'])
@check_auth
def get_users():
    users = User.query.all()
    users_data = [{"id": user.id, "username": user.username, "ip_address": user.ip_address, "is_ai_teacher": user.is_ai_teacher} for user in users]
    return jsonify(users_data)

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@check_auth
def update_user(user_id):
    user = User.query.get(user_id)
    if user:
        user.username = request.form.get('username', user.username)
        user.is_ai_teacher = request.form.get('is_ai_teacher', user.is_ai_teacher) in ['true', 'True', '1']
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"error": "User not found"}), 404

@admin_bp.route('/set_username', methods=['POST'])
def set_username():
    # Assuming the user ID is sent in the form data
    user_id = request.form.get('user_id')
    new_username = request.form.get('username')

    if not user_id or not new_username:
        return jsonify({'error': 'Missing user ID or new username'}), 400

    # Find the user in the database
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Update the username
    user.username = new_username
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update username', 'message': str(e)}), 500

    return jsonify({'success': True})

@admin_bp.route('/verify_password', methods=['POST'])
def verify_password():
    password = request.form['password']
    if password == adminPass:
        return jsonify(success=True)
    else:
        return jsonify(success=False), 401

@admin_bp.route('/dashboard')
def dashboard():
    users = User.query.all()
    config = Configuration.query.first()
    return render_template('dashboard.html', users=users, config=config)


@admin_bp.route('/toggle-ai', methods=['POST'])
def toggle_ai():
    config = Configuration.query.first()
    if config is None:
        # If no configuration exists, create a default and save it
        config = Configuration(ai_teacher_enabled=False)
        db.session.add(config)

    # Toggle the AI teacher setting
    config.ai_teacher_enabled = not config.ai_teacher_enabled
    db.session.commit()
    return redirect(url_for('admin_bp.dashboard'))

@admin_bp.route('/clear-history', methods=['POST'])
def clear_history():
    Conversation.query.delete()
    db.session.commit()
    return redirect(url_for('admin_bp.dashboard'))
