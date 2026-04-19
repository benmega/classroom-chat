import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from application import create_app
from application.extensions import db
from application.models.user import User
from application.services.achievement_engine import evaluate_user

app = create_app()
with app.app_context():
    user = User.query.filter_by(username='newadmin').first()
    if not user:
        print("Creating newadmin user...")
        user = User(username='newadmin', nickname='New Admin')
        user.set_password('password')
        db.session.add(user)
        db.session.commit()
    
    print(f"Evaluating user: {user.username} (ID: {user.id})")
    print(f"Current achievements: {[ua.achievement_id for ua in user.achievements]}")
    
    new_awards = evaluate_user(user)
    print(f"New awards: {[a.name for a in new_awards]}")
    
    # Check Mastery calculation (from frontend logic)
    from application.models.achievements import Achievement
    total_possible = Achievement.query.count()
    earned_count = len(user.achievements)
    percent = round((earned_count / total_possible) * 100) if total_possible > 0 else 0
    print(f"Mastery Level: {percent}% ({earned_count}/{total_possible})")
