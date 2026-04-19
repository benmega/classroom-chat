import requests

# Assuming the server is running on localhost:5000
# and needs admin session...
# This might be tricky without a real session.

# Instead, let's just check the data in the database.
from application import create_app
from application.models.user import User

app = create_app()
with app.app_context():
    # Find blossomstudent01
    user = User.query.filter_by(_username='blossomstudent01').first()
    if user:
        print(f"Username in DB: '{user._username}'")
        print(f"Username via property: '{user.username}'")
        print(f"Username in to_dict: '{user.to_dict()['username']}'")
    else:
        print("User blossomstudent01 not found.")
