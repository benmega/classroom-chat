"""
File: api_webhooks.py
Type: py
Summary: Flask routes for external service callbacks (YouTube Uploader & Transcriber Lambdas).
"""

import os

from flask import Blueprint, request, jsonify

from application.extensions import db
from application.models.project import Project

webhooks_api = Blueprint("webhooks_api", __name__, url_prefix="/api/webhooks")

def validate_secret():
    """Validates the incoming request against the LAMBDA_SECRET environment variable."""
    expected_secret = os.environ.get("LAMBDA_SECRET")
    incoming_secret = request.headers.get("X-API-KEY")
    return expected_secret and incoming_secret == expected_secret

@webhooks_api.route("/youtube", methods=["POST"])
def youtube_callback():
    if not validate_secret():
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    data = request.json
    project_id = data.get("project_id")
    video_id = data.get("video_id")

    if not project_id or not video_id:
        return jsonify({"success": False, "error": "Missing project_id or video_id"}), 400

    project = Project.query.get(project_id)
    if not project:
        return jsonify({"success": False, "error": "Project not found"}), 404

    try:
        project.video_url = f"https://youtu.be/{video_id}"
        # Set high-quality YouTube thumbnail as the project image
        project.image_url = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        db.session.commit()
        return jsonify({"success": True, "message": "YouTube info updated"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@webhooks_api.route("/transcribe", methods=["POST"])
def transcribe_callback():
    if not validate_secret():
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    data = request.json
    project_id = data.get("project_id")
    transcript = data.get("transcript")

    if not project_id or not transcript:
        return jsonify({"success": False, "error": "Missing project_id or transcript"}), 400

    project = Project.query.get(project_id)
    if not project:
        return jsonify({"success": False, "error": "Project not found"}), 404

    try:
        project.video_transcript = transcript
        db.session.commit()
        return jsonify({"success": True, "message": "Transcript updated"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500