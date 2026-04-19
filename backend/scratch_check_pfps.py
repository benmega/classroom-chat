from application import create_app
from application.models.user import User

app = create_app()
with app.app_context():
    users = User.query.all()
    for u in users:
        print(f"User: {u.username}, PFP: {u.profile_picture}")
