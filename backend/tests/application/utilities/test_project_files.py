"""
File: test_project_files.py
Type: py
Summary: Unit tests for application/utilities/project_files.py: path cleaning, the checks
         per kind of file, the caps, and storing files all or nothing.
"""

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from application.config import Config
from application.extensions import db
from application.models.project_file import ProjectFile
from application.utilities import project_files
from application.utilities.project_files import (
    ProjectFileError,
    clean_relative_path,
    content_type_for,
    extension_of,
    file_ids_to_remove,
    is_glb,
    is_stl,
    project_path,
    served_content_type,
    store_project_files,
    uploads_from,
    validate_asset,
    validate_model,
    validate_project_file,
    validate_source,
)
from tests.factories import ProjectFactory, ProjectFileFactory
from tests.image_helpers import jpeg_bytes, png_bytes
from tests.project_file_helpers import ASCII_STL, binary_stl, glb_bytes, upload
from werkzeug.datastructures import MultiDict

MB = 1024 * 1024


@pytest.fixture(autouse=True)
def upload_dir(test_app, tmp_path, monkeypatch):
    monkeypatch.setitem(test_app.config, "UPLOAD_FOLDER", str(tmp_path))
    monkeypatch.setattr(Config, "UPLOAD_FOLDER", str(tmp_path))
    return tmp_path


def _stored(upload_dir):
    folder = upload_dir / "project_files"
    return sorted(p.name for p in folder.iterdir()) if folder.exists() else []


def _rejected(call, *args):
    with pytest.raises(ProjectFileError) as excinfo:
        call(*args)
    return excinfo.value


# ---- Paths --------------------------------------------------------------------


@pytest.mark.parametrize(
    "filename, path",
    [
        ("main.py", "main.py"),
        ("src/game/main.py", "src/game/main.py"),
        (r"src\game\main.py", "src/game/main.py"),
        ("../../etc/passwd", "etc/passwd"),
        (r"..\..\windows\win.ini", "windows/win.ini"),
        ("src/../main.py", "src/main.py"),
        ("./src/./main.py", "src/main.py"),
        ("src//main.py", "src/main.py"),
        ("/absolute/main.py", "absolute/main.py"),
        ("src/ ../main.py", "src/main.py"),
    ],
)
def test_a_path_keeps_its_folders_but_never_climbs_out(filename, path):
    assert clean_relative_path(filename) == path


@pytest.mark.parametrize(
    "filename, path",
    [
        ('say "hi"?.py', "say _hi__.py"),
        ("a\x00b.py", "a_b.py"),
        ("tab\there.py", "tab_here.py"),
        ("  my   game  .py", "my game .py"),
        ("notes.txt.", "notes.txt"),
        (".hidden.py", "hidden.py"),
        ("Player (2) + C++@2x.png", "Player (2) + C++@2x.png"),
        ("drive:/x<y>|z*.py", "drive_/x_y__z_.py"),
    ],
)
def test_each_segment_is_cleaned(filename, path):
    assert clean_relative_path(filename) == path


def test_letters_of_any_script_are_kept():
    # Thai vowel and tone marks are combining marks, and stay with their letters
    assert clean_relative_path("แมว/สวัสดี.py") == "แมว/สวัสดี.py"


@pytest.mark.parametrize("filename", ["", None, "/", "..", "../..", "./", " . ", "\\"])
def test_a_name_with_nothing_left_is_rejected(filename):
    assert _rejected(clean_relative_path, filename).status == 400


def test_a_path_over_255_characters_is_rejected():
    assert clean_relative_path("a" * 252 + ".py") == "a" * 252 + ".py"
    assert _rejected(clean_relative_path, "a" * 253 + ".py").status == 400


def test_a_model_keeps_only_its_file_name():
    assert project_path("model", "exports/robot.stl") == "robot.stl"
    assert project_path("source", "src/main.py") == "src/main.py"
    assert project_path("asset", "img/hero.png") == "img/hero.png"


@pytest.mark.parametrize(
    "name, ext",
    [("a.STL", "stl"), ("src/x.py", "py"), ("a.tar.gz", "gz"), ("noext", ""), (".bashrc", ""), ("dir.d/file", "")],
)
def test_extension_of(name, ext):
    assert extension_of(name) == ext


# ---- Content types ------------------------------------------------------------


