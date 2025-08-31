from flask import Blueprint
from flask import session, redirect, url_for, render_template

general = Blueprint('general', __name__)


@general.route('/')

def index():
    # Check if the user is in session
    if 'user' not in session:
        return redirect(url_for('user.login'))
    return render_template('index.html')

