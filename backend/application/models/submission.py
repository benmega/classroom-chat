from ..extensions import db
from ..utilities.helper_functions import to_utc_iso
from ..utilities.stored_files import remove_files_of_deleted_rows


class Submission(db.Model):
    __tablename__ = "submissions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    classroom_id = db.Column(
        db.String(64), db.ForeignKey("classrooms.id"), nullable=True, index=True
    )
    original_filename = db.Column(db.String(255), nullable=False)
    # Relative path under Config.UPLOAD_FOLDER, e.g. "submissions/<uuid>.pdf"
    stored_path = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    note = db.Column(db.String(500), nullable=True)
    teacher_note = db.Column(db.String(500), nullable=True)
    status = db.Column(
        db.String(20), default="pending", index=True
    )  # pending, reviewed
    timestamp = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), index=True
    )

    def __init__(self, **kwargs):
        """Explicit constructor to handle keyword arguments correctly."""
        for key, value in kwargs.items():
            setattr(self, key, value)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "classroom_id": self.classroom_id,
            "original_filename": self.original_filename,
            "file_size": self.file_size,
            "note": self.note,
            "teacher_note": self.teacher_note,
            "status": self.status,
            "timestamp": to_utc_iso(self.timestamp),
        }


# A deleted submission takes its uploaded file with it, however the row goes: on
# its own, or with the user it belongs to. The file is removed only once the
# delete is committed, so a transaction that is rolled back keeps the row and
# the file.
remove_files_of_deleted_rows(Submission)
