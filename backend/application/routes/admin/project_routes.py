from flask import request, jsonify
from application.extensions import db
from application.models.project import Project
from application.decorators.admin_required import admin_only

from ..admin_routes import admin_bp


@admin_bp.route("/manage-projects", methods=["GET"])
@admin_only
def manage_projects():
    filter_type = request.args.get("filter", "pending")

    pending_count = Project.query.filter(
        Project.teacher_comment.is_(None) | (Project.teacher_comment == "")
    ).count()

    total_count = Project.query.count()

    query = Project.query
    if filter_type == "pending":
        query = query.filter(
            Project.teacher_comment.is_(None) | (Project.teacher_comment == "")
        )

    projects = query.order_by(Project.id.desc()).all()

    return jsonify(
        {
            "status": "success",
            "data": {
                "projects": [p.to_dict() for p in projects],
                "pending_count": pending_count,
                "total_count": total_count,
            },
        }
    )


@admin_bp.route("/handle-project-review/<int:project_id>", methods=["POST"])
@admin_only
def handle_project_review(project_id):
    project = Project.query.get_or_404(project_id)

    data = request.get_json()
    action = data.get("action")
    comment = data.get("teacher_comment")

    if action == "reject":
        project.teacher_comment = None
        db.session.commit()
        return jsonify(
            {
                "status": "success",
                "message": f"Project '{project.name}' marked for revision.",
            }
        )
    elif action == "approve":
        project.teacher_comment = comment
        db.session.commit()
        return jsonify(
            {"status": "success", "message": f"Project '{project.name}' approved."}
        )

    return jsonify({"status": "error", "message": "Invalid action."}), 400


@admin_bp.route("/assign-project", methods=["POST"])
@admin_only
def assign_project():
    data = request.get_json()
    
    user_id = data.get("user_id")
    name = data.get("name")
    
    if not user_id or not name:
        return jsonify({"status": "error", "message": "Student ID and Project Name are required."}), 400
        
    description = data.get("description")
    link = data.get("link")
    github_link = data.get("github_link")
    video_url = data.get("video_url")
    code_snippet = data.get("code_snippet")
    image_url = data.get("image_url")
    
    project = Project(
        user_id=user_id,
        name=name,
        description=description,
        link=link,
        github_link=github_link,
        video_url=video_url,
        code_snippet=code_snippet,
        image_url=image_url
    )
    
    db.session.add(project)
    db.session.commit()
    
    return jsonify({
        "status": "success",
        "message": f"Project '{name}' has been assigned to student #{user_id}."
    })
