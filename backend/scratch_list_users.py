from application.extensions import db
from application.models.user import User
from application import create_app

app = create_app()
with app.app_context():
    for u in User.query.all():
        print(f"Username: {u.username}, Balance: {u.duck_balance}")