@pytest.mark.parametrize(
    "kind, ext, content_type",
    [
        ("source", "py", "text/plain; charset=utf-8"),
        ("source", "html", "text/plain; charset=utf-8"),
        ("source", "js", "text/plain; charset=utf-8"),
        ("model", "stl", "model/stl"),
        ("model", "obj", "model/obj"),
        ("model", "glb", "model/gltf-binary"),
        ("model", "gltf", "model/gltf+json"),
        ("model", "3mf", "model/3mf"),
        ("model", "ply", "application/octet-stream"),
        ("asset", "png", "image/png"),
        ("asset", "jpg", "image/jpeg"),
        ("asset", "jpeg", "image/jpeg"),
        ("asset", "gif", "image/gif"),
        ("asset", "webp", "image/webp"),
        ("asset", "mp3", "audio/mpeg"),
        ("asset", "wav", "audio/wav"),
        ("asset", "ogg", "audio/ogg"),
        ("asset", "m4a", "audio/mp4"),
        ("asset", "pdf", "application/pdf"),
        ("asset", "html", "application/octet-stream"),
        ("other", "png", "application/octet-stream"),
    ],
)
def test_content_type_for(kind, ext, content_type):
    assert content_type_for(kind, ext) == content_type


def test_a_source_file_is_served_as_plain_text_whatever_its_row_says():
    row = SimpleNamespace(kind="source", stored_path="project_files/abc.html", content_type="text/html")

    assert served_content_type(row) == "text/plain; charset=utf-8"


def test_an_image_is_served_as_the_type_of_its_stored_extension():
    row = SimpleNamespace(kind="asset", stored_path="project_files/abc.jpg", content_type="image/jpeg")

    assert served_content_type(row) == "image/jpeg"


# ---- Checks per kind ----------------------------------------------------------


def test_stl_magic():
    assert is_stl(ASCII_STL)
    assert is_stl(b"  \r\nSOLID upper case\nendsolid")
    assert is_stl(binary_stl(1))
    assert is_stl(binary_stl(0))
    assert is_stl(binary_stl(3))
    # A binary file whose header happens to start with "solid" is still binary
    assert is_stl(binary_stl(2, header=b"solid exported by a CAD tool"))
    assert not is_stl(binary_stl(2)[:-10])  # truncated: the count no longer fits the size
    assert not is_stl(binary_stl(2) + b"\0")
    assert not is_stl(b"not a model at all")
    assert not is_stl(png_bytes())


def test_glb_magic():
    assert is_glb(glb_bytes())
    assert not is_glb(b'{"asset": {}}')
    assert not is_glb(b"glT")


@pytest.mark.parametrize(
    "ext, data",
    [
        ("stl", ASCII_STL),
        ("stl", binary_stl(4)),
        ("glb", glb_bytes()),
        ("obj", b"v 0 0 0\n"),
        ("gltf", b"{}"),
        ("3mf", b"PK\x03\x04"),
        ("ply", b"ply\n"),
    ],
)
def test_valid_models(ext, data):
    assert validate_model(data, ext, "robot") == (ext, content_type_for("model", ext))


@pytest.mark.parametrize(
    "ext, data, message",
    [
        ("stl", b"just some text", '"robot" is not a valid STL file.'),
        ("stl", png_bytes(), '"robot" is not a valid STL file.'),
        ("glb", ASCII_STL, '"robot" is not a valid GLB file.'),
        ("obj", b"", '"robot" is empty.'),
    ],
)
def test_invalid_models(ext, data, message):
    error = _rejected(validate_model, data, ext, "robot")

    assert (error.status, error.message) == (400, message)


@pytest.mark.parametrize(
    "data",
    [b"print('hi')\n", b"", "# café แมว\n".encode(), b"\xef\xbb\xbfwith a BOM\n"],
    ids=["ascii", "empty", "utf8", "bom"],
)
def test_valid_source_files(data):
    assert validate_source(data, "py", "main.py") == ("py", "text/plain; charset=utf-8")


@pytest.mark.parametrize(
    "data",
    [b"caf\xe9", "utf-16 text".encode("utf-16"), b"text\0with a nul", png_bytes()],
    ids=["latin-1", "utf-16", "nul", "png"],
)
def test_binary_source_files_are_rejected(data):
    error = _rejected(validate_source, data, "py", "main.py")

    assert error.status == 400
    assert error.message == '"main.py" is not a text file. Source files must be UTF-8 text.'


