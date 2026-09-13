import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from application import create_app
from application.extensions import db
from application.models.user import User

app = create_app()

with app.app_context():
    users_to_create = [
        {"username": "ben", "role": "admin", "password": "password"},
        {"username": "blossomstudent01", "role": "student", "password": "password"},
        {"username": "test_parent", "role": "parent", "password": "password"},
    ]
    for u in users_to_create:
        user = User.query.filter_by(username=u["username"]).first()
        if not user:
            new_user = User(username=u["username"], role=u["role"], is_approved=True)
            new_user.set_password(u["password"])
            db.session.add(new_user)
            print(f"Created user {u['username']}")
        else:
            print(f"User {u['username']} already exists")
    db.session.commit()
    print("Test users seeded.")
