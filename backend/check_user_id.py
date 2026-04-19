
from application import create_app
from application.models.user import User

app = create_app()
with app.app_context():
    u = User.query.filter_by(username='blossomstudent01').first()
    if u:
        print(f"User blossomstudent01: ID={u.id}")
    else:
        print("User blossomstudent01 not found")
