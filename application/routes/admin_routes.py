from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, render_template, redirect, url_for, session
from functools import wraps
from application.extensions import db
from application.models.conversation import Conversation
from application.models.configuration import Configuration
from application.models.message import Message
from application.models.user import User
from application.config import Config
from application.models.banned_words import BannedWords

admin_bp = Blueprint('admin_bp', __name__)
admin_pass = Config.ADMIN_PASSWORD
adminUsername = Config.ADMIN_USERNAME


def check_auth(f):
    @wraps(f)
    def authenticate_and_execute(*args, **kwargs):
        auth = request.authorization
        if not auth or not (auth.password == admin_pass):
            # Send a WWW-Authenticate header to prompt the client to provide credentials
            return jsonify({"error": "Unauthorized"}), 401, {'WWW-Authenticate': 'Basic realm="Login Required"'}
        return f(*args, **kwargs)

    return authenticate_and_execute


@admin_bp.route('/users', methods=['GET'])
@check_auth
def get_users():
    users = User.query.all()
    users_data = []
    for user in users:
        user_dict = {column.name: getattr(user, column.name) for column in user.__table__.columns}
        user_dict['skills'] = [{"id": skill.id, "name": skill.name} for skill in user.skills]
        user_dict['projects'] = [{"id": project.id, "name": project.name, "description": project.description, "link": project.link} for project in user.projects]
        users_data.append(user_dict)

    return jsonify(users_data)


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@check_auth
def update_user(user_id):
    user = User.query.get(user_id)
    if user:
        for column in user.__table__.columns:
            column_name = column.name
            if column_name in request.form:
                setattr(user, column_name, request.form[column_name])

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
@check_auth
def dashboard():
    users = User.query.all()
    config = Configuration.query.first()
    banned_words = BannedWords.query.all()  # Retrieve all banned words from the database
    return render_template('admin.html', users=users, config=config, banned_words=banned_words)



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
    else:
        # Toggle the message sending setting
        config.message_sending_enabled = not config.message_sending_enabled
    db.session.commit()

    # Redirect to the dashboard after toggling the setting
    return redirect(url_for('admin_bp.dashboard'))
@admin_bp.route('/clear-history', methods=['POST'])
def clear_history():
    try:
        conversations = Conversation.query.all()
        for conversation in conversations:
            db.session.delete(conversation)
        db.session.commit()
        session['conversation_id'] = ''
        return redirect(url_for('admin_bp.dashboard'))
    except Exception as e:
        db.session.rollback()  # Rollback in case of an error
        print(f"Error clearing history: {e}")
        return redirect(url_for('admin_bp.dashboard', error="Failed to clear history"))



@admin_bp.route('/clear-partial-history', methods=['POST'])
def clear_partial_history():
    try:
        # Example: Clear only conversations older than 30 days
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        conversations_to_delete = Conversation.query.filter(Conversation.created_at < cutoff_date)
        conversations_to_delete.delete(synchronize_session=False)
        db.session.commit()
        return redirect(url_for('admin_bp.dashboard'))
    except Exception as e:
        db.session.rollback()
        print(f"Error clearing history: {e}")
        return redirect(url_for('admin_bp.dashboard', error="Failed to clear history"))


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


@admin_bp.route('/strike_message/<int:message_id>', methods=['POST'])
def strike_message(message_id):
    # Query the message from the Message model
    message = Message.query.get(message_id)
    if not message:
        return jsonify(success=False, error="Message not found"), 404

    try:
        # Mark the message as struck
        message.is_struck = True
        db.session.commit()
        return jsonify(success=True, message="Message struck successfully"), 200
    except Exception as e:
        db.session.rollback()  # Rollback any changes in case of an error
        print(f"Error striking message: {e}")
        return jsonify(success=False, error="An error occurred while striking the message"), 500

