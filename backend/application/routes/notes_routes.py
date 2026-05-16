import os
import uuid
from flask import Blueprint, request, jsonify, session, current_app, send_from_directory
from werkzeug.utils import secure_filename

from application import limiter
from application.extensions import db
from application.models.note import Note
from application.models.user import User
from application.utilities.db_helpers import get_user
from application.utilities.helper_functions import allowed_file, get_s3_client

notes_bp = Blueprint("notes", __name__)

S3_NOTES_BUCKET = "classroom-chat-student-notes"


@notes_bp.route("/upload", methods=["POST"])
@limiter.limit("200 per day")
def upload_note():
    user_id = session.get("user")
    if not user_id:
        return jsonify({"status": "error", "error": "Unauthorized"}), 401

    if "note" in request.files:
        file = request.files["note"]
    elif "note_image" in request.files:
        file = request.files["note_image"]
    else:
        return jsonify({"status": "error", "error": "No file provided"}), 400

    user_obj = db.session.get(User, user_id)
    if not user_obj:
        return jsonify({"status": "error", "error": "User not found"}), 404

    if file and allowed_file(file.filename):
        # 1. Determine storage method (S3 if configured, else local)
        s3_client = get_s3_client()
        aws_configured = (
            os.environ.get("AWS_ACCESS_KEY_ID") is not None
            and os.environ.get("AWS_SECRET_ACCESS_KEY") is not None
        )

        s3_key = None
        # Use S3 if configured AND not explicitly disabled for dev
        use_s3 = current_app.config.get("USE_S3", aws_configured)

        if s3_client and use_s3:
            s3_key = handle_note_s3_upload(s3_client, file, user_obj)

        # 2. Fallback to local if S3 failed, isn't configured, or disabled
        db_filename = s3_key
        if not db_filename:
            # IMPORTANT: Reset file pointer in case S3 upload attempted and moved it
            file.seek(0)
            db_filename = handle_local_note_upload(file)

        if db_filename:
            # 3. Save to Database
            new_note = Note(user_id=user_obj.id, filename=db_filename)
            db.session.add(new_note)
            db.session.commit()

            return jsonify(
                {
                    "status": "success",
                    "message": "Note uploaded successfully.",
                    "note": {"id": new_note.id, "url": new_note.url},
                }
            )

    return jsonify({"status": "error", "error": "Upload failed"}), 500


def handle_local_note_upload(file):
    """
    Saves a note locally to the userData/notes folder.
    Returns the filename on success, None on failure.
    """
    try:
        ext = file.filename.rsplit(".", 1)[1].lower()
        filename = f"{uuid.uuid4().hex}.{ext}"
        notes_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "notes")
        os.makedirs(notes_dir, exist_ok=True)

        file_path = os.path.join(notes_dir, filename)

        # Ensure we are at the start of the file
        file.seek(0)
        file.save(file_path)

        # Verify file size to catch empty uploads
        if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
            return filename
        else:
            current_app.logger.error(
                f"Local Note Upload saved an empty file: {filename}"
            )
            if os.path.exists(file_path):
                os.remove(file_path)
            return None
    except Exception as e:
        current_app.logger.error(f"Local Note Upload Error: {e}")
        return None


@notes_bp.route("/view/<filename>")
@limiter.limit("500 per minute")
def serve_note(filename):
    """Serve a locally stored note."""
    notes_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "notes")

    # Security: prevent traversal
    filename = os.path.basename(filename)
    full_path = os.path.join(notes_dir, filename)

    if not os.path.exists(full_path):
        current_app.logger.warning(f"Note not found on disk: {full_path}")
        # Could return a default image here if we want to avoid 404

    return send_from_directory(notes_dir, filename)


def handle_note_s3_upload(s3_client, file, user_obj):
    """
    Returns the S3 Key (filename) on success, None on failure.
    """
    s3_key = f"notes/{user_obj.username}/{secure_filename(file.filename)}"

    try:
        s3_client.upload_fileobj(
            file,
            S3_NOTES_BUCKET,
            s3_key,
            ExtraArgs={
                "ContentType": file.content_type,
                "Metadata": {"user_id": str(user_obj.id)},
            },
        )
        return s3_key
    except Exception as e:
        current_app.logger.error(f"Note S3 Upload Error: {e}")
        return None


@notes_bp.route("/delete/<int:note_id>", methods=["POST"])
def delete_note(note_id):
    note = db.get_or_404(Note, note_id)

    # Security check: Ensure the user owns the note (or is admin)
    user_id = session.get("user")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    current_user = get_user(user_id)
    if note.user_id != current_user.id and not current_user.is_admin:
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    try:
        if "/" in note.filename:
            # 1. S3 Delete
            s3_client = get_s3_client()
            if s3_client:
                s3_client.delete_object(Bucket=S3_NOTES_BUCKET, Key=note.filename)
        else:
            # 2. Local Delete
            local_path = os.path.join(
                current_app.config["UPLOAD_FOLDER"], "notes", note.filename
            )
            if os.path.exists(local_path):
                os.remove(local_path)

        # 3. Delete from Database
        db.session.delete(note)
        db.session.commit()

        return jsonify({"status": "success"})

    except Exception as e:
        # Log the sensitive details securely to your server
        current_app.logger.error(f"Error deleting note {note_id}: {str(e)}")

        # Return a safe, generic message to the frontend
        return (
            jsonify(
                {
                    "status": "error",
                    "error": "Failed to delete the note from the server.",
                }
            ),
            500,
        )
