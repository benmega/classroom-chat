from application import create_app
from application.models.user import User
from application.models.achievements import UserAchievement, Achievement
from application.services.achievement_engine import check_achievement
from application.extensions import db

app = create_app()
with app.app_context():
    users = User.query.all()
    achievements = {a.id: a for a in Achievement.query.all()}
    
    total_deleted = 0
    for u in users:
        earned = UserAchievement.query.filter_by(user_id=u.id).all()
        for ua in earned:
            ach = achievements.get(ua.achievement_id)
            if not ach: continue
            
            if not check_achievement(u, ach):
                print(f"Deleting inconsistent achievement: {u.username} - {ach.slug} (Earned at {ua.earned_at})")
                db.session.delete(ua)
                total_deleted += 1
                
    if total_deleted > 0:
        db.session.commit()
        print(f"Cleaned up {total_deleted} inconsistent achievement records.")
    else:
        print("No inconsistent records found.")
