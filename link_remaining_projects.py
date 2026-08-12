import os
import sys

from flask import Flask

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

from application import create_app
from application.extensions import db
from application.models.project_template import ProjectTemplate

app = create_app()

with app.app_context():
    templates = ProjectTemplate.query.filter(ProjectTemplate.id >= 16).all()
    for t in templates:
        # Assuming images are stored as .jpg or .png, we'll just set it to the expected .jpg path
        # or we could check if file exists, but let's just set the URL as requested.
        # Check both .jpg and .png just in case.
        jpg_path = os.path.join(os.path.dirname(__file__), "frontend", "public", "images", "standard_projects", f"proj_{t.id}.jpg")
        png_path = os.path.join(os.path.dirname(__file__), "frontend", "public", "images", "standard_projects", f"proj_{t.id}.png")

        if os.path.exists(jpg_path):
            t.image_url = f"/images/standard_projects/proj_{t.id}.jpg"
            print(f"Updated Project {t.id} with jpg.")
        elif os.path.exists(png_path):
            t.image_url = f"/images/standard_projects/proj_{t.id}.png"
            print(f"Updated Project {t.id} with png.")
        else:
            # Fallback assuming they named it .jpg as suggested
            t.image_url = f"/images/standard_projects/proj_{t.id}.jpg"
            print(f"Updated Project {t.id} assuming jpg.")

    db.session.commit()
    print("Database updated for remaining projects.")
