from flask import Blueprint, render_template

general_bp = Blueprint('general_bp', __name__)


@general_bp.route('/')
def index():
    # TODO set to reroute if user not in session
    return render_template('index.html')

# TODO move to user routes
@general_bp.route('/login')
def login():
    return render_template('login.html')

# TODO move to user routes
@general_bp.route('/signup')
def signup():
    return render_template('signup.html')

