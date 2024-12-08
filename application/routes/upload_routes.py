import os

from flask import Blueprint, request, jsonify, send_from_directory
import base64
from io import BytesIO
from PIL import Image
from datetime import datetime
import mimetypes

from application import Config

upload_bp = Blueprint('upload_bp', __name__)


@upload_bp.route('/upload_file', methods=['POST'])
def upload_file():
    json_data = request.get_json()

    if not json_data:
        return jsonify({"error": "Invalid JSON data"}), 400

    data_url = json_data.get('file')

    if not data_url:
        return jsonify({"error": "No file data provided"}), 400

    # Determine file type
    header, encoded = data_url.split(",", 1)
    mime_type = header.split(";")[0].split(":")[1]
    data = base64.b64decode(encoded)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    file_path = None

    # Use mimetypes to guess the file extension
    extension = mimetypes.guess_extension(mime_type) or 'bin'

    if mime_type.startswith('image/'):
        # Handle image files
        file_path = f'userData/image/file_{timestamp}{extension}'
        image = Image.open(BytesIO(data))
        image.save(file_path)
    elif mime_type == 'application/pdf':
        # Handle PDF files
        file_path = f'userData/pdfs/file_{timestamp}{extension}'
        with open(file_path, 'wb') as f:
            f.write(data)
    else:
        # Handle other file types
        file_path = f'userData/other/file_{timestamp}{extension}'
        with open(file_path, 'wb') as f:
            f.write(data)

    return jsonify({"message": "File uploaded successfully", "file_path": file_path})


@upload_bp.route('/profile_pictures/<filename>')
def uploaded_file(filename):
    print(os.path.isfile(f'static/uploads/profile_pictures/{filename}.jpg'))
    print(Config.UPLOAD_FOLDER)
    print(filename)
    absolute_path = os.path.abspath(Config.UPLOAD_FOLDER)
    return send_from_directory(absolute_path, filename)
