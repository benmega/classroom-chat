"""
File: submission_routes.py
Type: py
Summary: Student-facing endpoint for submitting homework/files to the teacher.
"""

import os
import uuid

from application import limiter
from application.config import Config
from application.decorators.api_response import api_response
from application.decorators.login_required import require_login
from application.extensions import db
from application.models.submission import Submission
from application.models.user import User
from flask import Blueprint, request, session
from werkzeug.utils import secure_filename

submission_bp = Blueprint("submission", __name__)


@submission_bp.route("", methods=["POST"])
@require_login
@limiter.limit("10 per minute; 30 per day")
@api_response
def submit_work():
    file = request.files.get("file")
    if not file or not file.filename:
        return {"error": "No file provided"}, 400

    if "." not in file.filename:
        return {"error": "Invalid file type"}, 400

    extension = file.filename.rsplit(".", 1)[1].lower()
    if extension not in Config.SUBMISSION_ALLOWED_EXTENSIONS:
        return {"error": "Invalid file type"}, 400

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > Config.SUBMISSION_MAX_BYTES:
        return {"error": "File too large"}, 413

    user = db.session.get(User, session.get("user"))
    if not user:
        return {"error": "User not found"}, 401

    directory = os.path.join(Config.UPLOAD_FOLDER, "submissions")
    os.makedirs(directory, exist_ok=True)

    stored_filename = f"{uuid.uuid4().hex}.{extension}"
    file.save(os.path.join(directory, stored_filename))
    stored_path = f"submissions/{stored_filename}"

    classroom_id = user.classrooms[0].id if user.classrooms else None

    original_filename = secure_filename(file.filename)[:255]
    note = request.form.get("note", "")[:500]

    submission = Submission(
        user_id=user.id,
        classroom_id=classroom_id,
        original_filename=original_filename,
        stored_path=stored_path,
        file_size=size,
        note=note,
        status="pending",
    )
    db.session.add(submission)
    db.session.commit()

    return {"submission": submission.to_dict()}, 201
