from flask import jsonify, request

from application.decorators.admin_required import admin_only
from application.extensions import db
from application.models.standard_project import StandardProject

from ..admin_routes import admin_bp


@admin_bp.route("/standard-projects", methods=["GET"])
@admin_only
def get_standard_projects():
    projects = StandardProject.query.order_by(StandardProject.name.asc()).all()
    return jsonify(
        {
            "status": "success",
            "data": {"standard_projects": [p.to_dict() for p in projects]},
        }
    )


@admin_bp.route("/standard-projects", methods=["POST"])
@admin_only
def create_standard_project():
    data = request.get_json()
    name = data.get("name")

    if not name:
        return jsonify({"status": "error", "message": "Project name is required"}), 400

    project = StandardProject(
        name=name,
        description=data.get("description"),
        link=data.get("link"),
        github_link=data.get("github_link"),
        video_url=data.get("video_url"),
        code_snippet=data.get("code_snippet"),
        image_url=data.get("image_url"),
    )
    db.session.add(project)
    db.session.commit()

    return jsonify(
        {
            "status": "success",
            "message": "Standard project created successfully.",
            "data": project.to_dict(),
        }
    )


@admin_bp.route("/standard-projects/<int:project_id>", methods=["PUT"])
@admin_only
def update_standard_project(project_id):
    project = StandardProject.query.get_or_404(project_id)
    data = request.get_json()

    name = data.get("name")
    if not name:
        return jsonify({"status": "error", "message": "Project name is required"}), 400

    project.name = name
    if "description" in data:
        project.description = data.get("description")
    if "link" in data:
        project.link = data.get("link")
    if "github_link" in data:
        project.github_link = data.get("github_link")
    if "video_url" in data:
        project.video_url = data.get("video_url")
    if "code_snippet" in data:
        project.code_snippet = data.get("code_snippet")
    if "image_url" in data:
        project.image_url = data.get("image_url")

    db.session.commit()

    return jsonify(
        {
            "status": "success",
            "message": "Standard project updated successfully.",
            "data": project.to_dict(),
        }
    )


@admin_bp.route("/standard-projects/<int:project_id>", methods=["DELETE"])
@admin_only
def delete_standard_project(project_id):
    project = StandardProject.query.get_or_404(project_id)
    db.session.delete(project)
    db.session.commit()
    return jsonify(
        {"status": "success", "message": "Standard project deleted successfully."}
    )
