import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from application import create_app
from application.extensions import db
from application.models.achievements import Achievement, UserAchievement
from application.models.user import User

app = create_app()
with app.app_context():
    print("--- ACHIEVEMENTS ---")
    achievements = Achievement.query.all()
    for item in achievements:
        print(f"ID: {item.id}, Name: {item.name}, Slug: {item.slug}, Type: {item.type}, Req: {item.requirement_value}")
    
    print("\n--- ADMIN USER ACHIEVEMENTS ---")
    admin = User.query.filter_by(is_admin=True).first()
    if admin:
        print(f"User: {admin.username}, ID: {admin.id}")
        user_achs = UserAchievement.query.filter_by(user_id=admin.id).all()
        for ua in user_achs:
            ach = Achievement.query.get(ua.achievement_id)
            print(f"Earned: {ach.name}")
    else:
        print("Admin user not found.")
