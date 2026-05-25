
from application import create_app, DevelopmentConfig
from application.extensions import db
from application.models.user import User
from application.models.achievements import UserAchievement
from application.models.user_certificate import UserCertificate

app = create_app(DevelopmentConfig)
with app.app_context():
    admin = User.query.filter_by(username='ben').first()
    if admin:
        # Reset ducks to something sane
        admin.earned_ducks = 58
        admin.duck_balance = 58
        
        # Remove all user achievements for this user
        UserAchievement.query.filter_by(user_id=admin.id).delete()
        
        # Remove all certificates for this user (they were "system_seeded" anyway)
        UserCertificate.query.filter_by(user_id=admin.id).delete()
        
        db.session.commit()
        print(f"Stats and achievements reset for user: {admin.username}")
    else:
        print("Admin user 'ben' not found")
