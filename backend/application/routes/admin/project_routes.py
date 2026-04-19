from flask import Blueprint, request, jsonify
from application.extensions import db
from application.models.project import Project
from application.decorators.admin_required import admin_only

project_bp = Blueprint("admin_project", __name__)

@project_bp.route("/manage-projects", methods=["GET"])
@admin_only
def manage_projects():
    filter_type = request.args.get("filter", "pending")

    pending_count = Project.query.filter(
        (Project.teacher_comment == None) | (Project.teacher_comment == "")
    ).count()
    
    total_count = Project.query.count()

    query = Project.query
    if filter_type == "pending":
        query = query.filter(
            (Project.teacher_comment == None) | (Project.teacher_comment == "")
        )

    projects = query.order_by(Project.id.desc()).all()

    return jsonify({
        "status": "success",
        "data": {
            "projects": [p.to_dict() for p in projects],
            "pending_count": pending_count,
            "total_count": total_count
        }
    })

@project_bp.route("/handle-project-review/<int:project_id>", methods=["POST"])
@admin_only
def handle_project_review(project_id):
    project = Project.query.get_or_404(project_id)
    
    data = request.get_json()
    action = data.get("action")
    comment = data.get("teacher_comment")

    if action == "reject":
        project.teacher_comment = None
        db.session.commit()
        return jsonify({"status": "success", "message": f"Project '{project.name}' marked for revision."})
    elif action == "approve":
        project.teacher_comment = comment
        db.session.commit()
        return jsonify({"status": "success", "message": f"Project '{project.name}' approved."})

    return jsonify({"status": "error", "message": "Invalid action."}), 400
