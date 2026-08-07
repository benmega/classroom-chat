"""
File: submission_routes.py
Type: py
Summary: Admin inbox for reviewing/downloading/deleting student file submissions.
"""

import os

from application.config import Config
from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response
from application.extensions import db
from application.models.submission import Submission
from application.models.user import User
from flask import jsonify, request, send_file

from ..admin_routes import admin_bp


@admin_bp.route("/submissions", methods=["GET"])
@admin_only
@api_response
def list_submissions():
    status = request.args.get("status")

    query = db.session.query(Submission, User).outerjoin(
        User, Submission.user_id == User.id
    )
    if status in ("pending", "reviewed"):
        query = query.filter(Submission.status == status)

    rows = query.order_by(Submission.timestamp.desc()).all()

    submissions = []
    for submission, user in rows:
        data = submission.to_dict()
        data["username"] = user.username if user else None
        data["nickname"] = user.nickname if user else None
        submissions.append(data)

    return {"submissions": submissions}


@admin_bp.route("/submissions/<int:submission_id>/download", methods=["GET"])
@admin_only
def download_submission(submission_id):
    submission = db.session.get(Submission, submission_id)
    if not submission:
        return jsonify({"error": "Submission not found"}), 404

    base_path = Config.UPLOAD_FOLDER
    file_path = os.path.join(base_path, submission.stored_path)

    abs_file_path = os.path.abspath(file_path)
    abs_base_path = os.path.abspath(base_path)
    if not abs_file_path.startswith(abs_base_path):
        return jsonify({"error": "Invalid file path"}), 403

    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404

    return send_file(
        file_path, as_attachment=True, download_name=submission.original_filename
    )


@admin_bp.route("/submissions/<int:submission_id>/mark-reviewed", methods=["POST"])
@admin_only
@api_response
def mark_submission_reviewed(submission_id):
    submission = db.session.get(Submission, submission_id)
    if not submission:
        return {"error": "Submission not found"}, 404

    data = request.get_json(silent=True) or {}
    note = (data.get("teacher_note") or "").strip()[:500]

    submission.status = "reviewed"
    if note:
        submission.teacher_note = note
    db.session.commit()

    return {"submission": submission.to_dict()}


@admin_bp.route("/submissions/<int:submission_id>", methods=["DELETE"])
@admin_only
@api_response
def delete_submission(submission_id):
    submission = db.session.get(Submission, submission_id)
    if not submission:
        return {"error": "Submission not found"}, 404

    base_path = Config.UPLOAD_FOLDER
    file_path = os.path.join(base_path, submission.stored_path)
    abs_file_path = os.path.abspath(file_path)
    abs_base_path = os.path.abspath(base_path)

    if abs_file_path.startswith(abs_base_path):
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except OSError:
            pass  # Best-effort: don't fail the request if the file can't be removed

    db.session.delete(submission)
    db.session.commit()

    return {"message": "Deleted"}
