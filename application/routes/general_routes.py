from flask import Blueprint
from flask import session, redirect, url_for, render_template

general_bp = Blueprint('general_bp', __name__)


@general_bp.route('/')

def index():
    # Check if the user is in session
    if 'user' not in session:
        return redirect(url_for('user_bp.login'))
    return render_template('index.html')

