from application import create_app
from application.models.user import User

app = create_app()
with app.app_context():
    user = User.query.filter_by(username='blossomstudent01').first()
    if user:
        print(f"Username: {user.username}")
        print(f"To Dict: {user.to_dict()['username']}")
    else:
        print("User not found")
