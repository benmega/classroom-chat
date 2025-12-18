"""
File: upload_routes.py
Type: py
Summary: Flask routes for handling file uploads with S3 integration.
"""

import os
import boto3
from flask import Blueprint, request, jsonify, abort, send_from_directory
import base64
from io import BytesIO
from PIL import Image
from datetime import datetime
import mimetypes
import logging

from application import limiter
from application.config import Config
from application.decorators.licensing import premium_required

upload = Blueprint('upload', __name__)

# Initialize S3 client
s3_client = boto3.client('s3',
    aws_access_key_id=Config.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=Config.AWS_SECRET_ACCESS_KEY,
    region_name=Config.AWS_REGION
)

S3_BUCKET = Config.S3_BUCKET_NAME

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@upload.route('/upload_file', methods=['POST'])
@limiter.limit("10 per minute; 20 per day")
# @premium_required

def upload_file():
    if not request.is_json:
        logger.debug("Request is not JSON format")
        return jsonify({"error": "Invalid JSON data"}), 400

    json_data = request.get_json()

    if not json_data:
        logger.debug("No JSON data in request")
        return jsonify({"error": "Invalid JSON data"}), 400

    data_url = json_data.get('file')

    if not data_url:
        logger.debug("No file data in JSON")
        return jsonify({"error": "No file data provided"}), 400

    try:
        header, encoded = data_url.split(",", 1)
        mime_type = header.split(";")[0].split(":")[1]
        data = base64.b64decode(encoded)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        file_key = None

        extension = mimetypes.guess_extension(mime_type) or 'bin'
        file_name = f'file_{timestamp}{extension}'

        if mime_type.startswith('image/'):
            file_key = f'images/{file_name}'
            image = Image.open(BytesIO(data))
            buffer = BytesIO()
            image.save(buffer, format=image.format)
            buffer.seek(0)
            logger.debug(f"Uploading image as {file_key} to S3")
            s3_client.upload_fileobj(buffer, S3_BUCKET, file_key, ExtraArgs={"ContentType": mime_type})
            image.close()
        elif mime_type == 'application/pdf':
            file_key = f'pdfs/{file_name}'
            logger.debug(f"Uploading PDF as {file_key} to S3")
            s3_client.put_object(Body=data, Bucket=S3_BUCKET, Key=file_key, ContentType=mime_type)
        else:
            file_key = f'other/{file_name}'
            logger.debug(f"Uploading other file type as {file_key} to S3")
            s3_client.put_object(Body=data, Bucket=S3_BUCKET, Key=file_key, ContentType=mime_type)

        file_url = f'https://{S3_BUCKET}.s3.amazonaws.com/{file_key}'

        # Deduct 1 duck per page (NOTE: Implement duck deduction logic appropriately)
        # user = get_current_user_or_extract_from_context() <- Replace with actual logic to retrieve user
        # user.duck_balance -= num_pages (Implement logic to determine num_pages)

        logger.debug("File uploaded successfully")
        return jsonify({"message": "File uploaded successfully", "file_url": file_url})
    except Exception as e:
        logger.error(f"Failed to upload file: {str(e)}")
        return jsonify({"error": f"Failed to upload file: {str(e)}"}), 500


@upload.route('/uploads/<filename>')
# @premium_required
def uploaded_file(filename):
    file_path = os.path.join(Config.UPLOAD_FOLDER, filename)
    if os.path.exists(file_path):
        return send_from_directory(os.path.dirname(file_path), filename)
    else:
        abort(404)