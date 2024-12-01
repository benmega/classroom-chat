from flask import Blueprint, render_template, request, redirect, url_for, session, flash
import re

# Define the blueprint
bounty_bp = Blueprint('bounty', __name__)

@bounty_bp.route('/bug_bounty', methods=['GET', 'POST'])
def submit_bug_bounty():
    # Check if the user is logged in
    if 'user_id' not in session:
        flash("Please log in to submit a bug bounty.")
        return redirect(url_for('user_bp.login'))  # Adjust this if your login route is named differently

    if request.method == 'POST':
        description = request.form.get('description')
        bounty = request.form.get('bounty')
        expected_behavior = request.form.get('expected_behavior')

        # Validate that the bounty is a binary number
        if not re.fullmatch(r'[0-1]+', bounty):
            flash("Bounty must be a binary number.")
            return redirect(url_for('bounty.submit_bug_bounty'))

        # Placeholder for database saving logic
        # e.g., add_bug_bounty(session['user_id'], description, bounty, expected_behavior)

        flash("Bug bounty submitted successfully!")
        return redirect(url_for('bounty.submit_bug_bounty'))  # Redirect to the same page or a success page

    return render_template('bug_bounty.html')
