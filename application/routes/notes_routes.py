from urllib.parse import urlparse

import boto3
from botocore.exceptions import BotoCoreError, MissingDependencyException
from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.utils import secure_filename

from application import limiter
from application.extensions import db
from application.models.note import Note
from application.models.user import User
from application.utilities.db_helpers import get_user
from application.utilities.helper_functions import allowed_file

notes_bp = Blueprint("notes", __name__)

S3_NOTES_BUCKET = "classroom-chat-student-notes"


def get_s3_client():
    """
    Create the S3 client lazily so the app can boot even if S3 isn't configured
    or optional botocore dependencies aren't present.
    Returns a boto3 client or None if unavailable.
    """
    try:
        return boto3.client("s3")
    except MissingDependencyException as e:
        current_app.logger.error(
            "S3 is unavailable due to a missing optional dependency: %s", e
        )
        return None
    except BotoCoreError as e:
        current_app.logger.error("S3 client initialization failed: %s", e)
        return None
    except Exception as e:
        current_app.logger.exception("Unexpected error initializing S3 client: %s", e)
        return None


@notes_bp.route("/upload_note", methods=["POST"])
@limiter.limit("20 per day")
def upload_note():
    user_id = session.get("user")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    if "note_image" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["note_image"]
    user_obj = User.query.get(user_id)

    if file and allowed_file(file.filename):
        s3_client = get_s3_client()
        if s3_client is None:
            return (
                jsonify(
                    {
                        "error": "Notes upload is temporarily unavailable (S3 is not configured on this server)."
                    }
                ),
                503,
            )

        # 1. Capture the filename/key returned by the helper
        s3_key = handle_note_s3_upload(s3_client, file, user_obj)

        if s3_key:
            # 2. Save to Database
            new_note = Note(user_id=user_obj.id, filename=s3_key)
            db.session.add(new_note)
            db.session.commit()

            return jsonify({"success": True, "message": "Note uploaded successfully."})

    return jsonify({"error": "Upload failed"}), 500


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
    note = Note.query.get_or_404(note_id)

    # Security check: Ensure the user owns the note (or is admin)
    user_id = session.get("user")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    current_user = get_user(user_id)
    if note.user_id != current_user.id and not current_user.is_admin:
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    s3_client = get_s3_client()
    if s3_client is None:
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Notes delete is temporarily unavailable (S3 is not configured on this server).",
                }
            ),
            503,
        )

    try:
        # Extract the S3 object key from the URL
        parsed_url = urlparse(note.url)
        object_key = parsed_url.path.lstrip("/")

        s3_client.delete_object(Bucket=S3_NOTES_BUCKET, Key=object_key)

        # 2. Delete from Database
        db.session.delete(note)
        db.session.commit()

        return jsonify({"success": True})

    except Exception as e:
        print(f"Error deleting note: {e}")
        return (
            jsonify({"success": False, "error": "Failed to delete from server."}),
            500,
        )