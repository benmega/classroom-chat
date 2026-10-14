"""
File: test_stored_files.py
Type: py
Summary: Stored files follow the transaction of their row: a deleted row's file goes once
         the delete commits, a new row's file goes again unless the insert commits.

The submission and project file tests cover the same rules through their models; these
test the helpers themselves, including savepoints and a session closed mid-transaction.
"""

import os
import uuid
from pathlib import Path

import pytest
from application.config import Config
from application.extensions import db
from application.utilities.stored_files import (
    remove_after_commit,
    remove_stored_file,
    remove_unless_committed,
    stored_file_path,
)


@pytest.fixture(autouse=True)
def upload_dir(test_app, tmp_path, monkeypatch):
    monkeypatch.setitem(test_app.config, "UPLOAD_FOLDER", str(tmp_path))
    monkeypatch.setattr(Config, "UPLOAD_FOLDER", str(tmp_path))
    return tmp_path


def _file(upload_dir, folder="project_files"):
    """A stored file: (path relative to the upload folder, absolute path)."""
    stored_path = f"{folder}/{uuid.uuid4().hex}.txt"
    path = upload_dir / stored_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"content")
    return stored_path, path


def _in_a_transaction():
    """Do some database work, as a request does before it stores a file."""
    db.session.execute(db.text("SELECT 1"))


# ---- Paths --------------------------------------------------------------------


def test_stored_file_path_resolves_inside_the_upload_folder(upload_dir):
    assert stored_file_path("project_files/a.txt") == os.path.join(str(upload_dir), "project_files", "a.txt")
    assert stored_file_path("project_files/a.txt", subfolder="project_files") is not None


@pytest.mark.parametrize(
    "stored_path, subfolder",
    [
        ("", None),
        (None, None),
        ("../outside.txt", None),
        ("project_files/../../outside.txt", None),
        ("submissions/a.pdf", "project_files"),
        ("project_files/../submissions/a.pdf", "project_files"),
        ("project_files", "project_files"),
        ("project_files/a\0.txt", None),
    ],
)
def test_stored_file_path_refuses_paths_that_leave_their_folder(stored_path, subfolder):
    assert stored_file_path(stored_path, subfolder=subfolder) is None


def test_stored_file_path_refuses_an_absolute_path(tmp_path_factory):
    outside = tmp_path_factory.mktemp("outside") / "a.txt"

    assert stored_file_path(str(outside)) is None


def test_remove_stored_file_is_best_effort(upload_dir, tmp_path_factory):
    stored_path, path = _file(upload_dir)
    outside = tmp_path_factory.mktemp("outside") / "keep.txt"
    outside.write_bytes(b"not an upload")

    remove_stored_file(stored_path)
    remove_stored_file(stored_path)  # already gone: nothing happens
    remove_stored_file(os.path.relpath(outside, upload_dir))

    assert not path.exists()
    assert outside.exists()


# ---- Files of deleted rows: removed once the delete commits ---------------------


def test_remove_after_commit_waits_for_the_commit(upload_dir):
    stored_path, path = _file(upload_dir)
    _in_a_transaction()

    remove_after_commit(db.session, stored_path)
    assert path.exists()
    db.session.commit()

    assert not path.exists()


@pytest.mark.parametrize("end", ["rollback", "close"])
def test_remove_after_commit_keeps_the_file_when_nothing_is_committed(upload_dir, end):
    stored_path, path = _file(upload_dir)
    _in_a_transaction()

    remove_after_commit(db.session, stored_path)
    getattr(db.session, end)()
    # The next transaction does not inherit the file either
    _in_a_transaction()
    db.session.commit()

    assert path.exists()


# ---- Files of new rows: removed again unless the insert commits ------------------


def test_remove_unless_committed_keeps_the_file_once_committed(upload_dir):
    stored_path, path = _file(upload_dir)
    _in_a_transaction()

    remove_unless_committed(db.session, stored_path)
    db.session.commit()
    db.session.rollback()

    assert path.exists()


@pytest.mark.parametrize("end", ["rollback", "close"])
def test_remove_unless_committed_removes_the_file_when_nothing_is_committed(upload_dir, end):
    stored_path, path = _file(upload_dir)
    _in_a_transaction()

    remove_unless_committed(db.session, stored_path)
    assert path.exists()
    getattr(db.session, end)()

    assert not path.exists()


def test_remove_unless_committed_needs_no_database_work_first(upload_dir):
    stored_path, path = _file(upload_dir)
    db.session.commit()  # no transaction is open now

    remove_unless_committed(db.session, stored_path)
    db.session.rollback()

    assert not path.exists()


def test_a_released_savepoint_leaves_the_decision_to_the_outer_transaction(upload_dir):
    stored_path, path = _file(upload_dir)
    _in_a_transaction()

    with db.session.begin_nested():
        remove_unless_committed(db.session, stored_path)
    assert path.exists()
    db.session.rollback()

    assert not path.exists()


def test_a_savepoint_rolled_back_leaves_the_decision_to_the_outer_transaction(upload_dir):
    # Which files the savepoint wrote is not known: a file left behind is better than
    # a row that lost its file, so the outer commit keeps it
    stored_path, path = _file(upload_dir)
    _in_a_transaction()

    savepoint = db.session.begin_nested()
    remove_unless_committed(db.session, stored_path)
    savepoint.rollback()
    assert path.exists()
    db.session.commit()

    assert path.exists()


def test_both_kinds_of_file_in_one_transaction(upload_dir):
    old_path, old_file = _file(upload_dir)
    new_path, new_file = _file(upload_dir)
    _in_a_transaction()
    remove_after_commit(db.session, old_path)
    remove_unless_committed(db.session, new_path)

    db.session.rollback()
    assert old_file.exists()
    assert not new_file.exists()

    newer_path, newer_file = _file(upload_dir)
    _in_a_transaction()
    remove_after_commit(db.session, old_path)
    remove_unless_committed(db.session, newer_path)

    db.session.commit()
    assert not old_file.exists()
    assert newer_file.exists()
