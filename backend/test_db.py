from application import create_app
from application.extensions import db
from application.models.user import User

app = create_app()
with app.app_context():
    first_user = User.query.first()
    if first_user:
        id_int = first_user.id
        id_str = str(first_user.id)
        print("First user ID:", id_int)
        print("Get with int:", db.session.get(User, id_int))
        print("Get with str:", db.session.get(User, id_str))
    else:
        print("No users found.")
