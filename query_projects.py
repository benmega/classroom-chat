import os
import sys
import json
from flask import Flask

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

from application import create_app
from application.models.project_template import ProjectTemplate

app = create_app()

with app.app_context():
    templates = ProjectTemplate.query.all()
    out = []
    for t in templates:
        out.append({
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "image_url": t.image_url
        })
    with open('projects_out.json', 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2)
