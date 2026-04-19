import os
from application import create_app
from application.models.user import User

app = create_app()
with app.app_context():
    upload_folder = os.path.join(app.config['UPLOAD_FOLDER'], "profile_pictures")
    users = User.query.all()
    missing = []
    for u in users:
        if u.profile_picture and u.profile_picture != "Default_pfp.jpg":
            file_path = os.path.join(upload_folder, u.profile_picture)
            if not os.path.exists(file_path):
                missing.append((u.username, u.profile_picture))
    
    print(f"Users with missing PFP files: {missing}")
