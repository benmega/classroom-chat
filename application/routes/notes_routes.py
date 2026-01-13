import boto3
from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.utils import secure_filename

from application.extensions import db
from application.models.note import Note
from application.models.user import User
from application.utilities.helper_functions import allowed_file

notes = Blueprint("notes", __name__)

S3_NOTES_BUCKET = "classroom-chat-student-notes"
s3_client = boto3.client("s3")


@notes.route("/upload_note", methods=["POST"])
def upload_note():
    user_id = session.get("user")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    if "note_image" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["note_image"]
    user_obj = User.query.get(user_id)

    if file and allowed_file(file.filename):
        # 1. Capture the filename/key returned by the helper
        s3_key = handle_note_s3_upload(file, user_obj)

        if s3_key:
            # 2. Save to Database
            new_note = Note(
                user_id=user_obj.id,
                filename=s3_key
            )
            db.session.add(new_note)
            db.session.commit()

            return jsonify({"success": True, "message": "Note uploaded successfully."})

    return jsonify({"error": "Upload failed"}), 500

def handle_note_s3_upload(file, user_obj):
    """
    Returns the S3 Key (filename) on success, None on failure.
    """
    ext = file.filename.rsplit(".", 1)[1].lower()
    # Path structure: notes/username/secure_filename
    s3_key = f"notes/{user_obj.username}/{secure_filename(file.filename)}"

    try:
        s3_client.upload_fileobj(
            file,
            S3_NOTES_BUCKET,
            s3_key,
            ExtraArgs={
                "ContentType": file.content_type,
                "Metadata": {"user_id": str(user_obj.id)}
                # REMOVED: "ACL": "public-read" to fix the error
            },
        )
        return s3_key
    except Exception as e:
        current_app.logger.error(f"Note S3 Upload Error: {e}")
        return None