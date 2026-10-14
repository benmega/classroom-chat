"""
File: project_files.py
Type: py
Summary: The files of a project (3D models, source files, assets): their paths, the checks
         an upload must pass, storage under userData/project_files and the type each one
         is served as.

Everything an upload brings is checked before anything is written, and a request that
fails keeps nothing: store_project_files removes what it wrote, and the files it stored
for a transaction that is not committed are removed again (utilities/stored_files.py).
"""

import logging
import os
import re
import struct
import unicodedata
import uuid
from dataclasses import dataclass, replace
from io import BytesIO
from typing import Any

from application.config import Config
from application.extensions import db
from application.models.project_file import FILE_KINDS, ProjectFile
from application.utilities.image_upload import ImageUploadError, process_image, write_bytes_atomic
from application.utilities.stored_files import remove_stored_file, remove_unless_committed
from flask import current_app, has_app_context

logger = logging.getLogger(__name__)

# The folder under Config.UPLOAD_FOLDER that holds every project file
PROJECT_FILES_DIR = "project_files"

# The fields of the project form that carry each kind of file, and the ids to remove
UPLOAD_FIELDS = {"model": "model_files", "source": "source_files", "asset": "asset_files"}
REMOVE_FIELD = "remove_file_ids"

# Source files are shown as text and always sent as plain text, whatever their
# extension: an uploaded page or script never runs on this site.
SOURCE_CONTENT_TYPE = "text/plain; charset=utf-8"
# What a model or an asset is sent as, by extension. An image is stored under the
# extension of its verified format, so its stored extension gives its real type.
CONTENT_TYPES = {
    "model": {
        "stl": "model/stl",
        "obj": "model/obj",
        "glb": "model/gltf-binary",
        "gltf": "model/gltf+json",
        "3mf": "model/3mf",
        "ply": "application/octet-stream",
    },
    "asset": {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "webp": "image/webp",
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "ogg": "audio/ogg",
        "m4a": "audio/mp4",
        "pdf": "application/pdf",
    },
}
FALLBACK_CONTENT_TYPE = "application/octet-stream"
# Assets that go through the image pipeline (verified, never re-encoded)
IMAGE_EXTENSIONS = frozenset({"png", "jpg", "jpeg", "gif", "webp"})

# ProjectFile.path holds at most this many characters
MAX_PATH_LENGTH = 255

_EXTENSION_SETTINGS = {
    "model": "PROJECT_MODEL_EXTENSIONS",
    "source": "PROJECT_SOURCE_EXTENSIONS",
    "asset": "PROJECT_ASSET_EXTENSIONS",
}
_SIZE_SETTINGS = {
    "model": "PROJECT_MODEL_MAX_BYTES",
    "source": "PROJECT_SOURCE_MAX_BYTES",
    "asset": "PROJECT_ASSET_MAX_BYTES",
}
_KIND_LABELS = {"model": "a 3D model", "source": "a source file", "asset": "an asset"}

# Besides letters, marks and digits of any script, a path segment keeps these
_SEGMENT_PUNCTUATION = frozenset(" ._-()+@")
_FILE_ID = re.compile(r"[0-9]{1,18}")


