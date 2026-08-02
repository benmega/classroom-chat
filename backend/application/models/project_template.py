"""
File: project_template.py
Type: py
Summary: SQLAlchemy model for default project templates.
"""

from ..extensions import db


class ProjectTemplate(db.Model):
    __tablename__ = "project_templates"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=False)
    # Chapter name/alias that maps this template to an ALIGNED_NODE in the progress tree.
    # Nullable — templates without a chapter are hidden from the tree view.
    chapter = db.Column(db.String(100), nullable=True)
    link = db.Column(db.String(255), nullable=True)
    github_link = db.Column(db.String(255), nullable=True)
    video_url = db.Column(db.String(255), nullable=True)
    code_snippet = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(255), nullable=True)

    def __repr__(self):
        return f"<ProjectTemplate {self.name}>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "chapter": self.chapter,
            "link": self.link,
            "github_link": self.github_link,
            "video_url": self.video_url,
            "code_snippet": self.code_snippet,
            "image_url": self.image_url,
        }
