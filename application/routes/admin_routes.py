import re
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, render_template
from functools import wraps
from sqlalchemy.sql import func
from sqlalchemy import cast, Date

from application.extensions import db, limiter
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.conversation import Conversation
from application.models.configuration import Configuration
from application.models.duck_trade import DuckTradeLog
from application.models.message import Message
from application.models.user import User
from application.models.banned_words import BannedWords
from application.config import Config
from flask import redirect, url_for

admin_bp = Blueprint('admin_bp', __name__)
admin_pass = Config.ADMIN_PASSWORD
adminUsername = Config.ADMIN_USERNAME

@admin_bp.before_request
@limiter.limit("5 per second, 50 per minute")
def before_user_request():
    # This function is just used for the decorator that handles the rate limiting logic.
    pass

# --------------------------
# Authentication Decorators
# --------------------------

def local_only(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if request.remote_addr != '127.0.0.1':
            return jsonify({"error": "Forbidden – local requests only"}), 403
        return f(*args, **kwargs)
    return wrapper

def check_auth(f):
    @wraps(f)
    def authenticate_and_execute(*args, **kwargs):
        auth = request.authorization
        if not auth or not (auth.password == admin_pass):
            return jsonify({"error": "Unauthorized"}), 401, {'WWW-Authenticate': 'Basic realm="Login Required"'}
        return f(*args, **kwargs)

    return authenticate_and_execute


# --------------------------
# Utility Functions
# --------------------------

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


def get_duck_transactions_data():
    """Generate chart data for duck transactions over the past 7 days"""
    end_date = datetime.now()

    # Create date labels (last 7 days)
    labels = [(end_date - timedelta(days=i)).strftime('%a') for i in range(6, -1, -1)]

    # Calculate ducks earned and spent per day
    earned = []
    spent = []

    for i in range(6, -1, -1):
        day = end_date - timedelta(days=i)
        day_start = datetime(day.year, day.month, day.day, 0, 0, 0)
        day_end = datetime(day.year, day.month, day.day, 23, 59, 59)

        # Ducks earned from challenges
        day_earned = db.session.query(
            func.coalesce(func.sum(Challenge.value), 0)
        ).select_from(ChallengeLog).join(
            Challenge, Challenge.slug.ilike(ChallengeLog.challenge_name)
        ).filter(
            ChallengeLog.timestamp.between(day_start, day_end)
        ).scalar() or 0

        # Ducks spent in trades
        day_spent = db.session.query(
            func.coalesce(func.sum(DuckTradeLog.digital_ducks), 0)
        ).filter(
            DuckTradeLog.timestamp.between(day_start, day_end),
            DuckTradeLog.status == 'approved'
        ).scalar() or 0

        earned.append(day_earned)
        spent.append(day_spent)

    return {
        'labels': labels,
        'earned': earned,
        'spent': spent
    }


# --------------------------
# Dashboard Routes
# --------------------------



@admin_bp.route('/')
@local_only
def base():
    return redirect(url_for('admin_bp.dashboard'))


@admin_bp.route('/dashboard')
@local_only
def dashboard():
    total_ducks = db.session.query(func.sum(User.ducks)).scalar() or 0

    # Calculate ducks earned today using actual challenge completions
    today = datetime.now().date()
    ducks_earned_today = db.session.query(
        func.coalesce(func.sum(Challenge.value), 0)
    ).select_from(ChallengeLog).join(
        Challenge, Challenge.slug.ilike(ChallengeLog.challenge_name)
    ).filter(
        cast(ChallengeLog.timestamp, Date) == today
    ).scalar()

    pending_trades_count = DuckTradeLog.query.filter_by(status='pending').count()
    active_users_count = User.query.filter_by(is_online=True).count()

    users = User.query.all()
    config = Configuration.query.first()
    banned_words = BannedWords.query.all()

    # Get chart data
    chart_data = get_duck_transactions_data()

    return render_template('admin/admin.html',
                           users=users,
                           config=config,
                           banned_words=banned_words,
                           total_ducks=total_ducks,
                           ducks_earned_today=ducks_earned_today,
                           pending_trades_count=pending_trades_count,
                           active_users_count=active_users_count,
                           chart_data=chart_data)


@admin_bp.route('/duck_transactions_data')
@local_only
def duck_transactions_data():
    chart_data = get_duck_transactions_data()
    return jsonify(chart_data)


# --------------------------
# User Management Routes
# --------------------------

@admin_bp.route('/users', methods=['GET'])
@local_only
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
@local_only
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


@admin_bp.route('/set_username', methods=['POST'])
@local_only
def set_username_route():
    return set_username()


@admin_bp.route('/verify_password', methods=['POST'])
@local_only
def verify_password():
    password = request.form['password']
    if password == admin_pass:
        return set_username()
    else:
        return jsonify(success=False), 401


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


@admin_bp.route('/reset_password', methods=['POST'])
@local_only
def reset_password():
    data = request.json
    username = data.get('username')
    new_password = data.get('new_password')

    if not username or not new_password:
        return jsonify({'success': False, 'message': 'Username and new password required'}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    user.set_password(new_password)
    db.session.commit()

    return jsonify({'success': True, 'message': f"Password reset for {username}"})


@admin_bp.route('/adjust_ducks', methods=['POST'])
@local_only
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

@admin_bp.route('/create_user', methods=['POST'])
@local_only
def create_user():
    username = request.form.get('username', '').strip().lower()
    password = request.form.get('password', '')
    ducks    = request.form.get('ducks', type=int)

    # server‑side validation
    if not username or not password or ducks is None or ducks < 0:
        return jsonify(success=False,
                       message="Username, password, and non‑negative ducks required"), 400

    # 3–30 chars, lowercase letters, numbers, underscores
    if not re.fullmatch(r'[a-z0-9_]{3,30}', username):
        return jsonify(success=False,
                       message="Username must be 3–30 chars: lowercase letters, numbers, or underscores only"), 400

    if User.query.filter_by(username=username).first():
        return jsonify(success=False, message="Username already exists"), 409

    try:
        new_user = User(username=username, ducks=ducks)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        return jsonify(success=True,
                       message=f"User '{username}' created with {ducks} ducks")
    except Exception as e:
        db.session.rollback()
        print(f"Error: Failed to create user: {e}")
        return jsonify(success=False, message="Internal server error"), 500

@admin_bp.route('/remove_user', methods=['POST'])
@local_only
def remove_user():
    username = request.form.get('username', '').strip().lower()
    if not username:
        return jsonify(success=False, message="Username is required"), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify(success=False, message="User not found"), 404

    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify(success=True, message=f"User '{username}' removed successfully")
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting user '{username}': {e}")
        return jsonify(success=False, message="Internal server error"), 500

# --------------------------
# System Configuration Routes
# --------------------------

@admin_bp.route('/toggle-ai', methods=['POST'])
@local_only
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
@local_only
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
@local_only
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


# --------------------------
# Content Moderation Routes
# --------------------------

@admin_bp.route('/add-banned-word', methods=['POST'])
@local_only
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
@local_only
def strike_message(message_id):
    message = Message.query.get(message_id)
    if not message:
        return jsonify(success=False, error="Message not found"), 404

    try:
        message.is_struck = True
        db.session.commit()
        return jsonify(success=True, message="Message struck successfully"), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error striking message: {e}")
        return jsonify(success=False, error="An error occurred while striking the message"), 500


# --------------------------
# Trade Management Routes
# --------------------------

# @admin_bp.route('/trades')
# @local_only
# def trades():
#     trades = Trade.query.order_by(Trade.timestamp.desc()).all()
#     return render_template('admin/trades.html', trades=trades)


@admin_bp.route('/pending_trades', methods=['GET'])
@local_only
def pending_trades():
    pend_trades = DuckTradeLog.query.filter_by(status="pending").all()
    return render_template('admin/pending_trades.html', trades=pend_trades)


@admin_bp.route('/trade_action', methods=['POST'])
@local_only
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