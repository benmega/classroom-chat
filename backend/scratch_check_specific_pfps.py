from application import create_app
from application.models.user import User

app = create_app()
with app.app_context():
    for name in ['ben', 'blossomstudent01']:
        u = User.query.filter_by(username=name).first()
        if u:
            print(f"User: {u.username}, PFP: {u.profile_picture}")
        else:
            print(f"User: {name} NOT FOUND")
