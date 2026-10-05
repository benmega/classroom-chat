import logging
import os

from sqlalchemy import event
from sqlalchemy.orm import object_session

from ..config import Config
from ..extensions import db

logger = logging.getLogger(__name__)

# Session.info key: stored paths of the submissions deleted in the open transaction
_FILES_TO_REMOVE = "submission_files_to_remove"


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
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


def remove_stored_file(stored_path):
    """Remove the uploaded file of a submission. Best effort: a path that does not
    lead into the upload folder is not touched, and a file that is already gone
    or cannot be removed is left."""
    if not stored_path:
        return
    base_path = os.path.abspath(Config.UPLOAD_FOLDER)
    file_path = os.path.abspath(os.path.join(base_path, stored_path))
    if not file_path.startswith(base_path + os.sep):
        return
    try:
        os.remove(file_path)
    except FileNotFoundError:
        pass
    except OSError:
        logger.warning(
            "Could not remove the file of a deleted submission: %s", stored_path
        )


# A deleted submission takes its uploaded file with it, however the row goes: on
# its own, or with the user it belongs to. The file is removed only once the
# delete is committed, so a transaction that is rolled back keeps the row and
# the file.


@event.listens_for(Submission, "after_delete")
def _remember_file_of_deleted_submission(mapper, connection, submission):
    session = object_session(submission)
    if session is not None:
        session.info.setdefault(_FILES_TO_REMOVE, []).append(submission.stored_path)


@event.listens_for(db.session, "after_commit")
def _remove_files_of_deleted_submissions(session):
    if session.in_nested_transaction():
        return  # a savepoint was released: the outer transaction can still roll back
    for stored_path in session.info.pop(_FILES_TO_REMOVE, ()):
        remove_stored_file(stored_path)


@event.listens_for(db.session, "after_rollback")
def _keep_files_after_rollback(session):
    # Also after the rollback of a savepoint: which deletes it undid is not known
    # here, and a file left behind is better than a row that lost its file.
    session.info.pop(_FILES_TO_REMOVE, None)


@event.listens_for(db.session, "after_transaction_end")
def _keep_files_of_abandoned_transaction(session, transaction):
    # The session was closed without a commit: nothing was deleted
    if transaction.parent is None:
        session.info.pop(_FILES_TO_REMOVE, None)
