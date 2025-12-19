"""
File: api_webhooks.py
Type: py
Summary: Flask routes for external service callbacks (AWS Lambda, etc).
"""

import os

from flask import Blueprint, request, jsonify
from sqlalchemy import func

from application.extensions import db
from application.models.project import Project
from application.models.user import User

webhooks_api = Blueprint("webhooks_api", __name__, url_prefix="/api/webhooks")


@webhooks_api.route("/youtube", methods=["POST"])
def youtube_callback():
    # 1. Security: Validate Secret
    expected_secret = os.environ.get("LAMBDA_SECRET")
    incoming_secret = request.headers.get("X-API-KEY")

    if not expected_secret or incoming_secret != expected_secret:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    # 2. Parse Data
    data = request.json
    video_id = data.get("video_id")
    filename = data.get("filename")  # Expected: "username-project-name.mp4"

    if not video_id or not filename:
        return jsonify({"success": False, "error": "Missing data"}), 400

    # 3. Decode Filename (Strategy: Split on FIRST hyphen only)
    # Example: "ben-space-invaders.mp4" -> user: "ben", project: "space-invaders"
    try:
        clean_name = os.path.splitext(filename)[0]  # Remove .mp4
        parts = clean_name.split("-", 1)

        if len(parts) < 2:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Filename format must be username-project-name",
                    }
                ),
                400,
            )

        username_raw = parts[0]
        project_slug = parts[1]

        # Convert slug back to likely DB format: "game-dev-1" -> "game dev 1"
        project_name_guess = project_slug.replace("-", " ")
    except Exception as e:
        return jsonify({"success": False, "error": f"Parsing failed: {str(e)}"}), 400

    # 4. Database Lookup
    user = User.query.filter(
        func.lower(User.username) == func.lower(username_raw)
    ).first()
    if not user:
        return (
            jsonify({"success": False, "error": f"User '{username_raw}' not found"}),
            404,
        )

    # Try to find project (Case insensitive match)
    project = Project.query.filter(
        Project.user_id == user.id,
        func.lower(Project.name) == func.lower(project_name_guess),
    ).first()

    if not project:
        # Fallback: Try exact slug match if project names are stored as slugs
        project = Project.query.filter(
            Project.user_id == user.id,
            func.lower(Project.name) == func.lower(project_slug),
        ).first()

    if not project:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Project '{project_name_guess}' not found for user '{user.username}'",
                }
            ),
            404,
        )

    # 5. Update Record
    try:
        project.video_url = f"https://youtu.be/{video_id}"
        # Use YouTube's high-quality thumbnail
        project.image_url = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"

        db.session.commit()

        return jsonify(
            {
                "success": True,
                "message": f"Updated project {project.id}",
                "video": project.video_url,
                "image": project.image_url,
            }
        )
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
