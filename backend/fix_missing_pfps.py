import os
from application import create_app
from application.extensions import db
from application.models.user import User

app = create_app()
with app.app_context():
    upload_folder = os.path.join(app.config['UPLOAD_FOLDER'], "profile_pictures")
    users = User.query.all()
    fixed_count = 0
    for u in users:
        if u.profile_picture and u.profile_picture != "Default_pfp.jpg":
            file_path = os.path.join(upload_folder, u.profile_picture)
            if not os.path.exists(file_path):
                print(f"Fixing {u.username}: {u.profile_picture} -> Default_pfp.jpg")
                u.profile_picture = "Default_pfp.jpg"
                fixed_count += 1
    
    if fixed_count > 0:
        db.session.commit()
        print(f"Successfully fixed {fixed_count} users.")
    else:
        print("No users needed fixing.")
