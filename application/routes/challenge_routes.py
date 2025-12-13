"""
File: challenge_routes.py
Type: py
Summary: Routes for handling challenge submissions and logging.
"""

import re
from urllib.parse import urlparse, parse_qs
from flask import Blueprint, render_template, request, flash, redirect, url_for, session
from application.extensions import db
from application.models.user import User
from application.models.challenge_log import ChallengeLog
from application.models.configuration import Configuration
from application.models.challenge import Challenge

# Renamed to 'challenge' based on your preference
challenge = Blueprint('challenge', __name__)

# Regex pattern for validating CodeCombat URLs
URL_PATTERN = r'codecombat\.com/(play/level|s/[^/]+/lessons/\d+/levels)/([^/?]+)'


@challenge.route('/challenge/submit', methods=['GET', 'POST'])
def submit_challenge():
    """
    Handle challenge submission via UI form.
    """
    # Ensure user is logged in
    if 'user' not in session:
        flash("No session username found. Please login.", "error")
        # UPDATED: Changed from 'auth_bp.login' to 'user.login' based on your error logs
        return redirect(url_for('user.login'))

    username = session['user']

    if request.method == 'POST':
        url = request.form.get('url')
        notes = request.form.get('notes')
        helpers = request.form.get('helpers')

        if not url:
            flash("Challenge URL is required.", "error")
            return render_template('submit_challenge.html')

        # Get configuration for duck multiplier
        config = Configuration.query.first()
        if not config:
            flash("Configuration missing. Please contact admin.", "error")
            return render_template('submit_challenge.html')

        # Process the URL
        result = detect_and_handle_challenge_url(
            url,
            username,
            duck_multiplier=config.duck_multiplier if config else 1,
            helper=helpers
        )

        if result['handled']:
            details = result['details']
            if details['success']:
                reward = details.get('duck_reward', 0)
                # UPDATED: Added .get() to avoid KeyError if message is missing
                msg = details.get('message', 'Challenge logged.')
                flash(f"Congrats! You earned {reward} ducks! {msg}", "success")
            else:
                flash(details.get('message', 'An error occurred.'), "error")
        else:
            flash("Invalid URL format. Please ensure it is a valid CodeCombat level URL.", "error")

        # UPDATED: Redirects to the current blueprint endpoint
        return redirect(url_for('challenge.submit_challenge'))

    return render_template('submit_challenge.html')


def detect_and_handle_challenge_url(message, username, duck_multiplier=1, helper=None):
    """
    Detects if a message contains a challenge URL and handles the logging/reward logic.
    """
    details = _extract_challenge_details(message)

    if details:
        # Prevent users from listing themselves as helpers
        if helper == username:
            helper = None

        log_result = _log_challenge(details, username, helper)

        if log_result['success']:
            # Award ducks
            try:
                reward = _update_user_ducks(
                    username,
                    details['challenge_slug'],
                    duck_multiplier
                )
                log_result['duck_reward'] = reward
            except Exception as e:
                print(f"Error awarding ducks: {e}")

        return {'handled': True, 'details': log_result}

    return {'handled': False, 'details': None}


def _extract_challenge_details(message):
    """
    Extracts challenge details (slug, course, instance) from a URL string.
    """
    match = re.search(URL_PATTERN, message)
    if match:
        url_parts = urlparse(message)
        query_params = parse_qs(url_parts.query)

        # Extract slug from the regex match
        challenge_slug = match.group(2)

        return {
            'domain': 'codecombat.com',
            'challenge_slug': challenge_slug,
            'course_id': query_params.get('course', [None])[0],
            'course_instance': query_params.get('course-instance', [None])[0]
        }
    return None


def _log_challenge(details, username, helper=None):
    """
    Logs the challenge attempt in the database, preventing duplicates.
    """
    try:
        # Check for duplicate entry using challenge_slug
        existing_log = ChallengeLog.query.filter_by(
            username=username,
            domain=details['domain'],
            challenge_slug=details['challenge_slug']
        ).first()

        if existing_log:
            return {
                'success': False,
                'message': f"Challenge '{details['challenge_slug']}' already claimed."
            }

        # Create new log entry
        new_log = ChallengeLog(
            username=username,
            domain=details['domain'],
            challenge_slug=details['challenge_slug'],
            course_id=details['course_id'],
            course_instance=details['course_instance'],
            helper=helper
        )

        db.session.add(new_log)
        db.session.commit()

        return {
            'success': True,
            'message': 'Challenge logged successfully'
        }

    except Exception as e:
        db.session.rollback()
        return {'success': False, 'message': f"Error logging challenge: {str(e)}"}


def _update_user_ducks(username, challenge_slug, duck_multiplier=1):
    """
    Calculates reward based on challenge difficulty and updates user balance.
    """
    user = User.query.filter_by(username=username).first()
    if not user:
        raise ValueError(f"User with username {username} not found")

    # Look up challenge by SLUG
    challenge = Challenge.query.filter_by(slug=challenge_slug).first()

    # Fallback: check case-insensitive match
    if not challenge:
        challenge = Challenge.query.filter(Challenge.slug.ilike(challenge_slug)).first()

    if not challenge:
        raise ValueError(f"Challenge '{challenge_slug}' not found in database.")

    # Calculate reward
    reward_value = challenge.scale_value(difficulty_multiplier=duck_multiplier)

    # Update user balance (using standard attribute access)
    user.earned_ducks += reward_value
    user.duck_balance += reward_value

    db.session.commit()
    print(f"{username} was granted {reward_value} duck(s).")

    return reward_value