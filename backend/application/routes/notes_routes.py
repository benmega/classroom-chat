import os
import uuid
from io import BytesIO

from application import limiter
from application.config import Config
from application.decorators.login_required import require_login
from application.extensions import db
from application.models.note import Note
from application.models.user import User
from application.utilities.db_helpers import find_user
from application.utilities.helper_functions import allowed_file, get_s3_client
from application.utilities.image_upload import (
    ImageUploadError,
    process_image,
    save_processed_image,
)
from flask import (
    Blueprint,
    current_app,
    g,
    jsonify,
    request,
    send_from_directory,
    session,
)

notes_bp = Blueprint("notes", __name__)


def _store_note(file, owner):
    """
    Validates an uploaded note image, stores it (S3 when configured, else under
    userData/notes) and records it as a Note of ``owner``. Returns the JSON response.
    The original bytes are kept: a note is a photo, only its content is checked.
    """
    if not file or not file.filename or not allowed_file(file.filename):
        return (
            jsonify(
                {
                    "status": "error",
                    "error": "Invalid file type. Allowed: "
                    + ", ".join(sorted(Config.ALLOWED_EXTENSIONS)),
                }
            ),
            400,
        )

    try:
        image = process_image(
            file,
            max_bytes=current_app.config["IMAGE_MAX_BYTES_NOTE"],
            reencode=False,
        )
    except ImageUploadError as e:
        return jsonify({"status": "error", "error": e.message}), e.status

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
        s3_key = handle_note_s3_upload(s3_client, image, owner)

    # 2. Fallback to local if S3 failed, isn't configured, or disabled
    db_filename = s3_key or handle_local_note_upload(image)

    if db_filename:
        # 3. Save to Database
        new_note = Note(user_id=owner.id, filename=db_filename)
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

    return _store_note(file, user_obj)


def handle_local_note_upload(image):
    """
    Saves a validated note image (a ProcessedImage) to the userData/notes folder.
    Returns the filename on success, None on failure.
    """
    try:
        notes_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "notes")
        return save_processed_image(image, notes_dir)
    except Exception as e:
        current_app.logger.exception(f"Local Note Upload Error: {e}")
        return None


@notes_bp.route("/view/<filename>")
@require_login
@limiter.limit("500 per minute")
def serve_note(filename):
    """Serve a locally stored note to its owner, their parents, or an admin."""
    viewer = g.get("user")
    note = Note.query.filter_by(filename=os.path.basename(filename)).first()
    if note is not None and viewer is not None:
        is_owner = note.user_id == viewer.id
        is_parent = viewer in (note.user.parents or [])
        if not (is_owner or is_parent or viewer.role == 'admin'):
            return jsonify({"error": "Not authorized to view this note"}), 403

    notes_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "notes")

    # Security: prevent traversal
    filename = os.path.basename(filename)
    full_path = os.path.join(notes_dir, filename)

    if not os.path.exists(full_path):
        current_app.logger.warning(f"Note not found on disk: {full_path}")

    return send_from_directory(notes_dir, filename)


def handle_note_s3_upload(s3_client, image, user_obj):
    """
    Uploads a validated note image (a ProcessedImage) to S3.
    Returns the S3 Key (filename) on success, None on failure.

    The key is unique per upload, so two notes never share an object, and the content
    type comes from the verified image, not from the client.
    """
    s3_key = f"notes/{user_obj.username}/{uuid.uuid4().hex}.{image.ext}"

    try:
        s3_client.upload_fileobj(
            BytesIO(image.data),
            current_app.config["S3_NOTES_BUCKET"],
            s3_key,
            ExtraArgs={
                "ContentType": image.content_type,
                "Metadata": {"user_id": str(user_obj.id)},
            },
        )
        return s3_key
    except Exception as e:
        current_app.logger.exception(f"Note S3 Upload Error: {e}")
        return None


@notes_bp.route("/delete/<int:note_id>", methods=["POST"])
def delete_note(note_id):
    note = db.get_or_404(Note, note_id)

    # Security check: Ensure the user owns the note (or is admin)
    user_id = session.get("user")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    current_user = find_user(user_id)
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401
    if note.user_id != current_user.id and current_user.role != 'admin':
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    try:
        if "/" in note.filename:
            # 1. S3 Delete
            s3_client = get_s3_client()
            if not s3_client:
                # Keep the row: deleting it now would orphan the object for good.
                current_app.logger.error(
                    f"Cannot delete note {note_id}: the S3 client is unavailable"
                )
                return (
                    jsonify(
                        {
                            "status": "error",
                            "error": "Storage is unavailable. Please try again later.",
                        }
                    ),
                    503,
                )
            s3_client.delete_object(
                Bucket=current_app.config["S3_NOTES_BUCKET"], Key=note.filename
            )
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
        current_app.logger.exception(f"Error deleting note {note_id}: {e!s}")

        return (
            jsonify(
                {
                    "status": "error",
                    "error": "Failed to delete the note from the server.",
                }
            ),
            500,
        )


@notes_bp.route("/kiosk-upload", methods=["POST"])
@require_login
@limiter.limit("500 per day")
def kiosk_upload_note():
    user_id = session.get("user")
    current_user = find_user(user_id)
    if not current_user or getattr(current_user, "role", "") != 'admin':
        return jsonify({"status": "error", "error": "Unauthorized"}), 403

    target_student_id = request.form.get("student_id")
    if not target_student_id:
        return jsonify({"status": "error", "error": "No student specified"}), 400

    target_user = db.session.get(User, target_student_id)
    if not target_user:
        return jsonify({"status": "error", "error": "Student not found"}), 404

    if "note" in request.files:
        file = request.files["note"]
    elif "note_image" in request.files:
        file = request.files["note_image"]
    else:
        return jsonify({"status": "error", "error": "No file provided"}), 400

    return _store_note(file, target_user)
