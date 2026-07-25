"""
File: upload_routes.py
Type: py
Summary: Authenticated upload endpoints. Accepts only validated images and
         PDFs, enforces a size cap, and never exposes server file paths.
"""

import base64
import binascii
import os
import uuid
from datetime import datetime
from io import BytesIO

from flask import Blueprint, jsonify, request, send_from_directory
from PIL import Image, UnidentifiedImageError

from application import limiter
from application.config import Config
from application.decorators.login_required import require_login

upload = Blueprint("upload", __name__)

# Formats PIL may report that we accept, mapped to the extension we store.
_IMAGE_FORMATS = {"PNG": ".png", "JPEG": ".jpg", "GIF": ".gif", "WEBP": ".webp"}

# Decoded payload cap. MAX_CONTENT_LENGTH still bounds the raw request body.
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def _save(subdir: str, extension: str, data: bytes) -> str:
    directory = os.path.join(Config.UPLOAD_FOLDER, subdir)
    os.makedirs(directory, exist_ok=True)
    filename = (
        f"file_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        f"_{uuid.uuid4().hex[:8]}{extension}"
    )
    with open(os.path.join(directory, filename), "wb") as f:
        f.write(data)
    return f"{subdir}/{filename}"


@upload.route("/upload_file", methods=["POST"])
@require_login
@limiter.limit("10 per minute; 40 per day")
def upload_file():
    if not request.is_json:
        return jsonify({"error": "Invalid JSON data"}), 400

    json_data = request.get_json(silent=True)
    if json_data is None:
        return jsonify({"error": "Invalid JSON data"}), 400

    data_url = json_data.get("file")
    if not data_url or not isinstance(data_url, str):
        return jsonify({"error": "No file data provided"}), 400

    try:
        header, encoded = data_url.split(",", 1)
        mime_type = header.split(";")[0].split(":")[1]
        data = base64.b64decode(encoded)
    except (ValueError, IndexError, binascii.Error):
        return jsonify({"error": "Malformed file data"}), 400

    if len(data) > MAX_UPLOAD_BYTES:
        return jsonify({"error": "File too large (10 MB maximum)"}), 413

    if mime_type.startswith("image/"):
        # Validate the actual content, not the client-declared mime type.
        try:
            image = Image.open(BytesIO(data))
            image_format = image.format
            image.verify()
        except (UnidentifiedImageError, OSError):
            return jsonify({"error": "Invalid or corrupted image"}), 400

        extension = _IMAGE_FORMATS.get(image_format)
        if not extension:
            return jsonify({"error": "Unsupported image format"}), 415

        relative_path = _save("image", extension, data)
    elif mime_type == "application/pdf":
        if not data.startswith(b"%PDF-"):
            return jsonify({"error": "Invalid PDF file"}), 400
        relative_path = _save("pdf", ".pdf", data)
    else:
        return jsonify({"error": f"Unsupported file type: {mime_type}"}), 415

    return jsonify(
        {
            "message": "File uploaded successfully",
            "url": f"/upload/uploads/{relative_path}",
        }
    )


@upload.route("/uploads/<path:filename>")
@require_login
def uploaded_file(filename):
    return send_from_directory(Config.UPLOAD_FOLDER, filename)
