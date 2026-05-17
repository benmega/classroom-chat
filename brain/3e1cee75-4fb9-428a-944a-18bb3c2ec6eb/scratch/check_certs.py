
from application import create_app, DevelopmentConfig
from application.models.user_certificate import UserCertificate
from application.models.user import User

app = create_app(DevelopmentConfig)
with app.app_context():
    admin = User.query.filter_by(username='ben').first()
    if admin:
        certs = UserCertificate.query.filter_by(user_id=admin.id).all()
        print(f"Admin has {len(certs)} certificates.")
        for c in certs:
            print(f"Cert ID: {c.id}, Achievement ID: {c.achievement_id}, URL: {c.url}")
    else:
        print("Admin user 'ben' not found")
