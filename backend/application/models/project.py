"""
File: project.py
Type: py
Summary: SQLAlchemy model for user projects and portfolio items.
"""

from application.extensions import db


class Project(db.Model):
    __tablename__ = "projects"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)  # The "Project Description"
    link = db.Column(db.String(255), nullable=True)  # The "Game Link"
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    teacher_comment = db.Column(db.Text, nullable=True)
    code_snippet = db.Column(
        db.Text, nullable=True
    )  # For younger students (direct code)
    github_link = db.Column(db.String(255), nullable=True)  # For older students
    video_url = db.Column(
        db.String(255), nullable=True
    )  # Link to recording (e.g., YouTube/Vimeo/Cloud)
    video_transcript = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(255), nullable=True)  # Thumbnail for the card

    def __repr__(self):
        return f"<Project {self.name}>"
