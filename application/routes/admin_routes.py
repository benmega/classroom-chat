from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, render_template, redirect, url_for, session, flash
from functools import wraps
from application.extensions import db
from application.models.conversation import Conversation
from application.models.configuration import Configuration
from application.models.duck_trade import DuckTradeLog
from application.models.message import Message
from application.models.trade import Trade
from application.models.user import User
from application.config import Config
from application.models.banned_words import BannedWords
from sqlalchemy.sql import func

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
        user_dict['projects'] = [
            {"id": project.id, "name": project.name, "description": project.description, "link": project.link} for
            project in user.projects]
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
    # Get total ducks in circulation
    total_ducks = db.session.query(func.sum(User.ducks)).scalar() or 0

    # Get ducks earned today (placeholder since DuckTransaction is not fully implemented)
    # In a real implementation, you would query actual transactions
    today = datetime.now().date()
    ducks_earned_today = 0  # Replace with actual query when DuckTransaction is implemented

    # Get pending trades count
    pending_trades_count = DuckTradeLog.query.filter_by(status='pending').count()

    # Get active users count
    active_users_count = User.query.filter_by(is_online=True).count()

    users = User.query.all()
    config = Configuration.query.first()
    banned_words = BannedWords.query.all()

    return render_template('admin/admin.html',
                           users=users,
                           config=config,
                           banned_words=banned_words,
                           total_ducks=total_ducks,
                           ducks_earned_today=ducks_earned_today,
                           pending_trades_count=pending_trades_count,
                           active_users_count=active_users_count)


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

    # Return JSON response for the frontend
    return jsonify({
        'success': True,
        'message': f"AI Teacher has been {'disabled' if config.ai_teacher_enabled else 'enabled'}",
        'status': config.ai_teacher_enabled
    })


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

    # Return JSON response for the frontend
    return jsonify({
        'success': True,
        'message': f"Message sending has been {'disabled' if config.message_sending_enabled else 'enabled'}",
        'status': config.message_sending_enabled
    })


@admin_bp.route('/clear-partial-history', methods=['POST'])
def clear_partial_history():
    try:
        # Example: Clear only conversations older than 30 days
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        conversations_to_delete = Conversation.query.filter(Conversation.created_at < cutoff_date)
        count = conversations_to_delete.count()
        conversations_to_delete.delete(synchronize_session=False)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f"Cleared {count} conversations older than 30 days"
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error clearing history: {e}")
        return jsonify({
            'success': False,
            'message': "Failed to clear partial history"
        }), 500


@admin_bp.route('/add-banned-word', methods=['POST'])
@check_auth  # Add authentication
def add_banned_word():
    word = request.form.get('word')
    reason = request.form.get('reason', None)  # Optional field

    if not word:
        return jsonify({'success': False, 'message': 'Word cannot be empty'}), 400

    if BannedWords.query.filter_by(word=word).first():
        return jsonify({'success': False, 'message': 'Word already banned'}), 400

    new_banned_word = BannedWords(word=word, reason=reason)
    db.session.add(new_banned_word)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f"'{word}' has been added to banned words"
    })


@admin_bp.route('/strike_message/<int:message_id>', methods=['POST'])
@check_auth  # Add authentication
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


@admin_bp.route('/trades')
@check_auth
def trades():
    # Fetch trades from the database
    trades = Trade.query.order_by(Trade.timestamp.desc()).all()
    return render_template('admin/trades.html', trades=trades)


@admin_bp.route('/adjust_ducks', methods=['POST'])
@check_auth
def adjust_ducks():
    username = request.form.get('username')
    amount = request.form.get('amount', type=int)

    if not username or amount is None:
        return jsonify({
            'success': False,
            'message': "Username and amount required"
        }), 400

    user = User.query.filter_by(username=username).first()
    if user:
        user.ducks += amount  # Add or subtract ducks
        db.session.commit()
        return jsonify({
            'success': True,
            'message': f"Updated {username}'s ducks by {amount}."
        })
    else:
        return jsonify({
            'success': False,
            'message': "User not found."
        }), 404


@admin_bp.route('/pending_trades', methods=['GET'])
@check_auth
def pending_trades():
    pend_trades = DuckTradeLog.query.filter_by(status="pending").all()
    return render_template('admin/pending_trades.html', trades=pend_trades)


@admin_bp.route('/trade_action', methods=['POST'])
@check_auth
def trade_action():
    trade_id = request.form.get('trade_id')
    action = request.form.get('action')

    trade = DuckTradeLog.query.get(trade_id)
    if not trade:
        return jsonify({'status': 'error', 'message': 'Trade not found'}), 404

    if action == "approve":
        user = User.query.filter_by(username=trade.username).first()
        if not user:
            return jsonify({'status': 'error', 'message': 'User not found'}), 404

        if user.ducks < trade.digital_ducks:
            return jsonify({'status': 'error', 'message': 'Insufficient ducks'}), 400

        user.ducks -= trade.digital_ducks
        trade.approve()
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Trade approved'})

    elif action == "reject":
        trade.reject()
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Trade rejected'})

    return jsonify({'status': 'error', 'message': 'Invalid action'}), 400


@admin_bp.route('/reset_password', methods=['POST'])
@check_auth
def reset_password():
    username = request.form.get('username')
    new_password = request.form.get('new_password')

    if not username or not new_password:
        return jsonify({'success': False, 'message': 'Username and new password required'}), 400

    # Find user and update password
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    # Update password - you'll need to implement a password hashing method
    # For demonstration, assuming you have a function like this:
    # user.password = hash_password(new_password)
    user.password = new_password  # Replace with proper hashing in production
    db.session.commit()

    return jsonify({'success': True, 'message': f"Password reset for {username}"})


@admin_bp.route('/duck_transactions_data')
@check_auth
def duck_transactions_data():
    # Get date range (last 7 days)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)

    # Since DuckTransaction is not fully implemented, return sample data
    # In a real implementation, you would query the database

    # Sample data structure
    labels = [(end_date - timedelta(days=i)).strftime('%a') for i in range(6, -1, -1)]
    earned = [45, 29, 68, 31, 52, 27, 38]  # Replace with actual data
    spent = [30, 15, 42, 25, 40, 20, 35]  # Replace with actual data

    return jsonify({
        'labels': labels,
        'earned': earned,
        'spent': spent
    })