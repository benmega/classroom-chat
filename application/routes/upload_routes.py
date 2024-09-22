from flask import Blueprint, request, jsonify
import base64
from io import BytesIO
from PIL import Image
from datetime import datetime
import mimetypes

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
    extension = mimetypes.guess_extension(mime_type) or 'bin'

    file_path = f'userData/{mime_type.split("/")[0]}/file_{timestamp}{extension}'

    if mime_type.startswith('image/'):
        image = Image.open(BytesIO(data))
        image.save(file_path)
    else:
        with open(file_path, 'wb') as f:
            f.write(data)

    return jsonify({"message": "File uploaded successfully", "file_path": file_path})
