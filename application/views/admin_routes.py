from flask import Blueprint, request, jsonify, render_template, redirect, url_for
from functools import wraps

from application.models.conversation import Conversation
from application.models.configuration import Configuration
from application.models.user import db, User
from application.config import Config
from application.models.banned_words import BannedWords, db

admin_bp = Blueprint('admin_bp', __name__)
admin_pass = Config.admin_pass
adminUsername = Config.adminUsername


def check_auth(f):
    @wraps(f)
    def authenticate_and_execute(*args, **kwargs):
        username = request.args.get('username') if request.method == 'GET' else request.form['username']
        password = request.args.get('password') if request.method == 'GET' else request.form['password']
        if username != adminUsername or password != admin_pass:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)

    return authenticate_and_execute


@admin_bp.route('/users', methods=['GET'])
@check_auth
def get_users():
    users = User.query.all()
    users_data = [
        {"id": user.id, "username": user.username, "ip_address": user.ip_address, "is_ai_teacher": user.is_ai_teacher}
        for user in users]
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


def update_username(new_username, user_id=None, user_ip=None):
    if user_id:  # ID takes priority
        user = User.query.get(user_id)
    elif user_ip:
        user = User.query.filter_by(ip_address=user_ip).first()
    else:
        return False, 'User not found'

    print(f"Admin updating user from {user.username} to {new_username}")
    user.username = new_username
    db.session.commit()
    return True, None


def set_username():
    user_id = request.form.get('user_id')
    user_ip = request.remote_addr
    new_username = request.form.get('username')
    if not new_username:
        return jsonify({'error': 'Missing user ID or new username'}), 400

    success, error_message = update_username(new_username, user_id, user_ip)
    if not success:
        return jsonify({'error': 'Failed to update username', 'message': error_message}), 500

    return jsonify({'success': True})


@admin_bp.route('/set_username', methods=['POST'])
def set_username_route():
    return set_username()


@admin_bp.route('/verify_password', methods=['POST'])
def verify_password():
    password = request.form['password']
    # Assuming password comparison for simplicity; use hashed passwords in real applications
    if password == admin_pass:
        return set_username()
    else:
        return jsonify(success=False), 401



@admin_bp.route('/dashboard')
def dashboard():
    users = User.query.all()
    config = Configuration.query.first()
    banned_words = BannedWords.query.all()  # Retrieve all banned words from the database
    return render_template('dashboard.html', users=users, config=config, banned_words=banned_words)



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


@admin_bp.route('/toggle-message-sending', methods=['POST'])
def toggle_message_sending():
    # Retrieve the first configuration entry from the database
    config = Configuration.query.first()

    if config is None:
        # If no configuration exists, initialize with default message sending disabled
        config = Configuration(message_sending_enabled=False)
        db.session.add(config)

    # Toggle the message sending setting
    config.message_sending_enabled = not config.message_sending_enabled
    db.session.commit()

    # Redirect to the dashboard after toggling the setting
    return redirect(url_for('admin_bp.dashboard'))


@admin_bp.route('/clear-history', methods=['POST'])
def clear_history():
    Conversation.query.delete()
    db.session.commit()
    return redirect(url_for('admin_bp.dashboard'))



# I should @check_auth
@admin_bp.route('/add-banned-word', methods=['POST'])
def add_banned_word():
    word = request.form['word']
    reason = request.form.get('reason', None)  # Optional field
    if BannedWords.query.filter_by(word=word).first():
        return jsonify({'error': 'Word already banned'}), 400

    new_banned_word = BannedWords(word=word, reason=reason)
    db.session.add(new_banned_word)
    db.session.commit()
    return redirect(url_for('admin_bp.dashboard'))