def test_an_image_asset_is_verified_and_keeps_its_format():
    assert validate_asset(png_bytes(), "png", "hero.png") == ("png", "image/png")


def test_an_image_asset_is_stored_as_its_real_format():
    # A PNG named .jpg is a PNG: stored and served as one
    assert validate_asset(png_bytes(), "jpg", "hero.jpg") == ("png", "image/png")
    assert validate_asset(jpeg_bytes(), "png", "photo.png") == ("jpg", "image/jpeg")


@pytest.mark.parametrize("data", [b"not an image", b"", b"GIF89a" + b"\0" * 10])
def test_a_bad_image_asset_is_rejected(data):
    error = _rejected(validate_asset, data, "png", "hero.png")

    assert error.status == 400
    assert error.message.startswith('"hero.png": ')


@pytest.mark.parametrize("ext, content_type", [("mp3", "audio/mpeg"), ("ogg", "audio/ogg"), ("pdf", "application/pdf")])
def test_audio_and_pdf_assets_need_content_only(ext, content_type):
    assert validate_asset(b"\x01\x02", ext, "x") == (ext, content_type)
    assert _rejected(validate_asset, b"", ext, "x").message == '"x" is empty.'


@pytest.mark.parametrize(
    "kind, filename",
    [
        ("model", "robot.exe"),
        ("model", "robot.py"),
        ("source", "robot.stl"),
        ("source", "setup.exe"),
        ("source", "macro.vbs"),
        ("source", "Makefile"),
        ("asset", "page.html"),
        ("asset", "drawing.svg"),
        ("asset", "lib.dll"),
    ],
)
def test_a_type_that_is_not_allowed_for_the_kind_is_rejected(kind, filename):
    error = _rejected(validate_project_file, kind, filename, b"data")

    assert error.status == 400
    assert "Allowed types:" in error.message


@pytest.mark.parametrize("filename", ["run.sh", "build.bat", "tool.ps1", "index.html", "app.js"])
def test_scripts_and_pages_are_accepted_as_source(filename):
    path, _, content_type = validate_project_file("source", filename, b"echo hi\n")

    assert path == filename
    assert content_type == "text/plain; charset=utf-8"


def test_validate_project_file_returns_the_cleaned_path():
    assert validate_project_file("model", "a/b/robot.STL", ASCII_STL) == ("robot.STL", "stl", "model/stl")
    assert validate_project_file("source", r"src\main.py", b"x = 1\n") == (
        "src/main.py",
        "py",
        "text/plain; charset=utf-8",
    )


@pytest.mark.parametrize(
    "kind, setting, filename",
    [
        ("model", "PROJECT_MODEL_MAX_BYTES", "big.stl"),
        ("source", "PROJECT_SOURCE_MAX_BYTES", "big.py"),
        ("asset", "PROJECT_ASSET_MAX_BYTES", "big.mp3"),
    ],
)
def test_a_file_over_the_cap_of_its_kind_is_413(test_app, monkeypatch, kind, setting, filename):
    monkeypatch.setitem(test_app.config, setting, 2 * MB)

    error = _rejected(validate_project_file, kind, filename, b"x" * (2 * MB + 1))

    assert error.status == 413
    assert error.message.endswith("can be at most 2 MB.")


def test_the_default_caps_and_lists_are_the_contract():
    assert Config.PROJECT_MODEL_MAX_BYTES == 50 * MB
    assert Config.PROJECT_SOURCE_MAX_BYTES == MB
    assert Config.PROJECT_ASSET_MAX_BYTES == 10 * MB
    assert Config.PROJECT_FILES_MAX_COUNT == 40
    assert Config.PROJECT_FILES_MAX_TOTAL_BYTES == 150 * MB
    assert sorted(Config.PROJECT_MODEL_EXTENSIONS) == ["3mf", "glb", "gltf", "obj", "ply", "stl"]
    assert sorted(Config.PROJECT_ASSET_EXTENSIONS) == [
        "gif", "jpeg", "jpg", "m4a", "mp3", "ogg", "pdf", "png", "wav", "webp"
    ]
    assert len(Config.PROJECT_SOURCE_EXTENSIONS) == 40
    assert {"py", "html", "sh", "bat", "ps1", "r", "m"} <= Config.PROJECT_SOURCE_EXTENSIONS
    assert not {"exe", "msi", "dll", "vbs"} & Config.PROJECT_SOURCE_EXTENSIONS
    # The three lists never overlap, so an extension names one kind
    assert not Config.PROJECT_MODEL_EXTENSIONS & Config.PROJECT_SOURCE_EXTENSIONS
    assert not Config.PROJECT_MODEL_EXTENSIONS & Config.PROJECT_ASSET_EXTENSIONS
    assert not Config.PROJECT_SOURCE_EXTENSIONS & Config.PROJECT_ASSET_EXTENSIONS