class ProjectFileError(Exception):
    """A rejected upload. ``message`` is safe to show to the user, ``status`` is the HTTP status."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def _setting(name):
    """A setting from the app config, falling back to Config outside an app context."""
    if has_app_context():
        return current_app.config.get(name, getattr(Config, name))
    return getattr(Config, name)


def allowed_extensions(kind):
    return _setting(_EXTENSION_SETTINGS[kind])


def max_bytes(kind):
    return _setting(_SIZE_SETTINGS[kind])


def _size_label(num_bytes):
    megabytes = num_bytes / (1024 * 1024)
    return f"{megabytes:.0f} MB" if megabytes == int(megabytes) else f"{megabytes:.1f} MB"


# --------------------------------------------------------------------------- paths


def extension_of(name):
    """The lower-case extension of a file name (or of the last segment of a path), '' when it has none."""
    stem, dot, ext = name.rsplit("/", 1)[-1].rpartition(".")
    return ext.lower() if dot and stem else ""


def _clean_segment(segment):
    """One folder or file name, safe to show and to put in a URL: letters, marks and
    digits of any script and a few punctuation marks stay, anything else becomes "_";
    runs of spaces shrink to one, and leading and trailing spaces and dots go."""
    kept = "".join(
        char if char in _SEGMENT_PUNCTUATION or unicodedata.category(char)[0] in "LMN" else "_"
        for char in unicodedata.normalize("NFC", segment)
    )
    return " ".join(kept.split()).strip(" .")


def clean_relative_path(filename):
    """The path a file is shown under in its project, from the name the browser sent.

    Backslashes count as slashes. Empty, "." and ".." segments are dropped, so no path
    climbs out of the project ("../../etc/passwd" becomes "etc/passwd"), and every
    segment is cleaned (see _clean_segment). Raises ProjectFileError when no name is
    left or the path is too long.
    """
    segments = (_clean_segment(part) for part in str(filename or "").replace("\\", "/").split("/"))
    path = "/".join(segment for segment in segments if segment)
    if not path:
        raise ProjectFileError("Every file needs a name.")
    if len(path) > MAX_PATH_LENGTH:
        raise ProjectFileError(f"A file path is too long: at most {MAX_PATH_LENGTH} characters.")
    return path


def project_path(kind, filename):
    """clean_relative_path, except that a 3D model keeps only its file name: a model is
    shown on its own, never in a folder tree."""
    path = clean_relative_path(filename)
    return path.rsplit("/", 1)[-1] if kind == "model" else path


def content_type_for(kind, ext):
    """What a stored file of ``kind`` with extension ``ext`` is sent as."""
    if kind == "source":
        return SOURCE_CONTENT_TYPE
    return CONTENT_TYPES.get(kind, {}).get(ext, FALLBACK_CONTENT_TYPE)


def served_content_type(project_file):
    """The type the serve route sends a stored file as. It follows from the kind and the
    stored extension rather than the content_type column, so a source file is plain
    text however its row was edited (the two agree for every uploaded file)."""
    return content_type_for(project_file.kind, extension_of(project_file.stored_path))


# ---------------------------------------------------------------------- validation


def is_stl(data):
    """ASCII STL starts with "solid". Binary STL is an 80-byte header, a triangle count
    and 50 bytes per triangle, so its size is exactly 84 + 50 * count. Some binary
    files also start with "solid", which is why the size is checked first."""
    if len(data) >= 84:
        (count,) = struct.unpack_from("<I", data, 80)
        if len(data) == 84 + 50 * count:
            return True
    return data[:1024].lstrip()[:5].lower() == b"solid"


def is_glb(data):
    """Binary glTF starts with the magic "glTF"."""
    return data[:4] == b"glTF"


def validate_model(data, ext, name="The file"):
    """Check the content of a 3D model. Returns (stored extension, content type)."""
    if not data:
        raise ProjectFileError(f'"{name}" is empty.')
    if ext == "stl" and not is_stl(data):
        raise ProjectFileError(f'"{name}" is not a valid STL file.')
    if ext == "glb" and not is_glb(data):
        raise ProjectFileError(f'"{name}" is not a valid GLB file.')
    return ext, content_type_for("model", ext)


def validate_source(data, ext, name="The file"):
    """A source file is shown as text: it must be UTF-8 without NUL bytes. Empty is
    fine, as an empty __init__.py is a real file. Returns (stored extension, content type)."""
    try:
        data.decode("utf-8")
    except UnicodeDecodeError:
        raise ProjectFileError(f'"{name}" is not a text file. Source files must be UTF-8 text.') from None
    if b"\0" in data:
        raise ProjectFileError(f'"{name}" is not a text file. Source files must be UTF-8 text.')
    return ext, SOURCE_CONTENT_TYPE


def validate_asset(data, ext, name="The file"):
    """An image goes through the image pipeline (verified, kept as uploaded) and is
    stored and served as its verified format; audio and PDF files only need content.
    Returns (stored extension, content type)."""
    if ext in IMAGE_EXTENSIONS:
        try:
            image = process_image(BytesIO(data), max_bytes=max_bytes("asset"), reencode=False)
        except ImageUploadError as e:
            raise ProjectFileError(f'"{name}": {e.message}', e.status) from None
        return image.ext, image.content_type
    if not data:
        raise ProjectFileError(f'"{name}" is empty.')
    return ext, content_type_for("asset", ext)


_VALIDATORS = {"model": validate_model, "source": validate_source, "asset": validate_asset}


def _check_name_and_size(kind, path, size):
    """The checks that need no content: the type allowed for the kind and its size cap.
    Returns the file name."""
    name = path.rsplit("/", 1)[-1]
    allowed = allowed_extensions(kind)
    if extension_of(name) not in allowed:
        raise ProjectFileError(
            f'"{name}" cannot be added as {_KIND_LABELS[kind]}. Allowed types: {", ".join(sorted(allowed))}.'
        )
    cap = max_bytes(kind)
    if size > cap:
        raise ProjectFileError(f'"{name}" is too large: {_KIND_LABELS[kind]} can be at most {_size_label(cap)}.', 413)
    return name


def validate_project_file(kind, filename, data):
    """Check one uploaded file of ``kind``: its name, type, size and content.

    Returns (path, stored extension, content type). Raises ProjectFileError, with
    status 413 for a file over the size cap of its kind.
    """
    path = project_path(kind, filename)
    name = _check_name_and_size(kind, path, len(data))
    stored_ext, content_type = _VALIDATORS[kind](data, extension_of(name), name)
    return path, stored_ext, content_type


# ------------------------------------------------------------------ form parsing


def uploads_from(files):
    """The project files of a request (``request.files``), by kind."""
    return {kind: files.getlist(field) for kind, field in UPLOAD_FIELDS.items()}


def file_ids_to_remove(form):
    """The ids in the remove_file_ids field of a request (``request.form``). The field
    may be repeated, hold comma-separated ids, or both."""
    ids = []
    for value in form.getlist(REMOVE_FIELD):
        for part in str(value).split(","):
            part = part.strip()
            if not part:
                continue
            if not _FILE_ID.fullmatch(part):
                raise ProjectFileError("The files to remove are not valid file ids.")
            ids.append(int(part))
    return ids


# ----------------------------------------------------------------------- storing


@dataclass(frozen=True)
class _PlannedFile:
    """An upload that passed the checks that need no content (then the content ones)."""

    kind: str
    path: str
    size: int
    upload: Any  # the FileStorage: read when its content is checked, again when it is written
    stored_ext: str = ""
    content_type: str = ""


def _read(upload):
    upload.seek(0)
    return upload.read()


def _size_of(upload):
    upload.seek(0, os.SEEK_END)
    size = upload.tell()
    upload.seek(0)
    return size


def _plan(kind, upload):
    path = project_path(kind, upload.filename)
    size = _size_of(upload)
    _check_name_and_size(kind, path, size)
    return _PlannedFile(kind, path, size, upload)


def _with_checked_content(planned):
    name = planned.path.rsplit("/", 1)[-1]
    stored_ext, content_type = _VALIDATORS[planned.kind](_read(planned.upload), extension_of(name), name)
    return replace(planned, stored_ext=stored_ext, content_type=content_type)


def _check_project_caps(count, total):
    max_count = _setting("PROJECT_FILES_MAX_COUNT")
    if count > max_count:
        raise ProjectFileError(f"A project can have at most {max_count} files.")
    max_total = _setting("PROJECT_FILES_MAX_TOTAL_BYTES")
    if total > max_total:
        raise ProjectFileError(f"The files of a project can add up to at most {_size_label(max_total)}.", 413)


def _write(planned_files):
    """Write each file under a new name in the storage folder, all of them or none.
    Returns their stored paths."""
    written = []
    try:
        os.makedirs(os.path.join(Config.UPLOAD_FOLDER, PROJECT_FILES_DIR), exist_ok=True)
        for planned in planned_files:
            stored_path = f"{PROJECT_FILES_DIR}/{uuid.uuid4().hex}.{planned.stored_ext}"
            write_bytes_atomic(os.path.join(Config.UPLOAD_FOLDER, stored_path), _read(planned.upload))
            written.append(stored_path)
    except OSError:
        logger.exception("Could not store the uploaded project files")
        for stored_path in written:
            remove_stored_file(stored_path)
        raise ProjectFileError("The files could not be saved. Please try again.", 500) from None
    return written


def store_project_files(project, files_by_kind, remove_ids=()):
    """Add the uploaded files to ``project`` and take away the files in ``remove_ids``.

    ``files_by_kind`` maps a kind ("model", "source", "asset") to FileStorage objects
    (see uploads_from); parts without a file name are skipped. ``remove_ids`` are ids
    of the project's files (see file_ids_to_remove). An upload whose path the project
    already has replaces that file, under a new id.

    Everything is checked before anything is written: the name, type and size cap of
    each file, the number of files and their total size as the project will have
    them, then the content of each file. When anything is rejected it raises
    ProjectFileError (400, or 413 for a size cap) and leaves the session and the disk
    as they were.

    The rows are added to the session, not committed. The new files are removed again
    unless the transaction commits, and the files of removed and replaced rows are
    removed once it commits (utilities/stored_files.py). Returns the new rows.
    """
    uploads = [
        (kind, upload)
        for kind in FILE_KINDS
        for upload in files_by_kind.get(kind, ())
        if upload and upload.filename
    ]
    remove_ids = set(remove_ids)
    if not uploads and not remove_ids:
        return []

    current = {project_file.id: project_file for project_file in project.files}
    if not remove_ids <= current.keys():
        raise ProjectFileError("Some of the files to remove are not files of this project.")

    planned = [_plan(kind, upload) for kind, upload in uploads]
    paths = [planned_file.path for planned_file in planned]
    repeated = sorted({path for path in paths if paths.count(path) > 1})
    if repeated:
        raise ProjectFileError(f'Two of the uploaded files have the same path: "{repeated[0]}".')
    dropped = [f for f in current.values() if f.id in remove_ids or f.path in paths]
    kept = [f for f in current.values() if f not in dropped]
    _check_project_caps(
        len(kept) + len(planned),
        sum(f.file_size for f in kept) + sum(planned_file.size for planned_file in planned),
    )
    planned = [_with_checked_content(planned_file) for planned_file in planned]

    written = _write(planned)
    for stored_path in written:
        remove_unless_committed(db.session, stored_path)
    for project_file in dropped:
        project.files.remove(project_file)  # delete-orphan: the row goes, its file once that commits
    if dropped and planned:
        # Delete before inserting: a replacement has the path of the row it replaces,
        # and (project_id, path) must stay unique at every step of the flush.
        db.session.flush()
    rows = [
        ProjectFile(
            kind=planned_file.kind,
            path=planned_file.path,
            stored_path=stored_path,
            content_type=planned_file.content_type,
            file_size=planned_file.size,
        )
        for planned_file, stored_path in zip(planned, written, strict=True)
    ]
    project.files.extend(rows)
    return rows
