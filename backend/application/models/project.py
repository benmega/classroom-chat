"""
File: project.py
Type: py
Summary: SQLAlchemy model for user projects and portfolio items.
"""

from ..extensions import db
from ..utilities.helper_functions import to_utc_iso
from .project_file import FILE_LISTING_ORDER

# What a project is: "3d" for a 3D model (Tinkercad, Blender), whose model file is the
# work worth showing, and "code" for everything else.
PROJECT_TYPES = ("code", "3d")
DEFAULT_PROJECT_TYPE = "code"
INVALID_PROJECT_TYPE_MESSAGE = "Invalid project type. Use 'code' or '3d'."


def read_project_type(value, default):
    """The project type a client sent: ``default`` when it sent none (missing or
    blank), None when the value is not a project type."""
    if value is None or not str(value).strip():
        return default
    value = str(value).strip().lower()
    return value if value in PROJECT_TYPES else None


class Project(db.Model):
    __tablename__ = "projects"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)  # The "Project Description"
    link = db.Column(db.String(255), nullable=True)  # The "Game Link"
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    teacher_comment = db.Column(db.Text, nullable=True)
    packets_awarded = db.Column(db.Double, default=0.0, nullable=False)
    code_snippet = db.Column(
        db.Text, nullable=True
    )  # For younger students (direct code)
    github_link = db.Column(db.String(255), nullable=True)  # For older students
    video_url = db.Column(
        db.String(255), nullable=True
    )  # Link to recording (e.g., YouTube/Vimeo/Cloud)
    video_transcript = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default="pending", nullable=False)
    image_url = db.Column(db.String(255), nullable=True)  # Thumbnail for the card
    created_at = db.Column(db.DateTime, default=db.func.now())
    # The ProjectTemplate this project was built from (nullable: custom projects
    # have none). Survives the student renaming the project, so approval can
    # still complete the template's linked challenge.
    template_id = db.Column(
        db.Integer,
        db.ForeignKey("project_templates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    project_type = db.Column(
        db.String(20),
        nullable=False,
        default=DEFAULT_PROJECT_TYPE,
        server_default=DEFAULT_PROJECT_TYPE,
    )

    # Loaded together with the projects (selectin): to_dict() lists them, so every
    # path that serialises projects, one or a page of them, costs one more query
    # rather than one per project.
    files = db.relationship(
        "ProjectFile",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by=list(FILE_LISTING_ORDER),
    )

    def __init__(self, **kwargs):
        if "status" not in kwargs:
            if kwargs.get("teacher_comment"):
                kwargs["status"] = "approved"
            else:
                kwargs["status"] = "pending"
        # Set now, not at the INSERT, so a project reads its type before it is saved
        kwargs.setdefault("project_type", DEFAULT_PROJECT_TYPE)
        super().__init__(**kwargs)

    def __repr__(self):
        return f"<Project {self.name}>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "link": self.link,
            "user_id": self.user_id,
            "teacher_comment": self.teacher_comment,
            "packets_awarded": self.packets_awarded,
            "code_snippet": self.code_snippet,
            "github_link": self.github_link,
            "video_url": self.video_url,
            "video_transcript": self.video_transcript,
            "image_url": self.image_url,
            "status": self.status,
            "template_id": self.template_id,
            "project_type": self.project_type,
            "files": [project_file.to_dict() for project_file in self.files],
            "user_nickname": self.user.nickname if self.user else "Unknown Student",
            "user_slug": self.user.slug if self.user else None,
            "user_username": self.user.username if self.user else None,
            "created_at": to_utc_iso(self.created_at),
        }