# ---- Form parsing -------------------------------------------------------------


def test_file_ids_to_remove_takes_repeated_and_comma_separated_ids():
    form = MultiDict([("remove_file_ids", "1,2"), ("remove_file_ids", " 3 "), ("remove_file_ids", ""), ("other", "9")])

    assert file_ids_to_remove(form) == [1, 2, 3]
    assert file_ids_to_remove(MultiDict()) == []


@pytest.mark.parametrize("value", ["x", "-1", "1.5", "1,,two", "1_000", "²"])
def test_file_ids_to_remove_rejects_what_is_not_an_id(value):
    error = _rejected(file_ids_to_remove, MultiDict([("remove_file_ids", value)]))

    assert error.status == 400


def test_uploads_from_groups_the_form_fields_by_kind():
    model, source = upload("robot.stl", ASCII_STL), upload("main.py", b"")
    files = MultiDict([("model_files", model), ("source_files", source), ("project_image", upload("x.png", b""))])

    assert uploads_from(files) == {"model": [model], "source": [source], "asset": []}


# ---- Storing ------------------------------------------------------------------


@pytest.fixture
def project(init_db):
    return ProjectFactory()


def _store(project, models=(), sources=(), assets=(), remove_ids=()):
    files = {"model": list(models), "source": list(sources), "asset": list(assets)}
    return store_project_files(project, files, remove_ids)


def _paths(project):
    db.session.expire_all()
    return [(f.kind, f.path) for f in db.session.get(type(project), project.id).files]


def test_each_kind_is_stored_under_a_new_name(project, upload_dir):
    rows = _store(
        project,
        models=[upload("exports/robot.stl", binary_stl(2))],
        sources=[upload("src/main.py", b"print('hi')\n")],
        assets=[upload("img/hero.jpg", png_bytes())],
    )
    db.session.commit()

    assert [(r.kind, r.path, r.content_type) for r in rows] == [
        ("model", "robot.stl", "model/stl"),
        ("source", "src/main.py", "text/plain; charset=utf-8"),
        ("asset", "img/hero.jpg", "image/png"),
    ]
    for row in rows:
        assert row.stored_path.startswith("project_files/")
        stored = upload_dir / row.stored_path
        assert stored.stat().st_size == row.file_size
    # The image is stored under the extension of its real format
    assert rows[2].stored_path.endswith(".png")
    assert rows[1].stored_path.endswith(".py")
    assert (upload_dir / rows[1].stored_path).read_bytes() == b"print('hi')\n"
    assert len(_stored(upload_dir)) == 3


def test_nothing_to_do_changes_nothing(project, upload_dir):
    assert _store(project) == []
    assert _store(project, sources=[upload("", b"no name, no file")]) == []
    assert _stored(upload_dir) == []


def test_a_path_the_project_has_is_replaced_under_a_new_id(project, upload_dir):
    [old] = _store(project, sources=[upload("src/main.py", b"old\n")])
    db.session.commit()
    old_id, old_file = old.id, upload_dir / old.stored_path

    [new] = _store(project, sources=[upload(r"src\main.py", b"new\n")])
    # The old file stays until the replacement is committed
    assert old_file.exists()
    db.session.commit()

    assert new.id != old_id
    assert db.session.get(ProjectFile, old_id) is None
    assert not old_file.exists()
    assert (upload_dir / new.stored_path).read_bytes() == b"new\n"
    assert _paths(project) == [("source", "src/main.py")]


def test_files_are_removed_by_id(project, upload_dir):
    first, _ = _store(project, sources=[upload("a.py", b"a"), upload("b.py", b"b")])
    db.session.commit()
    first_file = upload_dir / first.stored_path

    assert _store(project, remove_ids=[first.id]) == []
    db.session.commit()

    assert not first_file.exists()
    assert _paths(project) == [("source", "b.py")]


