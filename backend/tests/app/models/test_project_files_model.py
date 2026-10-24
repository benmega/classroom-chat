"""
File: test_project_files_model.py
Type: py
Summary: ProjectFile rows: how a project lists and serialises them, its project_type,
         and the stored files that go with the rows when a project or user is deleted.
"""

import re
import uuid
from datetime import datetime
from pathlib import Path

import pytest
from application.config import Config
from application.extensions import db
from application.models.project import Project, read_project_type
from application.models.project_file import ProjectFile
from application.models.project_template import ProjectTemplate
from application.models.user import User
from sqlalchemy.orm import selectinload
from tests.factories import ProjectFactory, ProjectFileFactory, UserFactory


@pytest.fixture(autouse=True)
def upload_dir(test_app, tmp_path, monkeypatch):
    monkeypatch.setitem(test_app.config, "UPLOAD_FOLDER", str(tmp_path))
    monkeypatch.setattr(Config, "UPLOAD_FOLDER", str(tmp_path))
    return tmp_path


def _file_on_disk(project, path, kind="source", content=b"content"):
    """A file row with a real stored file behind it: (row id, stored file)."""
    ext = path.rsplit(".", 1)[-1]
    stored_path = f"project_files/{uuid.uuid4().hex}.{ext}"
    stored = Path(Config.UPLOAD_FOLDER, stored_path)
    stored.parent.mkdir(parents=True, exist_ok=True)
    stored.write_bytes(content)
    row = ProjectFileFactory(
        project_id=project.id, kind=kind, path=path, stored_path=stored_path, file_size=len(content)
    )
    return row.id, stored


# ---- Listing and serialising ------------------------------------------------------


def test_a_project_lists_models_then_sources_then_assets_each_by_path(init_db):
    project = ProjectFactory()
    for kind, path in [
        ("asset", "b.png"),
        ("source", "src/z.py"),
        ("model", "robot.stl"),
        ("asset", "a.mp3"),
        ("source", "README.md"),
        ("model", "arm.glb"),
    ]:
        ProjectFileFactory(project_id=project.id, kind=kind, path=path)
    db.session.expire_all()

    project = db.session.get(Project, project.id)

    assert [(f.kind, f.path) for f in project.files] == [
        ("model", "arm.glb"),
        ("model", "robot.stl"),
        ("source", "README.md"),
        ("source", "src/z.py"),
        ("asset", "a.mp3"),
        ("asset", "b.png"),
    ]
    assert [f["path"] for f in project.to_dict()["files"]] == [f.path for f in project.files]


def test_a_file_serialises_with_its_urls(init_db):
    project = ProjectFactory()
    row = ProjectFileFactory(
        project_id=project.id,
        kind="source",
        path="src/main.py",
        content_type="text/plain; charset=utf-8",
        file_size=1200,
        created_at=datetime(2026, 10, 14, 5, 0, 0),
    )

    assert row.to_dict() == {
        "id": row.id,
        "kind": "source",
        "name": "main.py",
        "path": "src/main.py",
        "size": 1200,
        "content_type": "text/plain; charset=utf-8",
        "url": f"/user/project_files/{row.id}/main.py",
        "download_url": f"/user/project_files/{row.id}/main.py?download=1",
        "created_at": "2026-10-14T05:00:00Z",
    }


def test_the_url_escapes_the_name(init_db):
    row = ProjectFileFactory(path="art/my sprite (2)@2x.png", kind="asset")

    assert row.name == "my sprite (2)@2x.png"
    assert row.url == f"/user/project_files/{row.id}/my%20sprite%20%282%29%402x.png"


def test_a_new_file_gets_the_current_utc_time(init_db):
    row = ProjectFileFactory()

    assert re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z", row.to_dict()["created_at"])


def test_a_project_without_files_lists_none(init_db):
    project = ProjectFactory()

    assert project.to_dict()["files"] == []
    assert Project(name="unsaved", user_id=project.user_id).to_dict()["files"] == []


