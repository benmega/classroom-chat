
from application import create_app
from application.models.user import User

app = create_app()
with app.app_context():
    u = User.query.get(30)
    if u:
        print(f"User 30: {u.username}, Nickname: {u.nickname}")
    else:
        print("User 30 not found")