def test_an_id_that_is_not_a_file_of_the_project_is_rejected(project, upload_dir):
    other = ProjectFileFactory()

    error = _rejected(_store, project, (), [upload("a.py", b"a")], (), [other.id])

    assert error.status == 400
    assert _stored(upload_dir) == []
    assert db.session.get(ProjectFile, other.id) is not None


def test_the_count_cap_counts_the_files_after_removals_and_additions(test_app, monkeypatch, project, upload_dir):
    monkeypatch.setitem(test_app.config, "PROJECT_FILES_MAX_COUNT", 2)
    first, _ = _store(project, sources=[upload("a.py", b"a"), upload("b.py", b"b")])
    db.session.commit()

    error = _rejected(_store, project, (), [upload("c.py", b"c")])
    assert (error.status, error.message) == (400, "A project can have at most 2 files.")

    # Removing one makes room, and so does replacing a path the project has
    _store(project, sources=[upload("c.py", b"c")], remove_ids=[first.id])
    db.session.commit()
    _store(project, sources=[upload("c.py", b"c2")])
    db.session.commit()
    assert _paths(project) == [("source", "b.py"), ("source", "c.py")]


def test_the_total_cap_is_413(test_app, monkeypatch, project, upload_dir):
    monkeypatch.setitem(test_app.config, "PROJECT_FILES_MAX_TOTAL_BYTES", 10)
    _store(project, sources=[upload("a.py", b"123456")])
    db.session.commit()

    error = _rejected(_store, project, (), [upload("b.py", b"12345")])

    assert error.status == 413
    assert error.message.startswith("The files of a project can add up to at most")
    assert len(_stored(upload_dir)) == 1


def test_two_uploads_with_the_same_path_are_rejected(project, upload_dir):
    error = _rejected(_store, project, (), [upload("src/a.py", b"1"), upload(r"src\a.py", b"2")])

    assert error.message == 'Two of the uploaded files have the same path: "src/a.py".'
    assert _stored(upload_dir) == []


def test_a_rejected_file_keeps_the_whole_upload_out(project, upload_dir):
    error = _rejected(
        _store,
        project,
        [upload("robot.stl", ASCII_STL)],
        [upload("main.py", b"x = 1\n"), upload("binary.py", b"\xff\xfe\x00")],
    )

    assert error.status == 400
    assert _stored(upload_dir) == []
    assert project.files == []


def test_a_write_that_fails_removes_what_was_written(project, upload_dir):
    real_write = project_files.write_bytes_atomic
    calls = []

    def fail_on_the_second(path, data):
        calls.append(path)
        if len(calls) == 2:
            raise OSError("disk full")
        real_write(path, data)

    with patch.object(project_files, "write_bytes_atomic", side_effect=fail_on_the_second):
        error = _rejected(_store, project, (), [upload("a.py", b"a"), upload("b.py", b"b")])

    assert error.status == 500
    assert len(calls) == 2
    assert _stored(upload_dir) == []
    assert project.files == []


def test_the_new_files_go_again_when_the_transaction_is_rolled_back(project, upload_dir):
    _store(project, sources=[upload("a.py", b"a")])
    assert len(_stored(upload_dir)) == 1

    db.session.rollback()

    assert _stored(upload_dir) == []


def test_the_new_files_go_again_when_the_session_is_closed_without_a_commit(project, upload_dir):
    _store(project, models=[upload("robot.stl", ASCII_STL)])

    db.session.close()

    assert _stored(upload_dir) == []


def test_the_new_files_stay_once_committed(project, upload_dir):
    _store(project, assets=[upload("song.mp3", b"ID3 not really")])
    db.session.commit()
    # A rollback of a later transaction does not touch them
    db.session.rollback()

    assert len(_stored(upload_dir)) == 1


def test_a_failed_commit_removes_the_new_files(project, upload_dir):
    _store(project, sources=[upload("a.py", b"a")])
    # The same path a second time: the commit trips over the unique constraint
    db.session.add(ProjectFile(project_id=project.id, kind="source", path="a.py", stored_path="x", content_type="t", file_size=1))

    with pytest.raises(Exception, match="UNIQUE"):
        db.session.commit()
    db.session.rollback()

    assert _stored(upload_dir) == []
