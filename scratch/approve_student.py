from application.extensions import db
from application.models.user import User
from application import create_app

app = create_app()
with app.app_context():
    user = User.query.filter_by(username='student').first()
    if user:
        user.is_approved = True
        user.is_admin = False
        db.session.commit()
        print("User 'student' approved.")
    else:
        # Create user if not exists
        new_user = User(username='student', nickname='Student User', is_approved=True, is_admin=False)
        new_user.set_password('123')
        db.session.add(new_user)
        db.session.commit()
        print("User 'student' created and approved.")
