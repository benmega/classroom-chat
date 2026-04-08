import sys
import traceback
sys.path.append('backend')
from application.extensions import db
from application import create_app
from application.models.user import User

try:
    app = create_app()
    with app.app_context():
        u = User(username='test_signup_789', is_approved=False)
        u.set_password('pass123')
        db.session.add(u)
        db.session.commit()
        print('success')
except Exception as e:
    with open('error.txt', 'w') as f:
        traceback.print_exc(file=f)
    print('Failed, check error.txt')
