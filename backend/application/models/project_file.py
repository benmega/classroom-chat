"""
File: project_file.py
Type: py
Summary: SQLAlchemy model for the files of a project: 3D models, source files and assets.
"""

from urllib.parse import quote

from ..extensions import db
from ..utilities.helper_functions import to_utc_iso, utcnow_naive
from ..utilities.stored_files import remove_files_of_deleted_rows

# The kinds of project file, in the order a project lists them
FILE_KINDS = ("model", "source", "asset")


class ProjectFile(db.Model):
    __tablename__ = "project_files"
    __table_args__ = (
        # One file per path in a project: uploading the same path again replaces the file
        db.UniqueConstraint("project_id", "path", name="uq_project_files_project_id_path"),
        # An id is never handed out twice (SQLite would reuse the highest one once its
        # row is deleted): the URL of a file is cached as if its content never changed.
        {"sqlite_autoincrement": True},
    )

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(
        db.Integer,
        db.ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    kind = db.Column(db.String(20), nullable=False)  # one of FILE_KINDS
    # Where the file sits in the project, e.g. "src/main.py": forward slashes, no "."
    # or ".." segments (see utilities/project_files.clean_relative_path)
    path = db.Column(db.String(255), nullable=False)
    # Relative path under Config.UPLOAD_FOLDER: "project_files/<uuid hex>.<ext>"
    stored_path = db.Column(db.String(255), nullable=False)
    content_type = db.Column(db.String(100), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)  # bytes
    created_at = db.Column(db.DateTime, default=utcnow_naive)

    project = db.relationship("Project", back_populates="files")

    def __repr__(self):
        return f"<ProjectFile {self.kind} {self.path}>"

    @property
    def name(self):
        """The file name without its folders: "main.py" for "src/main.py"."""
        return self.path.rsplit("/", 1)[-1]

    @property
    def url(self):
        """Where the file is served (user_routes.project_file). The name is part of the
        URL so the browser labels and saves the file under it."""
        return f"/user/project_files/{self.id}/{quote(self.name)}"

    def to_dict(self):
        return {
            "id": self.id,
            "kind": self.kind,
            "name": self.name,
            "path": self.path,
            "size": self.file_size,
            "content_type": self.content_type,
            "url": self.url,
            "download_url": f"{self.url}?download=1",
            "created_at": to_utc_iso(self.created_at),
        }


# How a project lists its files: models first, then source files, then assets, each
# kind by path (Project.files)
FILE_LISTING_ORDER = (
    db.case(
        {kind: rank for rank, kind in enumerate(FILE_KINDS)},
        value=ProjectFile.kind,
        else_=len(FILE_KINDS),
    ),
    ProjectFile.path,
)

# A deleted file row takes its stored file with it once the delete is committed,
# however it goes: removed or replaced on its own, or with its project or user.
remove_files_of_deleted_rows(ProjectFile)
