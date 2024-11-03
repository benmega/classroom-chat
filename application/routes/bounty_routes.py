from flask import Blueprint, render_template, request, redirect, url_for, session, flash
import re

from application import db
from application.models.bounty import Bounty

# Define the blueprint
bounty_bp = Blueprint('bounty_bp', __name__)

@bounty_bp.route('/bug_bounty', methods=['GET', 'POST'])
def submit_bug_bounty():
    # Check if the user is logged in
    if 'user' not in session:
        flash("Please log in to submit a bug bounty.")
        return redirect(url_for('user_bp.login'))  # Adjust this if your login route is named differently

    if request.method == 'POST':
        description = request.form.get('description')
        bounty = request.form.get('bounty')
        expected_behavior = request.form.get('expected_behavior')

        # Validate that the bounty is a binary number
        if not re.fullmatch(r'[0-1]+', bounty):
            flash("Bounty must be a binary number.")
            return redirect(url_for('bounty_py.submit_bug_bounty'))

        if add_bug_bounty(session['user'], description, bounty, expected_behavior):
            flash("Bug bounty submitted successfully!")
        else:
            flash("Error submitting bug bounty. Please try again.")

        flash("Bug bounty submitted successfully!")
        return redirect(url_for('general_bp.index'))

    return render_template('bug_bounty.html')

def add_bug_bounty(user_id, description, bounty, expected_behavior=None):
    try:
        new_bounty = Bounty(
            user_id=user_id,
            description=description,
            bounty=bounty,
            expected_behavior=expected_behavior
        )
        db.session.add(new_bounty)
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print(f"Error adding bounty: {e}")
        return False


@bounty_bp.route('/view_bounties', methods=['GET'])
def view_bounties():
    if 'user' not in session:
        flash("Please log in to view bug bounties.")
        return redirect(url_for('user_bp.login'))

    user_id = session['user']
    bounties = Bounty.query.all()

    # Pass user_id to the template
    return render_template('view_bounties.html', bounties=bounties, user_id=user_id)

@bounty_bp.route('/update_bounty_status/<int:bounty_id>', methods=['POST'])
def update_bounty_status(bounty_id):
    if 'user' not in session:
        flash("Please log in to update the bounty status.")
        return redirect(url_for('user.login'))

    bounty = Bounty.query.get_or_404(bounty_id)
    user_id = session['user']

    # Ensure the user can only update their own bounties
    if bounty.user_id != user_id:
        flash("You can only update the status of your own bounties.")
        return redirect(url_for('bounty_bp.view_bounties'))

    new_status = request.form.get('status')
    if new_status not in ["Open", "In Progress", "Resolved"]:
        flash("Invalid status selected.")
        return redirect(url_for('bounty_bp.view_bounties'))

    bounty.status = new_status
    db.session.commit()
    flash("Bounty status updated successfully!")
    return redirect(url_for('bounty_bp.view_bounties'))