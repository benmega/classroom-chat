
from application import create_app, DevelopmentConfig
from application.models.achievements import Achievement
from application.models.user import User

app = create_app(DevelopmentConfig)
with app.app_context():
    print("--- Achievements ---")
    achs = Achievement.query.all()
    for a in achs:
        print(f"ID: {a.id}, Slug: {a.slug}, Title: {a.name}, Type: {a.type}, Req: {a.requirement_value}")
    
    print("\n--- Admin User Stats ---")
    admin = User.query.filter_by(username='ben').first()
    if admin:
        print(f"User: {admin.username}, Ducks: {admin.earned_ducks}, Balance: {admin.duck_balance}")
        earned = [ua.achievement_id for ua in admin.achievements]
        print(f"Earned IDs: {earned}")
    else:
        print("Admin user 'ben' not found")
