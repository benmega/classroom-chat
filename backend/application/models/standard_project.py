"""
File: standard_project.py
Summary: SQLAlchemy model for Standard Projects (templates) that admins can assign.
"""

from ..extensions import db

class StandardProject(db.Model):
    __tablename__ = "standard_projects"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    link = db.Column(db.String(255), nullable=True)
    github_link = db.Column(db.String(255), nullable=True)
    video_url = db.Column(db.String(255), nullable=True)
    code_snippet = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(255), nullable=True)

    def __repr__(self):
        return f"<StandardProject {self.name}>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "link": self.link,
            "github_link": self.github_link,
            "video_url": self.video_url,
            "code_snippet": self.code_snippet,
            "image_url": self.image_url,
        }
