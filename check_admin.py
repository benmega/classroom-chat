
from application import db
from application.models.user import User
from flask import Flask
import os

app = Flask(__name__)
BASE_DIR = os.getcwd()
INSTANCE_FOLDER = os.path.join(BASE_DIR, "backend", "instance")
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(INSTANCE_FOLDER, "dev_users.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    user = User.query.filter_by(_username='ben').first()
    if user:
        print(f"User: {user.username}")
        print(f"Is Admin: {user.is_admin}")
        if not user.is_admin:
            print("Updating user to be admin...")
            user.is_admin = True
            db.session.commit()
            print("User updated successfully.")
    else:
        print("User 'ben' not found.")
        # Let's list all users to see what we have
        all_users = User.query.all()
        print("Available users:", [u.username for u in all_users])
