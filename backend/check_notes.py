import sys
import os

# Add backend to path
sys.path.append(os.path.abspath(os.path.join("backend")))

from application import create_app
from application.extensions import db
from application.models.note import Note

app = create_app()

with app.app_context():
    notes = Note.query.all()
    print(f"Found {len(notes)} notes:")
    for note in notes:
        print(f"ID: {note.id}, UserID: {note.user_id}, Filename: {note.filename}, URL: {note.url}")
