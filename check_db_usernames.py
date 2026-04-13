from application.extensions import db
from application.models.user import User
from flask import Flask
from application.config import Config

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

with app.app_context():
    users = User.query.all()
    for user in users:
        print(f"User: {user._username}, Length: {len(user._username)}")
