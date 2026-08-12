import os
import re
import shutil
import sys

from flask import Flask

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

from application import create_app
from application.extensions import db
from application.models.project_template import ProjectTemplate

app = create_app()

BRAIN_DIR = r"C:\Users\Ben\.gemini\antigravity\brain\4c95dcc2-1a6e-4216-aaaf-a706c7954a7d"
DEST_DIR = os.path.join(os.path.dirname(__file__), "frontend", "public", "images", "standard_projects")

if not os.path.exists(DEST_DIR):
    os.makedirs(DEST_DIR)

# Find all generated images
image_files = [f for f in os.listdir(BRAIN_DIR) if f.startswith("proj_") and f.endswith(".jpg")]
id_to_file = {}
for f in image_files:
    match = re.match(r"proj_(\d+)_", f)
    if match:
        proj_id = int(match.group(1))
        id_to_file[proj_id] = os.path.join(BRAIN_DIR, f)

with app.app_context():
    templates = ProjectTemplate.query.all()
    for t in templates:
        if t.id in id_to_file:
            src_path = id_to_file[t.id]
            dest_filename = f"proj_{t.id}.jpg"
            dest_path = os.path.join(DEST_DIR, dest_filename)
            shutil.copy2(src_path, dest_path)
            t.image_url = f"/images/standard_projects/{dest_filename}"
            print(f"Updated Project {t.id} with generated image.")
        else:
            # Placeholder
            t.image_url = "/images/tutorial_coding.png"
            print(f"Updated Project {t.id} with placeholder.")

    db.session.commit()
    print("Database updated successfully.")
