from application import create_app
from application.models.user import User

app = create_app()
with app.app_context():
    u = User.query.get(128)
    print(f"User 128: {u}")
    if u:
        print(f"Username: {u.username}, Approved: {u.is_approved}")
    
    pending = User.query.filter_by(is_approved=False, is_admin=False).all()
    print(f"Pending users IDs: {[u.id for u in pending]}")
