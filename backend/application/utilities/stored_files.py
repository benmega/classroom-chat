"""
File: stored_files.py
Type: py
Summary: Uploaded files that belong to database rows follow the transaction of their row.

A file whose row is deleted is removed once the delete is committed; a rollback keeps
the row and the file. A file written for a row that is never committed is removed
again. Paths are relative to Config.UPLOAD_FOLDER (e.g. "submissions/<uuid>.pdf").
"""

import logging
import os

from application.config import Config
from application.extensions import db
from sqlalchemy import event
from sqlalchemy.orm import object_session, scoped_session

logger = logging.getLogger(__name__)

# Session.info keys, each a list of stored paths the open transaction has a stake in.
# Files of rows deleted in the transaction: removed once it commits.
_REMOVE_AFTER_COMMIT = "stored_files_remove_after_commit"
# Files written for rows added in the transaction: removed again unless it commits.
_REMOVE_UNLESS_COMMITTED = "stored_files_remove_unless_committed"


def stored_file_path(stored_path, subfolder=None):
    """The absolute path of a stored file, or None when ``stored_path`` does not lead
    into the upload folder (or into its ``subfolder``, when one is given)."""
    # A null byte makes every file call raise rather than fail
    if not stored_path or "\0" in stored_path:
        return None
    base_path = os.path.abspath(os.path.join(Config.UPLOAD_FOLDER, subfolder or ""))
    file_path = os.path.abspath(os.path.join(Config.UPLOAD_FOLDER, stored_path))
    if not file_path.startswith(base_path + os.sep):
        return None
    return file_path


def remove_stored_file(stored_path, subfolder=None):
    """Remove a stored file now. Best effort: a path that does not lead into the upload
    folder (or into ``subfolder``) is not touched, and a file that is already gone or
    cannot be removed is left."""
    file_path = stored_file_path(stored_path, subfolder)
    if file_path is None:
        return
    try:
        os.remove(file_path)
    except FileNotFoundError:
        pass
    except OSError:
        logger.warning("Could not remove the stored file %s", stored_path)


def _the_session(session):
    """The Session itself, also when given a scoped_session such as db.session."""
    return session() if isinstance(session, scoped_session) else session


def remove_after_commit(session, stored_path, subfolder=None):
    """Remove the file once the open transaction of ``session`` commits. A rollback,
    or a session closed without a commit, keeps it: its row is then kept too."""
    _the_session(session).info.setdefault(_REMOVE_AFTER_COMMIT, []).append((stored_path, subfolder))


def remove_unless_committed(session, stored_path):
    """A file just written for a row added in the open transaction of ``session``: it
    stays once the transaction commits, and is removed again when the transaction is
    rolled back or the session is closed without a commit."""
    session = _the_session(session)
    if not session.in_transaction():
        # A rollback with no transaction begun ends nothing, so the file would wait
        # for whichever transaction ends next
        session.begin()
    session.info.setdefault(_REMOVE_UNLESS_COMMITTED, []).append(stored_path)


def remove_files_of_deleted_rows(model, attribute="stored_path", subfolder=None):
    """A deleted ``model`` row takes its stored file (``row.<attribute>``) with it, once
    the delete is committed, however the row goes: on its own or through a cascade.
    With ``subfolder``, a stored path that leads anywhere else is left alone.

    Only deletes made through the ORM are seen (session.delete and relationship
    cascades), not a bulk query.delete().
    """

    @event.listens_for(model, "after_delete")
    def _remember_file_of_deleted_row(mapper, connection, row):
        session = object_session(row)
        if session is not None:
            remove_after_commit(session, getattr(row, attribute), subfolder)


# One set of session listeners serves every model whose rows own files.


@event.listens_for(db.session, "after_commit")
def _settle_files_after_commit(session):
    if session.in_nested_transaction():
        return  # a savepoint was released: the outer transaction can still roll back
    # The rows the new files were written for are saved: the files stay
    session.info.pop(_REMOVE_UNLESS_COMMITTED, None)
    for stored_path, subfolder in session.info.pop(_REMOVE_AFTER_COMMIT, ()):
        remove_stored_file(stored_path, subfolder)


@event.listens_for(db.session, "after_rollback")
def _keep_files_after_rollback(session):
    # Also after the rollback of a savepoint: which deletes it undid is not known
    # here, and a file left behind is better than a row that lost its file.
    session.info.pop(_REMOVE_AFTER_COMMIT, None)


@event.listens_for(db.session, "after_transaction_end")
def _settle_files_of_uncommitted_transaction(session, transaction):
    if transaction.parent is not None:
        return  # a savepoint ended: the outer transaction decides
    # The transaction ended without a commit (a commit has emptied both lists): nothing
    # was deleted, and the rows the new files were written for were never saved.
    session.info.pop(_REMOVE_AFTER_COMMIT, None)
    for stored_path in session.info.pop(_REMOVE_UNLESS_COMMITTED, ()):
        remove_stored_file(stored_path)
