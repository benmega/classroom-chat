"""
File: test_project_file_routes.py
Type: py
Summary: Project files through the routes: uploading them with the project form (new and
         edit), removing and replacing them, the caps and checks, project_type, the
         public serve route, and project_type on the admin assign and template endpoints.
"""

from io import BytesIO
from pathlib import Path

import pytest
from application.commands.seed import seed_three_d_track
from application.config import Config
from application.extensions import db
from application.models.project import Project
from application.models.project_file import ProjectFile
from application.models.project_template import ProjectTemplate
from tests.factories import AdminFactory, ProjectFactory, UserFactory
from tests.image_helpers import png_bytes
from tests.project_file_helpers import ASCII_STL, binary_stl, glb_bytes

MB = 1024 * 1024


@pytest.fixture(autouse=True)
def upload_dir(test_app, tmp_path, monkeypatch):
    """Every upload goes to a scratch folder of its own."""
    monkeypatch.setitem(test_app.config, "UPLOAD_FOLDER", str(tmp_path))
    monkeypatch.setattr(Config, "UPLOAD_FOLDER", str(tmp_path))
    return tmp_path


@pytest.fixture
def student(init_db):
    return UserFactory()


def _login(client, user):
    with client.session_transaction() as sess:
        sess["user"] = user.id


def _part(name, data):
    return (BytesIO(data), name)


def _stored(upload_dir):
    folder = upload_dir / "project_files"
    return sorted(p.name for p in folder.iterdir()) if folder.exists() else []


def _new(client, name="With Files", **fields):
    return client.post(
        "/user/project/new", data={"name": name, **fields}, content_type="multipart/form-data"
    )


def _edit(client, project, **fields):
    fields.setdefault("name", project.name)
    return client.post(
        f"/user/project/edit/{project.id}", data=fields, content_type="multipart/form-data"
    )


def _files_of(project_id):
    db.session.expire_all()
    return [(f.kind, f.path) for f in db.session.get(Project, project_id).files]


def _project_with_files(client, owner, **files):
    """A project of ``owner`` that holds ``files``, uploaded through the edit route."""
    project = ProjectFactory(user_id=owner.id, name="Holder")
    _login(client, owner)
    response = _edit(client, project, **files)
    assert response.status_code == 200, response.get_json()
    return project


# ---- Uploading with the project form ---------------------------------------------


def test_a_new_project_stores_a_file_of_each_kind(client, student, upload_dir):
    _login(client, student)

    response = _new(
        client,
        model_files=[_part("exports/robot.stl", ASCII_STL)],
        source_files=[_part("game/src/main.py", b"print('hi')\n"), _part("game/README.md", b"# Game\n")],
        asset_files=[_part("game/img/hero.png", png_bytes())],
    )

    assert response.status_code == 200, response.get_json()
    project = Project.query.filter_by(name="With Files").one()
    # A model keeps only its name; the others keep the folders of the part's file name
    assert _files_of(project.id) == [
        ("model", "robot.stl"),
        ("source", "game/README.md"),
        ("source", "game/src/main.py"),
        ("asset", "game/img/hero.png"),
    ]
    assert len(_stored(upload_dir)) == 4


def test_the_project_json_lists_the_files(client, student):
    _login(client, student)
    _new(client, source_files=[_part("src/main.py", b"x = 1\n")])
    project = Project.query.filter_by(name="With Files").one()

    data = client.get(f"/user/project/edit/{project.id}", headers={"Accept": "application/json"}).get_json()

    [file] = data["data"]["project"]["files"]
    assert file["name"] == "main.py"
    assert file["path"] == "src/main.py"
    assert file["size"] == 6
    assert file["content_type"] == "text/plain; charset=utf-8"
    assert file["url"] == f"/user/project_files/{file['id']}/main.py"
    assert file["download_url"] == file["url"] + "?download=1"
    assert data["data"]["project"]["project_type"] == "code"


def test_an_edit_adds_files_and_answers_with_them(client, student):
    project = ProjectFactory(user_id=student.id, name="Edit Me")
    _login(client, student)

    response = _edit(client, project, model_files=[_part("arm.glb", glb_bytes())])

    assert response.status_code == 200
    [file] = response.get_json()["data"]["project"]["files"]
    assert (file["kind"], file["path"], file["content_type"]) == ("model", "arm.glb", "model/gltf-binary")


