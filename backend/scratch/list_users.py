from application import create_app
from application.models.user import User

app = create_app()
with app.app_context():
    users = User.query.all()
    for u in users:
        print(f"ID: {u.id}, Username: {u.username}, Nickname: {u.nickname}, Admin: {u.is_admin}, Achievements: {len(u.achievements)}")
