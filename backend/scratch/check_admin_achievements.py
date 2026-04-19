from application import create_app
from application.models.user import User
from application.models.achievements import UserAchievement, Achievement

app = create_app()
with app.app_context():
    u = User.query.filter_by(_username='ben').first()
    if u:
        print(f"User {u.username} (ID: {u.id}, Nickname: {u.nickname}) has {len(u.achievements)} achievements:")
        for ua in u.achievements:
            a = ua.achievement
            print(f"- {a.name} (ID: {a.id}, Slug: {a.slug}) earned at {ua.earned_at}")
    else:
        print("Admin user not found")