def test_uploading_a_path_again_replaces_the_file(client, student, upload_dir):
    project = _project_with_files(client, student, source_files=[_part("src/main.py", b"old\n")])
    [old] = db.session.get(Project, project.id).files
    old_id, old_stored = old.id, upload_dir / old.stored_path

    response = _edit(client, project, source_files=[_part("src/main.py", b"new\n")])

    assert response.status_code == 200
    [new] = response.get_json()["data"]["project"]["files"]
    assert new["id"] != old_id
    assert not old_stored.exists()
    assert client.get(new["url"]).data == b"new\n"
    assert client.get(f"/user/project_files/{old_id}/main.py").status_code == 404


def test_files_are_removed_by_id(client, student, upload_dir):
    project = _project_with_files(
        client,
        student,
        source_files=[_part("a.py", b"a"), _part("b.py", b"b"), _part("c.py", b"c"), _part("d.py", b"d")],
    )
    ids = {f.path: f.id for f in db.session.get(Project, project.id).files}

    # Repeated and comma-separated ids both count
    response = client.post(
        f"/user/project/edit/{project.id}",
        data={"name": "Holder", "remove_file_ids": [f"{ids['a.py']},{ids['b.py']}", str(ids["c.py"])]},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    assert _files_of(project.id) == [("source", "d.py")]
    assert len(_stored(upload_dir)) == 1


@pytest.mark.parametrize("remove_ids", ["abc", "1.5", "999999"])
def test_a_file_id_that_is_not_one_of_the_projects_files_is_a_400(client, student, upload_dir, remove_ids):
    project = _project_with_files(client, student, source_files=[_part("a.py", b"a")])

    response = _edit(client, project, name="Renamed", remove_file_ids=remove_ids)

    assert response.status_code == 400
    assert _files_of(project.id) == [("source", "a.py")]
    assert db.session.get(Project, project.id).name == "Holder"


def test_the_file_of_another_project_cannot_be_removed(client, student, upload_dir):
    other = _project_with_files(client, UserFactory(), source_files=[_part("theirs.py", b"x")])
    [theirs] = db.session.get(Project, other.id).files
    mine = ProjectFactory(user_id=student.id)
    _login(client, student)

    response = _edit(client, mine, remove_file_ids=str(theirs.id))

    assert response.status_code == 400
    assert _files_of(other.id) == [("source", "theirs.py")]
    assert len(_stored(upload_dir)) == 1


@pytest.mark.parametrize(
    "fields, message",
    [
        ({"source_files": [_part("setup.exe", b"MZ")]}, '"setup.exe" cannot be added as a source file.'),
        ({"model_files": [_part("robot.txt", b"solid")]}, '"robot.txt" cannot be added as a 3D model.'),
        ({"asset_files": [_part("page.html", b"<p>")]}, '"page.html" cannot be added as an asset.'),
        ({"source_files": [_part("data.py", b"\x89PNG\r\n\x1a\n\0\0")]}, '"data.py" is not a text file.'),
        ({"asset_files": [_part("hero.png", b"not an image")]}, '"hero.png": Invalid or corrupt image file.'),
        ({"model_files": [_part("robot.stl", b"not a model")]}, '"robot.stl" is not a valid STL file.'),
        ({"model_files": [_part("robot.glb", ASCII_STL)]}, '"robot.glb" is not a valid GLB file.'),
        ({"source_files": [_part("..", b"x")]}, "Every file needs a name."),
    ],
    ids=["exe-source", "txt-model", "html-asset", "binary-source", "bad-image", "bad-stl", "bad-glb", "no-name"],
)
def test_a_rejected_file_creates_nothing(client, student, upload_dir, fields, message):
    _login(client, student)

    response = _new(client, name="Rejected", **fields)

    assert response.status_code == 400
    assert response.get_json()["error"].startswith(message)
    assert Project.query.filter_by(name="Rejected").first() is None
    assert ProjectFile.query.count() == 0
    assert _stored(upload_dir) == []


@pytest.mark.parametrize(
    "setting, value, fields, status",
    [
        ("PROJECT_FILES_MAX_COUNT", 2, {"source_files": [_part(f"{n}.py", b"x") for n in "abc"]}, 400),
        ("PROJECT_FILES_MAX_TOTAL_BYTES", 10, {"source_files": [_part("a.py", b"123456"), _part("b.py", b"12345")]}, 413),
        ("PROJECT_SOURCE_MAX_BYTES", 4, {"source_files": [_part("big.py", b"12345")]}, 413),
        ("PROJECT_MODEL_MAX_BYTES", 100, {"model_files": [_part("big.stl", binary_stl(2))]}, 413),
        ("PROJECT_ASSET_MAX_BYTES", 10, {"asset_files": [_part("big.mp3", b"x" * 11)]}, 413),
    ],
    ids=["count", "total", "source-size", "model-size", "asset-size"],
)
def test_the_caps_are_enforced_and_nothing_is_kept(
    client, test_app, monkeypatch, student, upload_dir, setting, value, fields, status
):
    monkeypatch.setitem(test_app.config, setting, value)
    _login(client, student)

    response = _new(client, name="Too Much", **fields)

    assert response.status_code == status
    assert Project.query.filter_by(name="Too Much").first() is None
    assert _stored(upload_dir) == []


def test_the_caps_count_what_the_project_already_has(client, test_app, monkeypatch, student, upload_dir):
    project = _project_with_files(client, student, source_files=[_part("a.py", b"a"), _part("b.py", b"b")])
    monkeypatch.setitem(test_app.config, "PROJECT_FILES_MAX_COUNT", 2)
    [first, _] = db.session.get(Project, project.id).files

    assert _edit(client, project, source_files=[_part("c.py", b"c")]).status_code == 400
    # Removing a file in the same request makes room for one
    response = _edit(client, project, source_files=[_part("c.py", b"c")], remove_file_ids=str(first.id))

    assert response.status_code == 200
    assert _files_of(project.id) == [("source", "b.py"), ("source", "c.py")]


def test_a_rejected_edit_keeps_nothing_of_it(client, student, upload_dir):
    project = _project_with_files(client, student, model_files=[_part("robot.stl", ASCII_STL)])
    before = _stored(upload_dir)

    response = _edit(
        client,
        project,
        name="Renamed",
        project_type="3d",
        source_files=[_part("main.py", b"x = 1\n"), _part("bad.py", b"\xff\xfe")],
    )

    assert response.status_code == 400
    db.session.expire_all()
    kept = db.session.get(Project, project.id)
    assert (kept.name, kept.project_type) == ("Holder", "code")
    assert _files_of(project.id) == [("model", "robot.stl")]
    assert _stored(upload_dir) == before


def test_a_rejected_project_image_keeps_the_files_out_too(client, student, upload_dir):
    _login(client, student)

    response = _new(
        client,
        name="Bad Cover",
        source_files=[_part("main.py", b"x = 1\n")],
        project_image=_part("cover.png", b"not an image"),
    )

    assert response.status_code == 400
    assert Project.query.filter_by(name="Bad Cover").first() is None
    assert _stored(upload_dir) == []


def test_a_failed_commit_removes_the_stored_files(client, student, upload_dir, monkeypatch):
    _login(client, student)

    def fail():
        raise RuntimeError("database is gone")

    monkeypatch.setattr(db.session, "commit", fail)
    response = _new(client, name="Lost", source_files=[_part("main.py", b"x = 1\n")])

    assert response.status_code == 500
    assert _stored(upload_dir) == []


# ---- project_type ------------------------------------------------------------------


@pytest.fixture
def three_d(init_db):
    """The 3D modeling track: its templates are '3d' projects."""
    seed_three_d_track()
    return ProjectTemplate.query.filter_by(name="Name Tag Model").one()


def test_a_new_project_without_a_template_is_code(client, student):
    _login(client, student)

    assert _new(client, name="Plain").status_code == 200
    assert Project.query.filter_by(name="Plain").one().project_type == "code"


def test_a_new_project_takes_the_type_of_its_template(client, student, three_d):
    _login(client, student)

    _new(client, name="My Tag", template_id=str(three_d.id))
    # Older clients only send the template's name
    _new(client, name="Name Tag Model")

    assert Project.query.filter_by(name="My Tag").one().project_type == "3d"
    assert Project.query.filter_by(name="Name Tag Model").one().project_type == "3d"


def test_an_explicit_type_wins_over_the_template(client, student, three_d):
    _login(client, student)

    _new(client, name="Coded Tag", template_id=str(three_d.id), project_type="code")
    _new(client, name="Free Model", project_type="3D")

    assert Project.query.filter_by(name="Coded Tag").one().project_type == "code"
    assert Project.query.filter_by(name="Free Model").one().project_type == "3d"


@pytest.mark.parametrize("value", ["2d", "python", "3d model"])
def test_an_invalid_type_is_a_400(client, student, value):
    project = ProjectFactory(user_id=student.id, name="Typed")
    _login(client, student)

    created = _new(client, name="Invalid Type", project_type=value)
    edited = _edit(client, project, project_type=value, name="Renamed")

    assert created.status_code == edited.status_code == 400
    assert created.get_json()["error"] == "Invalid project type. Use 'code' or '3d'."
    assert Project.query.filter_by(name="Invalid Type").first() is None
    db.session.expire_all()
    assert db.session.get(Project, project.id).name == "Typed"


def test_an_edit_keeps_the_type_unless_one_is_sent(client, student):
    project = ProjectFactory(user_id=student.id, name="Typed", project_type="3d")
    _login(client, student)

    assert _edit(client, project).get_json()["data"]["project"]["project_type"] == "3d"
    assert _edit(client, project, project_type="").get_json()["data"]["project"]["project_type"] == "3d"
    assert _edit(client, project, project_type="code").get_json()["data"]["project"]["project_type"] == "code"


# ---- Who may change the files ---------------------------------------------------


def test_someone_else_cannot_add_or_remove_files(client, student, upload_dir):
    project = _project_with_files(client, student, source_files=[_part("a.py", b"a")])
    [file] = db.session.get(Project, project.id).files
    _login(client, UserFactory())

    added = _edit(client, project, source_files=[_part("b.py", b"b")])
    removed = _edit(client, project, remove_file_ids=str(file.id))

    assert added.status_code == removed.status_code == 403
    assert _files_of(project.id) == [("source", "a.py")]
    assert len(_stored(upload_dir)) == 1


def test_an_admin_can_add_and_remove_files_of_a_students_project(client, student, upload_dir):
    project = _project_with_files(client, student, source_files=[_part("a.py", b"a")])
    [file] = db.session.get(Project, project.id).files
    _login(client, AdminFactory())

    response = _edit(client, project, source_files=[_part("b.py", b"b")], remove_file_ids=str(file.id))

    assert response.status_code == 200
    assert _files_of(project.id) == [("source", "b.py")]
    assert db.session.get(Project, project.id).user_id == student.id


def test_an_admin_can_create_a_project_with_files_for_a_student(client, student):
    _login(client, AdminFactory())

    response = _new(client, name="For Student", student_id=str(student.id), model_files=[_part("r.stl", ASCII_STL)])

    assert response.status_code == 200
    project = Project.query.filter_by(name="For Student").one()
    assert project.user_id == student.id
    assert _files_of(project.id) == [("model", "r.stl")]


def test_deleting_a_project_removes_its_files(client, student, upload_dir):
    project = _project_with_files(
        client, student, model_files=[_part("r.stl", ASCII_STL)], source_files=[_part("a.py", b"a")]
    )
    assert len(_stored(upload_dir)) == 2

    response = client.post(f"/user/project/edit/{project.id}", data={"action": "delete"})

    assert response.status_code == 200
    assert ProjectFile.query.count() == 0
    assert _stored(upload_dir) == []


# ---- Serving -----------------------------------------------------------------------


def _uploaded(client, owner, kind, name, data):
    """Upload one file as ``owner``, log out, and return its JSON entry."""
    project = _project_with_files(client, owner, **{f"{kind}_files": [_part(name, data)]})
    with client.session_transaction() as sess:
        sess.clear()
    [file] = project.to_dict()["files"]
    return file


@pytest.mark.parametrize(
    "kind, name, data, content_type",
    [
        ("model", "robot.stl", ASCII_STL, "model/stl"),
        ("model", "robot.obj", b"v 0 0 0\n", "model/obj"),
        ("model", "robot.glb", glb_bytes(), "model/gltf-binary"),
        ("model", "robot.gltf", b"{}", "model/gltf+json"),
        ("model", "robot.3mf", b"PK\x03\x04", "model/3mf"),
        ("model", "robot.ply", b"ply\n", "application/octet-stream"),
        ("source", "main.py", b"print('hi')\n", "text/plain; charset=utf-8"),
        ("source", "index.html", b"<script>alert(1)</script>", "text/plain; charset=utf-8"),
        ("source", "app.js", b"alert(1)", "text/plain; charset=utf-8"),
        ("asset", "hero.png", png_bytes(), "image/png"),
        ("asset", "photo.jpg", png_bytes(), "image/png"),
        ("asset", "song.mp3", b"ID3", "audio/mpeg"),
        ("asset", "beep.wav", b"RIFF", "audio/wav"),
        ("asset", "loop.ogg", b"OggS", "audio/ogg"),
        ("asset", "voice.m4a", b"ftyp", "audio/mp4"),
        ("asset", "notes.pdf", b"%PDF-1.4", "application/pdf"),
    ],
)
def test_each_file_is_served_as_its_type(client, student, kind, name, data, content_type):
    file = _uploaded(client, student, kind, name, data)

    response = client.get(file["url"])

    assert response.status_code == 200
    assert response.headers["Content-Type"] == content_type
    assert file["content_type"] == content_type
    assert response.data == data
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["Cache-Control"] == "public, max-age=86400"
    assert response.headers["Content-Disposition"] == f"inline; filename={name}"


def test_download_asks_for_an_attachment(client, student):
    file = _uploaded(client, student, "model", "robot.stl", ASCII_STL)

    response = client.get(file["download_url"])

    assert response.status_code == 200
    assert response.headers["Content-Disposition"] == "attachment; filename=robot.stl"
    assert response.headers["Content-Type"] == "model/stl"


def test_a_name_with_spaces_and_brackets_is_served_from_its_escaped_url(client, student):
    file = _uploaded(client, student, "asset", "art/my sprite (2).png", png_bytes())

    assert file["url"].endswith("/my%20sprite%20%282%29.png")
    assert client.get(file["url"]).status_code == 200


def test_a_range_request_gets_part_of_the_file(client, student):
    file = _uploaded(client, student, "asset", "song.mp3", b"0123456789")

    response = client.get(file["url"], headers={"Range": "bytes=2-5"})

    assert response.status_code == 206
    assert response.data == b"2345"


@pytest.mark.parametrize(
    "url",
    [
        "/user/project_files/{id}/other.stl",
        "/user/project_files/{id}/ROBOT.STL",
        "/user/project_files/{id}/robot.stl/extra",
        "/user/project_files/{id}/exports/robot.stl",
        "/user/project_files/999999/robot.stl",
    ],
)
def test_a_url_that_does_not_name_the_file_is_a_404(client, student, url):
    file = _uploaded(client, student, "model", "robot.stl", ASCII_STL)

    assert client.get(url.format(id=file["id"])).status_code == 404


def test_a_file_missing_from_disk_is_a_404(client, student, upload_dir):
    file = _uploaded(client, student, "model", "robot.stl", ASCII_STL)
    for stored in (upload_dir / "project_files").iterdir():
        stored.unlink()

    assert client.get(file["url"]).status_code == 404


@pytest.mark.parametrize("stored_path", ["../outside.txt", "submissions/homework.txt", "project_files"])
def test_a_stored_path_outside_the_project_files_folder_is_never_served(client, student, upload_dir, stored_path):
    (upload_dir / "outside.txt").write_bytes(b"secret")
    (upload_dir / "submissions").mkdir()
    (upload_dir / "submissions" / "homework.txt").write_bytes(b"secret")
    file = _uploaded(client, student, "source", "notes.txt", b"mine")
    row = db.session.get(ProjectFile, file["id"])
    row.stored_path = stored_path
    db.session.commit()

    assert client.get(file["url"]).status_code == 404


def test_files_are_served_to_visitors_who_are_not_logged_in(client, student):
    file = _uploaded(client, student, "source", "main.py", b"x = 1\n")

    with client.session_transaction() as sess:
        assert "user" not in sess
    assert client.get(file["url"]).data == b"x = 1\n"


def test_the_serve_route_is_rate_limited(rate_limited_app):
    client = rate_limited_app.test_client()

    def fetch():
        return client.get("/user/project_files/1/robot.stl", environ_base={"REMOTE_ADDR": "10.0.0.7"})

    assert {fetch().status_code for _ in range(100)} == {404}
    assert fetch().status_code == 429


# ---- Where projects are read ---------------------------------------------------------


def test_profiles_list_each_projects_files_without_a_query_per_project(client, student, count_queries):
    for n in range(3):
        project = _project_with_files(client, student, source_files=[_part(f"p{n}.py", b"x")])
        project.name = f"Project {n}"
        db.session.commit()

    slug = student.slug

    def profile_statements():
        db.session.remove()
        with count_queries() as statements:
            response = client.get(f"/user/profile/{slug}", headers={"Accept": "application/json"})
        projects = response.get_json()["data"]["target"]["projects"]
        return statements, projects

    few, projects = profile_statements()
    assert sorted(p["files"][0]["path"] for p in projects) == ["p0.py", "p1.py", "p2.py"]

    owner = db.session.get(type(student), student.id)
    for n in range(3, 8):
        _project_with_files(client, owner, source_files=[_part(f"p{n}.py", b"x")])
    many, projects = profile_statements()

    assert len(projects) == 8
    assert len(many) == len(few)
    assert len([s for s in many if "FROM project_files" in s]) == 1


def test_the_review_queue_lists_the_files(client, student):
    _project_with_files(client, student, model_files=[_part("robot.stl", ASCII_STL)])
    _login(client, AdminFactory())

    projects = client.get("/api/admin/manage-projects?filter=pending").get_json()["data"]["projects"]

    [project] = [p for p in projects if p["name"] == "Holder"]
    assert [f["name"] for f in project["files"]] == ["robot.stl"]
    assert project["project_type"] == "code"


def test_the_parent_report_lists_the_files_without_a_query_per_project(client, student, count_queries):
    from tests.factories import ParentFactory

    _project_with_files(client, student, source_files=[_part("main.py", b"x = 1\n")])
    parent = ParentFactory()
    parent.children.append(student)
    db.session.commit()
    student_id, parent_id = student.id, parent.id

    def report():
        db.session.remove()
        with client.session_transaction() as sess:
            sess["user"] = parent_id
        with count_queries() as statements:
            data = client.get(f"/api/parents/student/{student_id}/report").get_json()["data"]
        return statements, data

    few, data = report()
    [project] = data["projects"]
    assert [f["path"] for f in project["files"]] == ["main.py"]

    owner = db.session.get(type(student), student_id)
    for n in range(4):
        _project_with_files(client, owner, model_files=[_part(f"m{n}.stl", ASCII_STL)])
    many, data = report()

    assert len(data["projects"]) == 5
    assert len(many) == len(few)


# ---- Admin assignment and templates ------------------------------------------------


def test_assigning_a_template_project_takes_the_templates_type(client, student, three_d):
    _login(client, AdminFactory())

    def assign(**extra):
        return client.post("/api/admin/assign-project", json={"user_id": student.id, **extra})

    assert assign(name="Name Tag Model").status_code == 200
    assert assign(name="Free Thing").status_code == 200
    assert assign(name="Code Thing", project_type="code").status_code == 200
    assert assign(name="Model Thing", project_type="3d").status_code == 200

    types = {p.name: p.project_type for p in Project.query.filter_by(user_id=student.id)}
    assert types == {"Name Tag Model": "3d", "Free Thing": "code", "Code Thing": "code", "Model Thing": "3d"}


def test_assigning_an_invalid_type_is_a_400(client, student):
    _login(client, AdminFactory())

    response = client.post(
        "/api/admin/assign-project", json={"user_id": student.id, "name": "Bad", "project_type": "4d"}
    )

    assert response.status_code == 400
    assert response.get_json()["message"] == "Invalid project type. Use 'code' or '3d'."
    assert Project.query.filter_by(name="Bad").first() is None


def test_templates_store_their_project_type(client, init_db):
    _login(client, AdminFactory())

    created = client.post("/api/project-templates", json={"name": "Printable", "description": "d", "project_type": "3d"})
    plain = client.post("/api/project-templates", json={"name": "Plain", "description": "d"})
    template_id = created.get_json()["data"]["template"]["id"]

    assert created.get_json()["data"]["template"]["project_type"] == "3d"
    assert plain.get_json()["data"]["template"]["project_type"] == "code"
    listed = client.get("/api/project-templates").get_json()["data"]["templates"]
    assert listed["Printable"]["project_type"] == "3d"

    unchanged = client.put(f"/api/project-templates/{template_id}", json={"description": "new"})
    assert unchanged.get_json()["data"]["template"]["project_type"] == "3d"
    changed = client.put(f"/api/project-templates/{template_id}", json={"project_type": "code"})
    assert changed.get_json()["data"]["template"]["project_type"] == "code"


def test_templates_refuse_an_invalid_type(client, init_db):
    _login(client, AdminFactory())
    template = ProjectTemplate(name="Typed", description="d", project_type="3d")
    db.session.add(template)
    db.session.commit()

    created = client.post("/api/project-templates", json={"name": "Odd", "description": "d", "project_type": "vr"})
    updated = client.put(f"/api/project-templates/{template.id}", json={"name": "Renamed", "project_type": "vr"})

    assert created.status_code == updated.status_code == 400
    assert created.get_json()["error"] == "Invalid project type. Use 'code' or '3d'."
    assert ProjectTemplate.query.filter_by(name="Odd").first() is None
    db.session.expire_all()
    assert (template.name, template.project_type) == ("Typed", "3d")
