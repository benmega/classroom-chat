from application import create_app
from application.models.user import User

app = create_app()
with app.app_context():
    users = User.query.filter((User.profile_picture == None) | (User.profile_picture == '')).all()
    print(f"Users with NO PFP: {[u.username for u in users]}")
