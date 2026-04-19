
from application import create_app, DevelopmentConfig
from application.extensions import db
from application.models.user import User
from application.services.achievement_engine import evaluate_user
import uuid

app = create_app(DevelopmentConfig)
with app.app_context():
    username = f"test_user_{uuid.uuid4().hex[:8]}"
    user = User(username=username, nickname="Test User")
    user.set_password("password")
    db.session.add(user)
    db.session.commit()
    
    print(f"Created user: {username}")
    
    # Evaluate achievements
    new_awards = evaluate_user(user)
    print(f"New awards for fresh user: {len(new_awards)}")
    for a in new_awards:
        print(f"  Awarded: {a.name}")
    
    # Check total earned
    earned_count = len(user.achievements)
    print(f"Total achievements earned: {earned_count}")