def test_loading_projects_loads_their_files_in_one_more_statement(init_db, count_queries):
    for _ in range(2):
        user = UserFactory()
        for _ in range(3):
            project = ProjectFactory(user_id=user.id)
            ProjectFileFactory(project_id=project.id)
            ProjectFileFactory(project_id=project.id, kind="model", path="m.stl")
    db.session.remove()

    with count_queries() as statements:
        users = User.query.options(selectinload(User.projects)).all()
        files = [f.to_dict() for u in users for p in u.projects for f in p.files]

    assert len(files) == 12
    assert len(statements) == 3  # users, their projects, the projects' files

    db.session.remove()
    with count_queries() as statements:
        user = db.session.get(User, users[0].id)
        dicts = [p.to_dict() for p in user.projects]

    assert sum(len(d["files"]) for d in dicts) == 6
    # The user, the projects of the user, the files of all of them: not one per project
    assert len([s for s in statements if "FROM project_files" in s]) == 1


# ---- Project type -----------------------------------------------------------------


def test_project_type_defaults_to_code(init_db, sample_user):
    project = Project(name="p", user_id=sample_user.id)
    assert project.project_type == "code"
    db.session.add(project)
    db.session.commit()

    assert db.session.get(Project, project.id).to_dict()["project_type"] == "code"
    assert Project(name="q", user_id=sample_user.id, project_type="3d").project_type == "3d"


def test_template_project_type_defaults_to_code(init_db):
    template = ProjectTemplate(name="Plain template", description="d")
    db.session.add(template)
    db.session.commit()

    assert template.to_dict()["project_type"] == "code"


@pytest.mark.parametrize(
    "value, expected",
    [(None, "code"), ("", "code"), ("  ", "code"), ("3d", "3d"), (" 3D ", "3d"), ("code", "code"),
     ("2d", None), ("python", None), (3, None), (["3d"], None)],
)
def test_read_project_type(value, expected):
    assert read_project_type(value, "code") == expected


# ---- Stored files follow their rows -------------------------------------------


def test_deleting_a_project_removes_its_files_once_committed(init_db):
    project = ProjectFactory()
    first_id, first = _file_on_disk(project, "src/main.py")
    second_id, second = _file_on_disk(project, "robot.stl", kind="model")
    other_id, other = _file_on_disk(ProjectFactory(), "keep.py")

    db.session.delete(db.session.get(Project, project.id))
    db.session.flush()
    assert first.exists() and second.exists()
    db.session.commit()

    assert not first.exists() and not second.exists()
    assert db.session.get(ProjectFile, first_id) is None
    assert db.session.get(ProjectFile, second_id) is None
    assert other.exists()
    assert db.session.get(ProjectFile, other_id) is not None


def test_a_project_delete_that_is_rolled_back_keeps_the_files(init_db):
    project = ProjectFactory()
    file_id, stored = _file_on_disk(project, "src/main.py")

    db.session.delete(db.session.get(Project, project.id))
    db.session.flush()
    db.session.rollback()
    db.session.commit()

    assert stored.read_bytes() == b"content"
    assert db.session.get(ProjectFile, file_id) is not None


def test_deleting_a_user_removes_the_files_of_its_projects(init_db):
    student = UserFactory()
    project = ProjectFactory(user_id=student.id)
    file_id, stored = _file_on_disk(project, "main.py")
    bystander_file_id, bystander_file = _file_on_disk(ProjectFactory(), "main.py")

    db.session.delete(db.session.get(User, student.id))
    db.session.commit()

    assert not stored.exists()
    assert db.session.get(ProjectFile, file_id) is None
    assert bystander_file.exists()
    assert db.session.get(ProjectFile, bystander_file_id) is not None


def test_an_id_is_never_handed_out_twice(init_db):
    project = ProjectFactory()
    first = ProjectFileFactory(project_id=project.id, path="a.py")
    first_id = first.id
    db.session.delete(first)
    db.session.commit()

    second = ProjectFileFactory(project_id=project.id, path="a.py")

    assert second.id > first_id


def test_a_deleted_row_never_removes_a_file_outside_the_project_files_folder(init_db):
    # Only a hand-edited row (the admin CRUD panel) can point anywhere else
    submission = Path(Config.UPLOAD_FOLDER, "submissions", "homework.pdf")
    submission.parent.mkdir(parents=True, exist_ok=True)
    submission.write_bytes(b"homework")
    row = ProjectFileFactory(stored_path="project_files/../submissions/homework.pdf")

    db.session.delete(row)
    db.session.commit()

    assert submission.read_bytes() == b"homework"
